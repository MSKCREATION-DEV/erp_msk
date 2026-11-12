"use server";

/**
 * Parcours unifié client ↔ contrat (plan docs/commercial/PLAN-CLIENT-CONTRAT.md, P2+P3).
 * Stepper verrouillé (Q1–Q3) : Identité → Contact → Origine → Composition
 * commerciale → Conditions contrat → Récap/docs. Une seule Server Action pour
 * les deux entrées (création directe `/commercial/clients/nouveau` et
 * transformation prospect `?opportunityId=`), afin que « Client » implique
 * toujours une composition + un contrat BROUILLON (jamais de client orphelin
 * de contrat, jamais de contrat ACTIF sans acte de signature explicite).
 */

import { revalidatePath } from "next/cache";
import { redirectWithFlash } from "@/lib/toast/flash";
import { z } from "zod";
import {
  ComCompositionSource,
  ComContractFamily,
  ComContractStatus,
  ComDocKind,
  ComQuoteStatus,
  ComServiceKind,
  CrmActivityType,
  CrmPipelineStage,
  CrmSource,
  CrmTaskStatus,
  type Prisma,
} from "@/generated/prisma/client";
import type { ActionResult } from "@/actions/auth";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/session-user";
import { prisma } from "@/lib/prisma";
import { findClientDuplicateCandidates } from "@/lib/commercial/client-duplicates";
import { searchOrgDuplicates } from "@/lib/crm/duplicate-search";
import { buildContractLinesFromQuote } from "@/lib/commercial/contract-from-quote";
import { ensureClientDocFolder } from "@/lib/commercial/ged-client";
import { buildClientGedFolderCode } from "@/lib/commercial/ged-folder-code";
import { COM_CLIENT_EVENT, logComClientEvent } from "@/lib/commercial/client-events";
import {
  CONTRACT_FAMILY_LABELS,
  normalizeClientName,
  SERVICE_KIND_LABELS,
} from "@/lib/commercial/labels";
import { nextComNumber } from "@/lib/commercial/numbering";
import { canTransformProspectToClient } from "@/lib/crm/guide-rules";
import { canMutateCrmDeal } from "@/lib/crm/scope";

const cuid = z.string().min(8).max(40);

const lineSchema = z.object({
  label: z.string().trim().min(1).max(500),
  qty: z.number().int().positive().max(10_000),
  unitPrice: z.number().int().min(0).max(1_000_000_000),
  catalogOfferId: z.string().trim().min(1).max(40).nullable().optional(),
  isTravel: z.boolean().optional(),
});

const wizardSchema = z.object({
  opportunityId: cuid.nullable(),
  name: z.string().trim().min(1).max(200),
  sector: z.string().trim().max(120).nullable(),
  city: z.string().trim().max(120).nullable(),
  country: z.string().trim().min(2).max(8),
  website: z.string().trim().max(300).nullable(),
  contactName: z.string().trim().max(200).nullable(),
  contactRole: z.string().trim().max(150).nullable(),
  email: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "E-mail invalide",
    }),
  phone: z.string().trim().max(40).nullable(),
  source: z.nativeEnum(CrmSource).nullable(),
  originNotes: z.string().trim().max(4000).nullable(),
  quoteId: cuid.nullable(),
  compositionNotes: z.string().trim().max(2000).nullable(),
  family: z.nativeEnum(ComContractFamily),
  serviceKind: z.nativeEnum(ComServiceKind),
  startDate: z.date().nullable(),
  billingDay: z.number().int().min(1).max(28),
  paymentTerms: z.string().trim().max(2000).nullable(),
  renewalTerms: z.string().trim().max(2000).nullable(),
  terminationTerms: z.string().trim().max(2000).nullable(),
  contractNotes: z.string().trim().max(4000).nullable(),
});

function listFromTextarea(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v ? v : null;
}

export type ClientWizardScope = {
  contextProblems: string[];
  objectives: string[];
  deliverables: string[];
  outOfScope: string[];
};

/**
 * Recherche live anti-doublon pour l’étape Identité du wizard client
 * (création directe uniquement — pas de sens quand `?opportunityId=` préremplit
 * déjà le nom depuis le prospect transformé). Couvre clients **et** prospects
 * CRM (même infra que la création de prospect) pour avertir avant la fin du
 * parcours en 6 étapes plutôt qu’au submit final.
 */
export async function findClientWizardDuplicatesAction(
  formData: FormData,
): Promise<
  | { ok: true; candidates: Awaited<ReturnType<typeof searchOrgDuplicates>> }
  | { ok: false; error: string }
