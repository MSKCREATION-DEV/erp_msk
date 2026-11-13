"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  BrandColorCategory,
  BrandItemStatus,
  BrandLogoKind,
  BrandResourceKind,
  BrandTypographyRole,
} from "@/generated/prisma/client";
import type { ActionResult } from "@/actions/auth";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import { makeBrandCode, extForMime, safeStorageFileName } from "@/lib/brand/code";
import { parseColorInput } from "@/lib/brand/colors";
import {
  BRAND_FONT_MIME,
  BRAND_LOGO_MIME,
  BRAND_RESOURCE_MIME,
  BRAND_STORAGE_PREFIX,
  MAX_BRAND_FONT_BYTES,
  MAX_BRAND_LOGO_BYTES,
  MAX_BRAND_RESOURCE_BYTES,
} from "@/lib/brand/constants";
import { prepareLogoBytes } from "@/lib/brand/optimize-logo";
import { uploadGedObject, removeGedObject } from "@/lib/ged/storage";
import { prisma } from "@/lib/prisma";

function revalidateCharte(extra?: string) {
  revalidatePath("/administration/charte");
  revalidatePath("/administration/charte/logos");
  revalidatePath("/administration/charte/couleurs");
  revalidatePath("/administration/charte/typographies");
  revalidatePath("/administration/charte/ressources");
  if (extra) revalidatePath(extra);
}

async function requireBrandAdmin() {
  return requireUser({ permission: "cfg.brand" });
}

const logoKindSchema = z.nativeEnum(BrandLogoKind);
const statusSchema = z.nativeEnum(BrandItemStatus);
const colorCatSchema = z.nativeEnum(BrandColorCategory);
const typoRoleSchema = z.nativeEnum(BrandTypographyRole);
const resourceKindSchema = z.nativeEnum(BrandResourceKind);

async function setDefaultDocumentsLogo(logoId: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.brandLogo.updateMany({
      where: { isDefaultDocuments: true, NOT: { id: logoId } },
      data: { isDefaultDocuments: false },
    });
    await tx.brandLogo.update({
      where: { id: logoId },
      data: { isDefaultDocuments: true, status: BrandItemStatus.ACTIVE },
    });
    await tx.brandConfiguration.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        defaultDocumentsLogoId: logoId,
        settingsJson: {},
      },
      update: { defaultDocumentsLogoId: logoId },
    });
  });
  await writeAudit({
    actorId,
    action: "brand.logo.set_default_documents",
    entityType: "brand_logo",
    entityId: logoId,
  });
}

