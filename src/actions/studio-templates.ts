"use server";

/**
 * Studio documentaire — Server Actions CRUD gabarits `ENGINE_BLOCKS`.
 * Permission unique `cfg.templates` (même périmètre que la fiche Gabarits
 * existante — pas de nouvelle permission pour cette tranche).
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { blocksToText, textToBlocks } from "@/lib/studio/dsl";
import { extractVariableSlugs } from "@/lib/studio/variables";
import type { ActionResult } from "@/actions/auth";

const CODE_RE = /^[a-z][a-z0-9_]{2,63}$/;

const CreateTemplateSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(CODE_RE, "Code : minuscules/chiffres/_ uniquement, commence par une lettre"),
  name: z.string().trim().min(3, "Nom trop court").max(140),
  description: z.string().trim().max(500).optional(),
  bodyText: z.string().trim().min(10, "Contenu trop court"),
  signatureEnabled: z.boolean().default(false),
});

export type CreateTemplateResult = ActionResult & { templateId?: string };

/** Crée un gabarit `ENGINE_BLOCKS` + sa v1 en brouillon (publication = étape explicite séparée). */
export async function createDocumentTemplateAction(
  _prev: CreateTemplateResult | null,
  formData: FormData,
): Promise<CreateTemplateResult> {
  const actor = await requireUser({ permission: "cfg.templates" });

  const parsed = CreateTemplateSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    bodyText: formData.get("bodyText"),
    signatureEnabled: formData.get("signatureEnabled") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const data = parsed.data;

  const existing = await prisma.documentTemplate.findUnique({ where: { code: data.code } });
  if (existing) {
    return { ok: false, error: `Le code « ${data.code} » existe déjà` };
  }

  const blocks = textToBlocks(data.bodyText);
  if (blocks.length === 0) {
    return { ok: false, error: "Aucun bloc reconnu dans le contenu" };
  }
  const slugs = extractVariableSlugs(data.bodyText);

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.documentTemplate.create({
      data: {
        code: data.code,
        type: "DOCUMENT_LIBRE",
        name: data.name,
        description: data.description ?? null,
        generatorKind: "ENGINE_BLOCKS",
        signatureEnabled: data.signatureEnabled,
        active: true,
        createdById: actor.id,
      },
    });
    await tx.documentTemplateVersion.create({
      data: {
        templateId: created.id,
        version: 1,
        status: "DRAFT",
        bodyJson: blocks,
        variablesJson: slugs.map((slug) => ({ slug, required: true })),
        changelog: "Version initiale",
        createdById: actor.id,
      },
    });
    return created;
  });

  await writeAudit({
    actorId: actor.id,
    action: "studio.template.create",
    entityType: "document_template",
    entityId: template.id,
    metadata: { code: template.code },
  });

  revalidatePath("/administration/gabarits");
  return { ok: true, message: "Gabarit créé — publiez la version pour l’utiliser", templateId: template.id };
}

const UpdateDraftSchema = z.object({
  templateId: z.string().min(1),
  bodyText: z.string().trim().min(10, "Contenu trop court"),
  changelog: z.string().trim().max(300).optional(),
});

/** Crée une nouvelle version brouillon (édition) à partir du contenu soumis. */
export async function createDraftVersionAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "cfg.templates" });
  const parsed = UpdateDraftSchema.safeParse({
    templateId: formData.get("templateId"),
    bodyText: formData.get("bodyText"),
    changelog: formData.get("changelog") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const { templateId, bodyText, changelog } = parsed.data;

  const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
  if (!template) return { ok: false, error: "Gabarit introuvable" };
  if (template.generatorKind !== "ENGINE_BLOCKS") {
    return { ok: false, error: "Ce gabarit n’est pas éditable depuis le Studio (générateur legacy)" };
  }

  const blocks = textToBlocks(bodyText);
  if (blocks.length === 0) return { ok: false, error: "Aucun bloc reconnu dans le contenu" };
  const slugs = extractVariableSlugs(bodyText);

  const last = await prisma.documentTemplateVersion.findFirst({
    where: { templateId },
    orderBy: { version: "desc" },
  });
  const nextVersion = (last?.version ?? 0) + 1;

  const version = await prisma.documentTemplateVersion.create({
    data: {
      templateId,
      version: nextVersion,
      status: "DRAFT",
      bodyJson: blocks,
      variablesJson: slugs.map((slug) => ({ slug, required: true })),
      changelog: changelog ?? null,
      createdById: actor.id,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "studio.template.draft",
    entityType: "document_template",
    entityId: templateId,
    metadata: { version: version.version },
  });

  revalidatePath(`/administration/gabarits/${templateId}`);
  return { ok: true, message: `Brouillon v${nextVersion} enregistré — publiez-le pour l’activer` };
}

/** Publie la dernière version brouillon : devient la version active du gabarit. */
export async function publishDraftVersionAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "cfg.templates" });
  const templateId = String(formData.get("templateId") ?? "");
  if (!templateId) return { ok: false, error: "Gabarit manquant" };

  const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
  if (!template) return { ok: false, error: "Gabarit introuvable" };

  const draft = await prisma.documentTemplateVersion.findFirst({
    where: { templateId, status: "DRAFT" },
    orderBy: { version: "desc" },
  });
  if (!draft) return { ok: false, error: "Aucun brouillon à publier" };

  await prisma.$transaction(async (tx) => {
    if (template.publishedVersionId) {
      await tx.documentTemplateVersion.update({
        where: { id: template.publishedVersionId },
        data: { status: "ARCHIVED" },
      });
    }
    await tx.documentTemplateVersion.update({
      where: { id: draft.id },
      data: { status: "PUBLISHED" },
    });
    await tx.documentTemplate.update({
      where: { id: templateId },
      data: { publishedVersionId: draft.id },
    });
  });

  await writeAudit({
    actorId: actor.id,
    action: "studio.template.publish",
    entityType: "document_template",
    entityId: templateId,
    metadata: { version: draft.version },
  });

  revalidatePath(`/administration/gabarits/${templateId}`);
  revalidatePath("/administration/gabarits");
  return { ok: true, message: `Version ${draft.version} publiée` };
}