> {
  await requireUser({ permission: "com.clients.manage" });
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Indiquez la raison sociale." };
  const candidates = await searchOrgDuplicates(name);
  return { ok: true, candidates };
}

export async function createClientWizardAction(
  formData: FormData,
): Promise<
  ActionResult & { contractId?: string; clientId?: string; duplicateHref?: string }
> {
  const actor = await requireUser({ permission: "com.clients.manage" });
  if (!hasPermission(actor, "com.contrats.manage")) {
    return {
      ok: false,
      error:
        "Droit « contrats commerciaux » manquant (com.contrats.manage) — ce parcours crée toujours un contrat brouillon.",
    };
  }

  // ---- Lignes de composition (JSON saisi par l’étape 4) ----
  let linesInput: z.infer<typeof lineSchema>[];
  try {
    const rawLines: unknown = JSON.parse(String(formData.get("linesJson") ?? "[]"));
    const parsedLines = z.array(lineSchema).max(60).safeParse(rawLines);
    if (!parsedLines.success) {
      return { ok: false, error: "Lignes de composition invalides" };
    }
    linesInput = parsedLines.data;
  } catch {
    return { ok: false, error: "Lignes de composition invalides" };
  }
  if (linesInput.length === 0) {
    return { ok: false, error: "Ajoutez au moins une ligne de composition" };
  }

  const startRaw = str(formData, "startDate");
  const parsed = wizardSchema.safeParse({
    opportunityId: str(formData, "opportunityId"),
    name: String(formData.get("name") ?? ""),
    sector: str(formData, "sector"),
    city: str(formData, "city"),
    country: str(formData, "country") ?? "ML",
    website: str(formData, "website"),
    contactName: str(formData, "contactName"),
    contactRole: str(formData, "contactRole"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    source: str(formData, "source"),
    originNotes: str(formData, "originNotes"),
    quoteId: str(formData, "quoteId"),
    compositionNotes: str(formData, "compositionNotes"),
    family: String(formData.get("family") ?? ""),
    serviceKind: String(formData.get("serviceKind") ?? ""),
    startDate: startRaw ? new Date(startRaw) : null,
    billingDay: Number.parseInt(String(formData.get("billingDay") ?? "5"), 10) || 5,
    paymentTerms: str(formData, "paymentTerms"),
    renewalTerms: str(formData, "renewalTerms"),
    terminationTerms: str(formData, "terminationTerms"),
    contractNotes: str(formData, "contractNotes"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }
  const data = parsed.data;
  if (data.startDate && Number.isNaN(data.startDate.getTime())) {
    return { ok: false, error: "Date de début invalide" };
  }

  const scopeJson: ClientWizardScope | undefined =
    data.family === ComContractFamily.ENGAGEMENT_CDC
      ? {
          contextProblems: listFromTextarea(str(formData, "scopeContext") ?? ""),
          objectives: listFromTextarea(str(formData, "scopeObjectives") ?? ""),
          deliverables: listFromTextarea(str(formData, "scopeDeliverables") ?? ""),
          outOfScope: listFromTextarea(str(formData, "scopeOutOfScope") ?? ""),
        }
      : undefined;

  // ---- Devis accepté lié (Q3 — composition préremplie) ----
  let linkedQuote: { id: string; clientId: string | null } | null = null;
  if (data.quoteId) {
    const q = await prisma.comQuote.findUnique({
      where: { id: data.quoteId },
      select: { id: true, clientId: true, status: true, opportunityId: true },
    });
    if (!q || q.status !== ComQuoteStatus.ACCEPTE) {
      return { ok: false, error: "Devis lié introuvable ou non accepté" };
    }
    if (data.opportunityId && q.opportunityId && q.opportunityId !== data.opportunityId) {
      return { ok: false, error: "Le devis lié ne correspond pas à ce prospect" };
    }
    linkedQuote = q;
  }

  // ---- Branche prospect vs création directe ----
  const deal = data.opportunityId
    ? await prisma.crmOpportunity.findUnique({
        where: { id: data.opportunityId },
        include: { organization: { select: { id: true, name: true } } },
      })
    : null;

  if (data.opportunityId) {
    if (!deal) return { ok: false, error: "Opportunité introuvable" };
    if (!canMutateCrmDeal(actor, deal.ownerId)) {
      return { ok: false, error: "Opportunité hors périmètre CRM" };
    }
    if (!canTransformProspectToClient(deal.stage)) {
      return {
        ok: false,
        error:
          "Ce prospect est Perdu — rouvrez le statut ou créez un nouveau prospect avant de transformer en client.",
      };
    }
  } else {
    // ---- Anti-doublon création directe (P1.3 + extension prospects) ----
    // 1) Même client commercial déjà en base (match tested, normalisation ComClient).
    const duplicates = await findClientDuplicateCandidates(data.name);
    if (duplicates.length > 0) {
      const first = duplicates[0]!;
      return {
        ok: false,
        error:
          first.kind === "exact"
            ? `Un client « ${first.name} » existe déjà. Ouvrez sa fiche plutôt que d’en recréer une.`
            : `Un client proche existe déjà : « ${first.name} ». Vérifiez avant de continuer.`,
        clientId: first.id,
        duplicateHref: `/commercial/clients/${first.id}`,
      };
    }
    // 2) Un prospect CRM (CrmOrganization sans ComClient lié, quel que soit son
    // statut pipeline) porte déjà ce nom : on bloque la création directe pour
    // ne pas scinder l’historique — il faut passer par « Transformer en client »
    // depuis la fiche prospect existante.
    const orgMatches = await searchOrgDuplicates(data.name);
    const prospectMatch = orgMatches.find((m) => m.entity === "prospect");
    if (prospectMatch) {
      const statusLabel = prospectMatch.stageLabel
        ? ` (statut CRM : ${prospectMatch.stageLabel})`
        : "";
      return {
        ok: false,
        error:
          prospectMatch.kind === "exact"
            ? `Un prospect « ${prospectMatch.name} » existe déjà${statusLabel}. Ouvrez sa fiche CRM et utilisez « Transformer en client » pour ne pas scinder l’historique.`
            : `Un prospect proche existe déjà : « ${prospectMatch.name} »${statusLabel}. Vérifiez avant de créer un client séparé.`,
        duplicateHref: prospectMatch.href,
      };
    }
  }

  const now = new Date();
  const title = `${data.name} — ${SERVICE_KIND_LABELS[data.serviceKind]} (${CONTRACT_FAMILY_LABELS[data.family]})`;

  let txResult: { clientId: string; contractId: string };
  try {
    txResult = await prisma.$transaction(async (tx) => {
      let client: { id: string; ownerId: string; name: string; gedFolderCode: string };

      if (deal) {
        const existing = await tx.comClient.findFirst({
          where: {
            OR: [
              { sourceOpportunityId: deal.id },
              { crmOrganizationId: deal.organizationId },
            ],
          },
        });

        if (existing) {
          client = await tx.comClient.update({
            where: { id: existing.id },
            data: {
              name: data.name,
              normalizedName: normalizeClientName(data.name),
              contactName: data.contactName,
              contactRole: data.contactRole,
              email: data.email,
              phone: data.phone,
              sector: data.sector,
              website: data.website,
              city: data.city,
              country: data.country,
              notes: data.originNotes ?? undefined,
              crmOrganizationId: existing.crmOrganizationId ?? deal.organizationId,
              sourceOpportunityId: existing.sourceOpportunityId ?? deal.id,
            },
          });
        } else {
          const created = await tx.comClient.create({
            data: {
              name: data.name,
              normalizedName: normalizeClientName(data.name),
              gedFolderCode: `TMP_${Date.now()}`,
              contactName: data.contactName,
              contactRole: data.contactRole,
              email: data.email,
              phone: data.phone,
              sector: data.sector,
              website: data.website,
              city: data.city,
              country: data.country,
              notes: data.originNotes,
              crmOrganizationId: deal.organizationId,
              sourceOpportunityId: deal.id,
              ownerId: deal.ownerId,
              createdById: actor.id,
            },
          });
          client = await tx.comClient.update({
            where: { id: created.id },
            data: {
              gedFolderCode: buildClientGedFolderCode(data.name, created.id),
            },
          });
        }

        if (linkedQuote?.clientId && linkedQuote.clientId !== client.id) {
          throw new Error("Le devis lié n’appartient pas à ce client");
        }

        const alreadyWon = deal.stage === CrmPipelineStage.GAGNE && deal.wonAt;
        if (!alreadyWon) {
          await tx.crmOpportunity.update({
            where: { id: deal.id },
            data: {
              stage: CrmPipelineStage.GAGNE,
              wonAt: deal.wonAt ?? now,
              lostAt: null,
              lossReason: null,
              lossNote: null,
              lastActivityAt: now,
            },
          });
          // Plus un prospect à relancer une fois Client — clôture les tâches
          // ouvertes (même logique que `updateOpportunityStageAction`, fix B).
          await tx.crmTask.updateMany({
            where: { opportunityId: deal.id, status: CrmTaskStatus.OPEN },
            data: { status: CrmTaskStatus.CANCELLED, completedAt: now },
          });
          await tx.crmActivity.create({
            data: {
              opportunityId: deal.id,
              organizationId: deal.organizationId,
              type: CrmActivityType.NOTE,
              summary: "Transformé en client commercial (parcours unifié)",
              body: `Client : ${client.name} (${client.gedFolderCode}). Composition + contrat brouillon créés dans le même parcours.`,
              actorId: actor.id,
              occurredAt: now,
            },
          });
        }

        await logComClientEvent(
          {
            clientId: client.id,
            actorId: actor.id,
            type: COM_CLIENT_EVENT.CRM_CONVERTED,
            summary: `Client confirmé depuis le prospect « ${deal.organization.name} » (parcours unifié).`,
            entityType: "crm_opportunity",
            entityId: deal.id,
          },
          tx,
        );
      } else {
        const created = await tx.comClient.create({
          data: {
            name: data.name,
            normalizedName: normalizeClientName(data.name),
            gedFolderCode: `TMP_${Date.now()}`,
            contactName: data.contactName,
            contactRole: data.contactRole,
            email: data.email,
            phone: data.phone,
            sector: data.sector,
            website: data.website,
            city: data.city,
            country: data.country,
            notes: data.originNotes,
            ownerId: actor.id,
            createdById: actor.id,
          },
        });
        client = await tx.comClient.update({
          where: { id: created.id },
          data: { gedFolderCode: buildClientGedFolderCode(data.name, created.id) },
        });

        await logComClientEvent(
          {
            clientId: client.id,
            actorId: actor.id,
            type: COM_CLIENT_EVENT.CREATED,
            summary: "Client créé (parcours unifié, saisie directe).",
          },
          tx,
        );
      }

      // ---- Composition → lignes de contrat (réutilise le mapping devis) ----
      const lineData = buildContractLinesFromQuote(
        linesInput.map((l, i) => ({
          id: `inline-${i}`,
          label: l.label,
          qty: l.qty,
          unitPrice: l.unitPrice,
          catalogOfferId: l.catalogOfferId ?? null,
          isTravel: Boolean(l.isTravel),
          sortOrder: i,
        })),
        data.startDate,
      );

      const reference = await nextComNumber(ComDocKind.CONTRAT, undefined, tx);
      const contract = await tx.comContract.create({
        data: {
          reference,
          status: ComContractStatus.BROUILLON,
          family: data.family,
          serviceKind: data.serviceKind,
          compositionSource: linkedQuote
            ? ComCompositionSource.QUOTE
            : ComCompositionSource.INLINE,
          scopeJson: (scopeJson as unknown as Prisma.InputJsonValue) ?? undefined,
          title,
          startDate: data.startDate,
          billingDay: data.billingDay,
          paymentTerms: data.paymentTerms,
          renewalTerms: data.renewalTerms,
          terminationTerms: data.terminationTerms,
          notes:
            [data.compositionNotes, data.contractNotes].filter(Boolean).join("\n\n") ||
            null,
          clientId: client.id,
          quoteId: linkedQuote?.id ?? null,
          ownerId: client.ownerId,
          createdById: actor.id,
          lines: { create: lineData },
        },
      });

      await logComClientEvent(
        {
          clientId: client.id,
          actorId: actor.id,
          type: COM_CLIENT_EVENT.CONTRACT_CREATED,
          summary: `Contrat brouillon ${contract.reference} créé (composition ${
            linkedQuote ? "depuis devis accepté" : "saisie libre"
          }) — signature à confirmer.`,
          entityType: "com_contract",
          entityId: contract.id,
        },
        tx,
      );

      return { clientId: client.id, contractId: contract.id };
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec de la création",
    };
  }

  // Dossier GED racine (best-effort, hors transaction — ne doit pas annuler la création).
  try {
    await ensureClientDocFolder({ clientId: txResult.clientId, type: "Devis" });
  } catch {
    // non bloquant — la fiche reste consultable ; GED créée à la 1ʳᵉ émission.
  }

  await writeAudit({
    actorId: actor.id,
    action: "com.client.wizard_create",
    entityType: "com_client",
    entityId: txResult.clientId,
    metadata: { opportunityId: data.opportunityId, contractId: txResult.contractId },
  });

  revalidatePath("/commercial");
  revalidatePath("/commercial/clients");
  revalidatePath("/commercial/contrats");
  revalidatePath(`/commercial/clients/${txResult.clientId}`);
  if (data.opportunityId) {
    revalidatePath(`/crm/prospects/${data.opportunityId}`);
    revalidatePath("/crm/prospects");
    revalidatePath("/crm");
  }
  return redirectWithFlash(
    `/commercial/contrats/${txResult.contractId}`,
    "Dossier client / contrat créé.",
  );
}