export async function createBrandLogoAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "AUTRE");
  const description = String(formData.get("description") ?? "").trim() || null;
  const setDefault = formData.get("isDefaultDocuments") === "on";
  const file = formData.get("file");

  if (!label || label.length > 120) {
    return { ok: false, error: "Libellé requis (max 120)" };
  }
  const kindParsed = logoKindSchema.safeParse(kindRaw);
  if (!kindParsed.success) return { ok: false, error: "Type de logo invalide" };

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fichier logo manquant" };
  }
  if (file.size > MAX_BRAND_LOGO_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max 8 Mo)" };
  }
  const mime = file.type || "application/octet-stream";
  if (!(BRAND_LOGO_MIME as readonly string[]).includes(mime)) {
    return { ok: false, error: "Formats : SVG, PNG, JPEG, WebP" };
  }

  let prepared;
  try {
    prepared = await prepareLogoBytes(
      Buffer.from(await file.arrayBuffer()),
      mime,
    );
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Fichier image invalide",
    };
  }

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const codeBase = makeBrandCode(label, id.slice(0, 6));
  const stamp = Date.now();
  const ext = extForMime(prepared.mime);
  const storageOriginal = `${BRAND_STORAGE_PREFIX}/logos/${id}/${stamp}_original.${ext}`;
  const storageOptimized = `${BRAND_STORAGE_PREFIX}/logos/${id}/${stamp}_opt.png`;

  try {
    await uploadGedObject(storageOriginal, prepared.originalBytes, prepared.mime);
    await uploadGedObject(storageOptimized, prepared.optimizedPng, "image/png", {
      upsert: true,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec upload Storage",
    };
  }

  const row = await prisma.brandLogo.create({
    data: {
      id,
      code: codeBase,
      label,
      kind: kindParsed.data,
      status: BrandItemStatus.ACTIVE,
      description,
      storageOriginal,
      storageOptimized,
      mime: prepared.mime,
      originalFileName: file.name.slice(0, 180),
      fileSizeBytes: prepared.originalBytes.length,
      widthPx: prepared.widthPx,
      heightPx: prepared.heightPx,
      createdById: actor.id,
      isDefaultDocuments: false,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.logo.create",
    entityType: "brand_logo",
    entityId: row.id,
    metadata: { kind: row.kind, mime: row.mime },
  });

  if (setDefault) {
    await setDefaultDocumentsLogo(row.id, actor.id);
  }

  revalidateCharte(`/administration/charte/logos/${row.id}`);
  redirect(`/administration/charte/logos/${row.id}`);
}

export async function updateBrandLogoMetaAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const statusRaw = String(formData.get("status") ?? "");

  if (!id) return { ok: false, error: "Logo manquant" };
  if (!label || label.length > 120) {
    return { ok: false, error: "Libellé requis" };
  }
  const kindParsed = logoKindSchema.safeParse(kindRaw);
  const statusParsed = statusSchema.safeParse(statusRaw);
  if (!kindParsed.success || !statusParsed.success) {
    return { ok: false, error: "Données invalides" };
  }

  const existing = await prisma.brandLogo.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Logo introuvable" };

  if (
    existing.isDefaultDocuments &&
    statusParsed.data !== BrandItemStatus.ACTIVE
  ) {
    return {
      ok: false,
      error:
        "Le logo défaut documents ne peut pas être désactivé — désignez d’abord un autre défaut.",
    };
  }

  await prisma.brandLogo.update({
    where: { id },
    data: {
      label,
      kind: kindParsed.data,
      description,
      status: statusParsed.data,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.logo.update",
    entityType: "brand_logo",
    entityId: id,
    metadata: { status: statusParsed.data, kind: kindParsed.data },
  });

  revalidateCharte(`/administration/charte/logos/${id}`);
  return { ok: true, message: "Logo mis à jour" };
}

export async function setDefaultDocumentsLogoAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Logo manquant" };

  const logo = await prisma.brandLogo.findUnique({ where: { id } });
  if (!logo) return { ok: false, error: "Logo introuvable" };
  if (logo.status !== BrandItemStatus.ACTIVE) {
    return { ok: false, error: "Seuls les logos actifs peuvent être défaut documents" };
  }

  await setDefaultDocumentsLogo(id, actor.id);
  revalidateCharte(`/administration/charte/logos/${id}`);
  return { ok: true, message: "Logo défini comme défaut documents / PDF" };
}