/** Active / désactive un gabarit (bloque la génération si inactif — erreur explicite). */
export async function toggleTemplateActiveAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "cfg.templates" });
  const templateId = String(formData.get("templateId") ?? "");
  const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
  if (!template) return { ok: false, error: "Gabarit introuvable" };

  const updated = await prisma.documentTemplate.update({
    where: { id: templateId },
    data: { active: !template.active },
  });

  await writeAudit({
    actorId: actor.id,
    action: "studio.template.toggle_active",
    entityType: "document_template",
    entityId: templateId,
    metadata: { active: updated.active },
  });

  revalidatePath("/administration/gabarits");
  revalidatePath(`/administration/gabarits/${templateId}`);
  return { ok: true, message: updated.active ? "Gabarit activé" : "Gabarit désactivé" };
}

/** Active / désactive l’injection de signature pour un gabarit (OFF par défaut — règle absolue). */
export async function toggleTemplateSignatureAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "cfg.templates" });
  const templateId = String(formData.get("templateId") ?? "");
  const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
  if (!template) return { ok: false, error: "Gabarit introuvable" };

  const updated = await prisma.documentTemplate.update({
    where: { id: templateId },
    data: { signatureEnabled: !template.signatureEnabled },
  });

  await writeAudit({
    actorId: actor.id,
    action: "studio.template.toggle_signature",
    entityType: "document_template",
    entityId: templateId,
    metadata: { signatureEnabled: updated.signatureEnabled },
  });

  revalidatePath("/administration/gabarits");
  revalidatePath(`/administration/gabarits/${templateId}`);
  return {
    ok: true,
    message: updated.signatureEnabled
      ? "Signature activée pour ce gabarit"
      : "Signature désactivée pour ce gabarit",
  };
}

const CreateVariableSchema = z.object({
  slug: z.string().trim().regex(/^[a-z][a-z0-9_.]*$/i, "slug invalide (ex. client.nom)"),
  label: z.string().trim().min(2).max(140),
  description: z.string().trim().max(300).optional(),
  category: z.enum(["CLIENT", "ENTREPRISE", "DOCUMENT", "COLLABORATEUR", "DIVERS"]),
  sampleValue: z.string().trim().max(200).optional(),
});

/** Ajoute une variable au catalogue central `{{slug}}`. */
export async function createTemplateVariableAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "cfg.templates" });
  const parsed = CreateVariableSchema.safeParse({
    slug: formData.get("slug"),
    label: formData.get("label"),
    description: formData.get("description") || undefined,
    category: formData.get("category"),
    sampleValue: formData.get("sampleValue") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const data = parsed.data;

  const existing = await prisma.templateVariableDef.findUnique({ where: { slug: data.slug } });
  if (existing) return { ok: false, error: `La variable {{${data.slug}}} existe déjà` };

  await prisma.templateVariableDef.create({
    data: {
      slug: data.slug,
      label: data.label,
      description: data.description ?? null,
      category: data.category,
      sampleValue: data.sampleValue ?? null,
      createdById: actor.id,
    },
  });

  revalidatePath("/administration/gabarits/variables");
  return { ok: true, message: `Variable {{${data.slug}}} ajoutée au catalogue` };
}

/** Pré-remplit l’éditeur en texte (DSL) à partir des blocs stockés — pour la page d’édition. */
export { blocksToText };