export async function replaceBrandLogoFileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!id) return { ok: false, error: "Logo manquant" };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fichier manquant" };
  }
  if (file.size > MAX_BRAND_LOGO_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max 8 Mo)" };
  }
  const mime = file.type || "application/octet-stream";
  if (!(BRAND_LOGO_MIME as readonly string[]).includes(mime)) {
    return { ok: false, error: "Formats : SVG, PNG, JPEG, WebP" };
  }

  const existing = await prisma.brandLogo.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Logo introuvable" };

  let prepared;
  try {
    prepared = await prepareLogoBytes(
      Buffer.from(await file.arrayBuffer()),
      mime,
    );
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Fichier invalide",
    };
  }

  const stamp = Date.now();
  const ext = extForMime(prepared.mime);
  const storageOriginal = `${BRAND_STORAGE_PREFIX}/logos/${id}/${stamp}_original.${ext}`;
  const storageOptimized = `${BRAND_STORAGE_PREFIX}/logos/${id}/${stamp}_opt.png`;

  try {
    await uploadGedObject(storageOriginal, prepared.originalBytes, prepared.mime);
    await uploadGedObject(storageOptimized, prepared.optimizedPng, "image/png", {
      upsert: true,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec upload",
    };
  }

  const oldPaths = [existing.storageOriginal, existing.storageOptimized].filter(
    Boolean,
  ) as string[];

  await prisma.brandLogo.update({
    where: { id },
    data: {
      storageOriginal,
      storageOptimized,
      mime: prepared.mime,
      originalFileName: file.name.slice(0, 180),
      fileSizeBytes: prepared.originalBytes.length,
      widthPx: prepared.widthPx,
      heightPx: prepared.heightPx,
      // ne pas effacer publicPath seed — reste en fallback si Storage HS
    },
  });

  for (const p of oldPaths) {
    try {
      await removeGedObject(p);
    } catch {
      /* ignore */
    }
  }

  await writeAudit({
    actorId: actor.id,
    action: "brand.logo.replace_file",
    entityType: "brand_logo",
    entityId: id,
  });

  revalidateCharte(`/administration/charte/logos/${id}`);
  return { ok: true, message: "Fichier logo remplacé" };
}

export async function deleteBrandLogoAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Logo manquant" };

  const existing = await prisma.brandLogo.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Logo introuvable" };
  if (existing.isDefaultDocuments) {
    return {
      ok: false,
      error:
        "Impossible de supprimer le logo défaut documents — désignez un remplacement d’abord.",
    };
  }

  await prisma.brandLogo.update({
    where: { id },
    data: { status: BrandItemStatus.ARCHIVED, isDefaultDocuments: false },
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.logo.archive",
    entityType: "brand_logo",
    entityId: id,
  });

  revalidateCharte();
  redirect("/administration/charte/logos");
}

/* ─── Couleurs ─── */

export async function createBrandColorAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const tokenKeyRaw = String(formData.get("tokenKey") ?? "").trim().toLowerCase();
  const colorRaw = String(formData.get("color") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "MARQUE");
  const usageNotes = String(formData.get("usageNotes") ?? "").trim() || null;

  if (!label) return { ok: false, error: "Libellé requis" };
  const tokenKey =
    tokenKeyRaw ||
    makeBrandCode(label).replace(/[^a-z0-9-]/g, "-");
  if (!/^[a-z][a-z0-9-]{1,47}$/.test(tokenKey)) {
    return { ok: false, error: "Clé token invalide (ex. accent-promo)" };
  }
  const parsed = parseColorInput(colorRaw);
  if (!parsed) return { ok: false, error: "Couleur invalide (HEX / RGB / HSL)" };
  const cat = colorCatSchema.safeParse(categoryRaw);
  if (!cat.success) return { ok: false, error: "Catégorie invalide" };

  const exists = await prisma.brandColor.findUnique({ where: { tokenKey } });
  if (exists) return { ok: false, error: "Cette clé token existe déjà" };

  const row = await prisma.brandColor.create({
    data: {
      tokenKey,
      label,
      hex: parsed.hex,
      category: cat.data,
      usageNotes,
      status: BrandItemStatus.ACTIVE,
      isReference: false,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.color.create",
    entityType: "brand_color",
    entityId: row.id,
    metadata: { tokenKey, hex: parsed.hex },
  });

  revalidateCharte(`/administration/charte/couleurs/${row.id}`);
  redirect(`/administration/charte/couleurs/${row.id}`);
}

export async function updateBrandColorAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const colorRaw = String(formData.get("color") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "");
  const usageNotes = String(formData.get("usageNotes") ?? "").trim() || null;
  const statusRaw = String(formData.get("status") ?? "");

  if (!id) return { ok: false, error: "Couleur manquante" };
  const existing = await prisma.brandColor.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Couleur introuvable" };

  const parsed = parseColorInput(colorRaw);
  if (!parsed) return { ok: false, error: "Couleur invalide" };
  const cat = colorCatSchema.safeParse(categoryRaw);
  const status = statusSchema.safeParse(statusRaw);
  if (!cat.success || !status.success) {
    return { ok: false, error: "Données invalides" };
  }

  if (
    existing.isReference &&
    parsed.hex !== existing.hex &&
    formData.get("confirmReferenceChange") !== "on"
  ) {
    return {
      ok: false,
      error:
        "Couleur de référence MSK — cochez la confirmation pour modifier le HEX.",
    };
  }

  if (existing.isReference && status.data === BrandItemStatus.ARCHIVED) {
    return { ok: false, error: "Les couleurs de référence ne peuvent pas être archivées" };
  }

  await prisma.brandColor.update({
    where: { id },
    data: {
      label: label || existing.label,
      hex: parsed.hex,
      category: cat.data,
      usageNotes,
      status: status.data,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.color.update",
    entityType: "brand_color",
    entityId: id,
    metadata: {
      hex: parsed.hex,
      reference: existing.isReference,
      status: status.data,
    },
  });

  revalidateCharte(`/administration/charte/couleurs/${id}`);
  return { ok: true, message: "Couleur mise à jour" };
}

export async function duplicateBrandColorAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Couleur manquante" };
  const src = await prisma.brandColor.findUnique({ where: { id } });
  if (!src) return { ok: false, error: "Couleur introuvable" };

  let tokenKey = `${src.tokenKey}-copie`;
  let n = 2;
  while (await prisma.brandColor.findUnique({ where: { tokenKey } })) {
    tokenKey = `${src.tokenKey}-copie-${n++}`;
  }

  const row = await prisma.brandColor.create({
    data: {
      tokenKey,
      label: `${src.label} (copie)`,
      hex: src.hex,
      category: src.category,
      usageNotes: src.usageNotes,
      status: BrandItemStatus.ACTIVE,
      isReference: false,
      sortOrder: src.sortOrder + 1,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.color.duplicate",
    entityType: "brand_color",
    entityId: row.id,
    metadata: { from: src.id },
  });

  revalidateCharte();
  redirect(`/administration/charte/couleurs/${row.id}`);
}

export async function deleteBrandColorAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Couleur manquante" };
  const existing = await prisma.brandColor.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Couleur introuvable" };
  if (existing.isReference) {
    return {
      ok: false,
      error: "Couleur de référence — désactivation possible, pas de suppression.",
    };
  }

  await prisma.brandColor.update({
    where: { id },
    data: { status: BrandItemStatus.ARCHIVED },
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.color.archive",
    entityType: "brand_color",
    entityId: id,
  });

  revalidateCharte();
  redirect("/administration/charte/couleurs");
}

/* ─── Typographies ─── */

export async function createBrandTypographyAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const familyName = String(formData.get("familyName") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "UI");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const cssStack = String(formData.get("cssStack") ?? "").trim() || null;
  const isDefaultErp = formData.get("isDefaultErp") === "on";
  const isDefaultPdf = formData.get("isDefaultPdf") === "on";
  const file = formData.get("file");

  if (!familyName) return { ok: false, error: "Nom de famille requis" };
  const role = typoRoleSchema.safeParse(roleRaw);
  if (!role.success) return { ok: false, error: "Rôle invalide" };

  const code = makeBrandCode(familyName, crypto.randomUUID().slice(0, 6));

  const row = await prisma.$transaction(async (tx) => {
    if (isDefaultErp) {
      await tx.brandTypography.updateMany({
        where: { isDefaultErp: true },
        data: { isDefaultErp: false },
      });
    }
    if (isDefaultPdf) {
      await tx.brandTypography.updateMany({
        where: { isDefaultPdf: true },
        data: { isDefaultPdf: false },
      });
    }
    return tx.brandTypography.create({
      data: {
        code,
        familyName,
        role: role.data,
        notes,
        cssStack,
        isDefaultErp,
        isDefaultPdf,
        status: BrandItemStatus.ACTIVE,
      },
    });
  });

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BRAND_FONT_BYTES) {
      return { ok: false, error: "Police trop volumineuse (max 4 Mo)" };
    }
    const mime = file.type || "application/octet-stream";
    if (
      !(BRAND_FONT_MIME as readonly string[]).includes(mime) &&
      !/\.(woff2?|ttf|otf)$/i.test(file.name)
    ) {
      return { ok: false, error: "Formats police : WOFF2, WOFF, TTF, OTF" };
    }
    const weight = Number(formData.get("weight") ?? 400) || 400;
    const style = String(formData.get("style") ?? "normal") === "italic"
      ? "italic"
      : "normal";
    const bytes = Buffer.from(await file.arrayBuffer());
    const storagePath = `${BRAND_STORAGE_PREFIX}/fonts/${row.id}/${Date.now()}_${safeStorageFileName(file.name)}`;
    await uploadGedObject(storagePath, bytes, mime);
    await prisma.brandFontFile.create({
      data: {
        typographyId: row.id,
        weight,
        style,
        storagePath,
        mime,
        originalFileName: file.name.slice(0, 180),
        fileSizeBytes: bytes.length,
      },
    });
  }

  await writeAudit({
    actorId: actor.id,
    action: "brand.typography.create",
    entityType: "brand_typography",
    entityId: row.id,
  });

  revalidateCharte();
  redirect(`/administration/charte/typographies/${row.id}`);
}

export async function updateBrandTypographyAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const id = String(formData.get("id") ?? "");
  const familyName = String(formData.get("familyName") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const cssStack = String(formData.get("cssStack") ?? "").trim() || null;
  const statusRaw = String(formData.get("status") ?? "");
  const isDefaultErp = formData.get("isDefaultErp") === "on";
  const isDefaultPdf = formData.get("isDefaultPdf") === "on";

  if (!id) return { ok: false, error: "Typographie manquante" };
  const role = typoRoleSchema.safeParse(roleRaw);
  const status = statusSchema.safeParse(statusRaw);
  if (!familyName || !role.success || !status.success) {
    return { ok: false, error: "Données invalides" };
  }

  await prisma.$transaction(async (tx) => {
    if (isDefaultErp) {
      await tx.brandTypography.updateMany({
        where: { isDefaultErp: true, NOT: { id } },
        data: { isDefaultErp: false },
      });
    }
    if (isDefaultPdf) {
      await tx.brandTypography.updateMany({
        where: { isDefaultPdf: true, NOT: { id } },
        data: { isDefaultPdf: false },
      });
    }
    await tx.brandTypography.update({
      where: { id },
      data: {
        familyName,
        role: role.data,
        notes,
        cssStack,
        status: status.data,
        isDefaultErp,
        isDefaultPdf,
      },
    });
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.typography.update",
    entityType: "brand_typography",
    entityId: id,
  });

  revalidateCharte(`/administration/charte/typographies/${id}`);
  return { ok: true, message: "Typographie mise à jour" };
}

export async function addBrandFontFileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const typographyId = String(formData.get("typographyId") ?? "");
  const file = formData.get("file");
  const weight = Number(formData.get("weight") ?? 400) || 400;
  const style =
    String(formData.get("style") ?? "normal") === "italic" ? "italic" : "normal";

  if (!typographyId) return { ok: false, error: "Typographie manquante" };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fichier police manquant" };
  }
  if (file.size > MAX_BRAND_FONT_BYTES) {
    return { ok: false, error: "Police trop volumineuse (max 4 Mo)" };
  }

  const typo = await prisma.brandTypography.findUnique({
    where: { id: typographyId },
  });
  if (!typo) return { ok: false, error: "Typographie introuvable" };

  const mime = file.type || "application/octet-stream";
  const bytes = Buffer.from(await file.arrayBuffer());
  const storagePath = `${BRAND_STORAGE_PREFIX}/fonts/${typographyId}/${Date.now()}_${safeStorageFileName(file.name)}`;
  await uploadGedObject(storagePath, bytes, mime);

  await prisma.brandFontFile.upsert({
    where: {
      typographyId_weight_style: { typographyId, weight, style },
    },
    create: {
      typographyId,
      weight,
      style,
      storagePath,
      mime,
      originalFileName: file.name.slice(0, 180),
      fileSizeBytes: bytes.length,
    },
    update: {
      storagePath,
      mime,
      originalFileName: file.name.slice(0, 180),
      fileSizeBytes: bytes.length,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.font.upload",
    entityType: "brand_typography",
    entityId: typographyId,
    metadata: { weight, style },
  });

  revalidateCharte(`/administration/charte/typographies/${typographyId}`);
  return { ok: true, message: "Fichier police ajouté" };
}

/* ─── Ressources ─── */

export async function createBrandResourceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "AUTRE");
  const description = String(formData.get("description") ?? "").trim() || null;
  const file = formData.get("file");

  if (!label) return { ok: false, error: "Libellé requis" };
  const kind = resourceKindSchema.safeParse(kindRaw);
  if (!kind.success) return { ok: false, error: "Catégorie invalide" };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fichier manquant" };
  }
  if (file.size > MAX_BRAND_RESOURCE_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max 12 Mo)" };
  }
  const mime = file.type || "application/octet-stream";
  if (!(BRAND_RESOURCE_MIME as readonly string[]).includes(mime)) {
    return { ok: false, error: "Formats : SVG, PNG, JPEG, WebP, GIF" };
  }

  let bytes = Buffer.from(await file.arrayBuffer());
  if (mime === "image/svg+xml") {
    const { sanitizeSvg } = await import("@/lib/brand/svg-sanitize");
    try {
      bytes = Buffer.from(sanitizeSvg(bytes.toString("utf8")), "utf8");
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "SVG invalide",
      };
    }
  }

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const code = makeBrandCode(label, id.slice(0, 6));
  const storagePath = `${BRAND_STORAGE_PREFIX}/resources/${id}/${Date.now()}_${safeStorageFileName(file.name)}`;
  await uploadGedObject(storagePath, bytes, mime);

  const row = await prisma.brandResource.create({
    data: {
      id,
      code,
      label,
      kind: kind.data,
      description,
      storagePath,
      mime,
      originalFileName: file.name.slice(0, 180),
      fileSizeBytes: bytes.length,
      createdById: actor.id,
      status: BrandItemStatus.ACTIVE,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.resource.create",
    entityType: "brand_resource",
    entityId: row.id,
  });

  revalidateCharte();
  redirect(`/administration/charte/ressources/${row.id}`);
}

export async function updateBrandResourceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const statusRaw = String(formData.get("status") ?? "");

  if (!id || !label) return { ok: false, error: "Données invalides" };
  const kind = resourceKindSchema.safeParse(kindRaw);
  const status = statusSchema.safeParse(statusRaw);
  if (!kind.success || !status.success) {
    return { ok: false, error: "Données invalides" };
  }

  await prisma.brandResource.update({
    where: { id },
    data: {
      label,
      kind: kind.data,
      description,
      status: status.data,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.resource.update",
    entityType: "brand_resource",
    entityId: id,
  });

  revalidateCharte(`/administration/charte/ressources/${id}`);
  return { ok: true, message: "Ressource mise à jour" };
}

export async function deleteBrandResourceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireBrandAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Ressource manquante" };

  await prisma.brandResource.update({
    where: { id },
    data: { status: BrandItemStatus.ARCHIVED },
  });

  await writeAudit({
    actorId: actor.id,
    action: "brand.resource.archive",
    entityType: "brand_resource",
    entityId: id,
  });

  revalidateCharte();
  redirect("/administration/charte/ressources");
}
