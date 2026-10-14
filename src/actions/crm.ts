"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CrmActivityType,
  CrmLossReason,
  CrmPipelineStage,
  CrmSource,
  CrmTaskStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission, type SessionUser } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import { normalizeOrgName } from "@/lib/crm/labels";
import {
  CONTACT_COMMENT_MIN_LEN,
  CONTACT_STAGE_CHANNELS,
  followUpRequiredForStage,
  isEnteringContacte,
  MIN_ACTIVITIES_BEFORE_LOST,
  normalizeUiStage,
} from "@/lib/crm/guide-rules";
import { ACTIVITY_LABELS } from "@/lib/crm/labels";
import { GOAL_METRICS } from "@/lib/crm/goals";
import {
  canMutateCrmDeal,
  canReassignCrmDeal,
} from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import type { ActionResult } from "@/actions/auth";

const stageSchema = z.nativeEnum(CrmPipelineStage);
const sourceSchema = z.nativeEnum(CrmSource);
const activitySchema = z.nativeEnum(CrmActivityType);
const lossSchema = z.nativeEnum(CrmLossReason);
const contactChannelSchema = z.enum(CONTACT_STAGE_CHANNELS);

const createProspectSchema = z
  .object({
    orgName: z
      .string()
      .trim()
      .min(1, "Entreprise obligatoire")
      .max(200, "Nom d’entreprise trop long"),
    contactFirst: z
      .string()
      .trim()
      .min(1, "Prénom du contact obligatoire")
      .max(100),
    contactLast: z.string().trim().max(100).optional().default(""),
    title: z.string().trim().max(200).optional().default(""),
    source: sourceSchema,
    phone: z.string().trim().max(40).optional().default(""),
    email: z
      .string()
      .trim()
      .max(200)
      .optional()
      .default("")
      .refine(
        (v) => !v || z.string().email().safeParse(v).success,
        "E-mail invalide",
      ),
    jobTitle: z.string().trim().max(120).optional().default(""),
    sector: z.string().trim().max(120).optional().default(""),
    city: z.string().trim().max(120).optional().default(""),
    website: z.string().trim().max(300).optional().default(""),
    offerLabel: z.string().trim().max(200).optional().default(""),
    budgetXof: z.string().trim().optional().default(""),
    nextAction: z.string().trim().max(300).optional().default(""),
    followUpAt: z.string().trim().optional().default(""),
    notes: z.string().trim().max(4000).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (!data.phone && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Téléphone ou e-mail obligatoire",
        path: ["phone"],
      });
    }
    if (data.nextAction && !data.followUpAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "GUIDE : date de relance obligatoire si une prochaine action est renseignée.",
        path: ["followUpAt"],
      });
    }
    if (data.followUpAt) {
      const d = new Date(data.followUpAt);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date de relance invalide",
          path: ["followUpAt"],
        });
      }
    }
  });

/** FormData.get → string (jamais null — Zod string refuse null). */
function fdString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return v == null ? "" : String(v);
}

/** Succès → `redirect` Next.js (jamais return ok). Erreur → `{ ok: false }`. */
export async function createProspectAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.prospect.create" });

  const sourceRaw = fdString(formData, "source").trim();
  const parsed = createProspectSchema.safeParse({
    orgName: fdString(formData, "orgName"),
    contactFirst: fdString(formData, "contactFirst"),
    contactLast: fdString(formData, "contactLast"),
    title: fdString(formData, "title"),
    source: sourceRaw || undefined,
    phone: fdString(formData, "phone"),
    email: fdString(formData, "email"),
    jobTitle: fdString(formData, "jobTitle"),
    sector: fdString(formData, "sector"),
    city: fdString(formData, "city"),
    website: fdString(formData, "website"),
    offerLabel: fdString(formData, "offerLabel"),
    budgetXof: fdString(formData, "budgetXof"),
    nextAction: fdString(formData, "nextAction"),
    followUpAt: fdString(formData, "followUpAt"),
    notes: fdString(formData, "notes"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    let message = issue?.message ?? "Données invalides";
    if (issue?.path[0] === "source") {
      message = "Origine obligatoire";
    }
    return { ok: false, error: message };
  }

  const data = parsed.data;
  const orgName = data.orgName;
  const contactFirst = data.contactFirst;
  const contactLast = data.contactLast;
  const title = data.title || orgName;
  const phone = data.phone || null;
  const email = data.email || null;
  const jobTitle = data.jobTitle || null;
  const sector = data.sector || null;
  const city = data.city || null;
  const website = data.website || null;
  const offerLabel = data.offerLabel || null;
  const budgetXofRaw = data.budgetXof.replace(/\s/g, "");
  const budgetXof = budgetXofRaw ? Number.parseInt(budgetXofRaw, 10) : null;
  const nextAction = data.nextAction || null;
  const followUpAt = data.followUpAt ? new Date(data.followUpAt) : null;
  const notes = data.notes || null;
  const src = data.source;

  type OfferLink = {
    catalogOfferId: string;
    config?: Record<string, unknown>;
  };
  let offerLinks: OfferLink[] = [];
  const offersRaw = String(formData.get("offersJson") ?? "").trim();
  if (offersRaw) {
    try {
      const parsedOffers = JSON.parse(offersRaw) as unknown;
      if (Array.isArray(parsedOffers)) {
        offerLinks = parsedOffers
          .filter(
            (x): x is OfferLink =>
              typeof x === "object" &&
              x != null &&
              typeof (x as OfferLink).catalogOfferId === "string",
          )
          .slice(0, 12);
      }
    } catch {
      return { ok: false, error: "Offres invalides" };
    }
  }
  const legacyOfferId =
    String(formData.get("catalogOfferId") ?? "").trim() ||
    offerLinks[0]?.catalogOfferId ||
    null;

  const org = await prisma.crmOrganization.create({
    data: {
      name: orgName,
      normalizedName: normalizeOrgName(orgName),
      sector,
      city,
      website,
      source: src,
      notes,
      ownerId: actor.id,
      createdById: actor.id,
      contacts: {
        create: {
          firstName: contactFirst || "—",
          lastName: contactLast || "—",
          email,
          phone,
          jobTitle,
          isPrimary: true,
        },
      },
    },
  });

  const deal = await prisma.crmOpportunity.create({
    data: {
      organizationId: org.id,
      title,
      stage: CrmPipelineStage.NOUVEAU,
      source: src,
      offerLabel,
      catalogOfferId: legacyOfferId,
      budgetXof: Number.isFinite(budgetXof) ? budgetXof : null,
      nextAction,
      followUpAt:
        followUpAt && !Number.isNaN(followUpAt.getTime()) ? followUpAt : null,
      ownerId: actor.id,
      createdById: actor.id,
    },
  });

  for (const [i, o] of offerLinks.entries()) {
    await prisma.crmOpportunityOffer.create({
      data: {
        opportunityId: deal.id,
        catalogOfferId: o.catalogOfferId,
        config: (o.config ?? {}) as Prisma.InputJsonValue,
        sortOrder: i,
      },
    });
  }

  if (followUpAt && !Number.isNaN(followUpAt.getTime())) {
    await prisma.crmTask.create({
      data: {
        organizationId: org.id,
        opportunityId: deal.id,
        title: nextAction || `Relance ${orgName}`,
        dueAt: followUpAt,
        assigneeId: actor.id,
        createdById: actor.id,
      },
    });
  }

  await writeAudit({
    actorId: actor.id,
    action: "crm.prospect.create",
    entityType: "crm_opportunity",
    entityId: deal.id,
  });

  revalidatePath("/crm");
  revalidatePath("/crm/prospects");
  revalidatePath("/crm/relances");
  // Hors try/catch — voir https://nextjs.org/docs/app/guides/redirecting
  redirect(`/crm/prospects/${deal.id}`);
}

const updateProspectSchema = z
  .object({
    opportunityId: z.string().min(8).max(40),
    orgName: z
      .string()
      .trim()
      .min(1, "Entreprise obligatoire")
      .max(200, "Nom d’entreprise trop long"),
    contactFirst: z
      .string()
      .trim()
      .min(1, "Prénom du contact obligatoire")
      .max(100),
    contactLast: z.string().trim().max(100).optional().default(""),
    source: sourceSchema,
    phone: z.string().trim().max(40).optional().default(""),
    email: z
      .string()
      .trim()
      .max(200)
      .optional()
      .default("")
      .refine(
        (v) => !v || z.string().email().safeParse(v).success,
        "E-mail invalide",
      ),
    jobTitle: z.string().trim().max(120).optional().default(""),
    sector: z.string().trim().max(120).optional().default(""),
    city: z.string().trim().max(120).optional().default(""),
    country: z.string().trim().max(4).optional().default("ML"),
    website: z.string().trim().max(300).optional().default(""),
    budgetXof: z.string().trim().optional().default(""),
    nextAction: z.string().trim().max(300).optional().default(""),
    followUpAt: z.string().trim().optional().default(""),
    notes: z.string().trim().max(4000).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (!data.phone && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Téléphone ou e-mail obligatoire",
        path: ["phone"],
      });
    }
    if (data.nextAction && !data.followUpAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "GUIDE : date de relance obligatoire si une prochaine action est renseignée.",
        path: ["followUpAt"],
      });
    }
    if (data.followUpAt) {
      const d = new Date(data.followUpAt);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date de relance invalide",
          path: ["followUpAt"],
        });
      }
    }
  });

function canEditProspectDeal(actor: SessionUser, ownerId: string): boolean {
  if (!hasPermission(actor, "crm.prospect.edit_own") && !actor.isSuperAdmin) {
    return false;
  }
  return canMutateCrmDeal(actor, ownerId);
}

/**
 * LOT-C — édition identité / contact primaire / suivi (pas multi-contacts ni offres).
 * Ne synchronise pas un ComClient déjà lié.
 */
export async function updateProspectAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.prospect.edit_own" });

  const sourceRaw = fdString(formData, "source").trim();
  const parsed = updateProspectSchema.safeParse({
    opportunityId: fdString(formData, "opportunityId"),
    orgName: fdString(formData, "orgName"),
    contactFirst: fdString(formData, "contactFirst"),
    contactLast: fdString(formData, "contactLast"),
    source: sourceRaw || undefined,
    phone: fdString(formData, "phone"),
    email: fdString(formData, "email"),
    jobTitle: fdString(formData, "jobTitle"),
    sector: fdString(formData, "sector"),
    city: fdString(formData, "city"),
    country: fdString(formData, "country") || "ML",
    website: fdString(formData, "website"),
    budgetXof: fdString(formData, "budgetXof"),
    nextAction: fdString(formData, "nextAction"),
    followUpAt: fdString(formData, "followUpAt"),
    notes: fdString(formData, "notes"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    let message = issue?.message ?? "Données invalides";
    if (issue?.path[0] === "source") message = "Origine obligatoire";
    return { ok: false, error: message };
  }

  const data = parsed.data;
  const deal = await prisma.crmOpportunity.findUnique({
    where: { id: data.opportunityId },
    include: {
      organization: {
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });
  if (!deal) return { ok: false, error: "Prospect introuvable" };
  if (!canEditProspectDeal(actor, deal.ownerId)) {
    return { ok: false, error: "Pas le droit de modifier ce prospect" };
  }

  const budgetRaw = data.budgetXof.replace(/\s/g, "");
  const budgetXof = budgetRaw ? Number.parseInt(budgetRaw, 10) : null;
  const followUpAt = data.followUpAt ? new Date(data.followUpAt) : null;
  const followUpOk =
    followUpAt && !Number.isNaN(followUpAt.getTime()) ? followUpAt : null;
  const primary = deal.organization.contacts[0];
  const changed: string[] = [];

  if (deal.organization.name !== data.orgName) changed.push("orgName");
  if ((deal.organization.sector ?? "") !== data.sector) changed.push("sector");
  if ((deal.organization.city ?? "") !== data.city) changed.push("city");
  if (deal.organization.country !== (data.country || "ML")) changed.push("country");
  if ((deal.organization.website ?? "") !== data.website) changed.push("website");
  if ((deal.organization.notes ?? "") !== data.notes) changed.push("notes");
  if (deal.organization.source !== data.source) changed.push("source");
  if ((deal.budgetXof ?? null) !== (Number.isFinite(budgetXof) ? budgetXof : null)) {
    changed.push("budgetXof");
  }
  if ((deal.nextAction ?? "") !== data.nextAction) changed.push("nextAction");
  const prevFollow = deal.followUpAt?.toISOString().slice(0, 10) ?? "";
  const nextFollow = followUpOk?.toISOString().slice(0, 10) ?? "";
  if (prevFollow !== nextFollow) changed.push("followUpAt");
  if (primary) {
    if (primary.firstName !== data.contactFirst) changed.push("contactFirst");
    if ((primary.lastName ?? "") !== data.contactLast) changed.push("contactLast");
    if ((primary.jobTitle ?? "") !== data.jobTitle) changed.push("jobTitle");
    if ((primary.phone ?? "") !== data.phone) changed.push("phone");
    if ((primary.email ?? "") !== data.email) changed.push("email");
  } else {
    changed.push("contact");
  }

  await prisma.$transaction(async (tx) => {
    await tx.crmOrganization.update({
      where: { id: deal.organizationId },
      data: {
        name: data.orgName,
        normalizedName: normalizeOrgName(data.orgName),
        sector: data.sector || null,
        city: data.city || null,
        country: data.country || "ML",
        website: data.website || null,
        source: data.source,
        notes: data.notes || null,
      },
    });

    if (primary) {
      await tx.crmContact.update({
        where: { id: primary.id },
        data: {
          firstName: data.contactFirst,
          lastName: data.contactLast || "—",
          jobTitle: data.jobTitle || null,
          phone: data.phone || null,
          email: data.email || null,
        },
      });
    } else {
      await tx.crmContact.create({
        data: {
          organizationId: deal.organizationId,
          firstName: data.contactFirst,
          lastName: data.contactLast || "—",
          jobTitle: data.jobTitle || null,
          phone: data.phone || null,
          email: data.email || null,
          isPrimary: true,
        },
      });
    }

    await tx.crmOpportunity.update({
      where: { id: deal.id },
      data: {
        title:
          deal.title === deal.organization.name ? data.orgName : deal.title,
        source: data.source,
        budgetXof: Number.isFinite(budgetXof) ? budgetXof : null,
        nextAction: data.nextAction || null,
        followUpAt: followUpOk,
      },
    });
  });

  await writeAudit({
    actorId: actor.id,
    action: "crm.prospect.update",
    entityType: "crm_opportunity",
    entityId: deal.id,
    metadata: { fields: changed },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/prospects");
  revalidatePath(`/crm/prospects/${deal.id}`);
  redirect(`/crm/prospects/${deal.id}`);
}

const reassignProspectSchema = z.object({
  opportunityId: z.string().trim().min(1),
  newOwnerId: z.string().trim().min(1),
});

/**
 * LOT-E — changer le suivi (org + deal). Admin / direction (`crm.reassign`).
 */
export async function reassignProspectAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.reassign" });
  if (!canReassignCrmDeal(actor)) {
    return { ok: false, error: "Pas le droit de changer le suivi" };
  }

  const parsed = reassignProspectSchema.safeParse({
    opportunityId: String(formData.get("opportunityId") ?? ""),
    newOwnerId: String(formData.get("newOwnerId") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Affectation invalide" };
  }
  const { opportunityId, newOwnerId } = parsed.data;

  const deal = await prisma.crmOpportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      ownerId: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  });
  if (!deal) return { ok: false, error: "Prospect introuvable" };
  if (deal.ownerId === newOwnerId) {
    return { ok: false, error: "Ce commercial suit déjà ce dossier" };
  }

  const teamIds = await commercialTeamUserIds();
  if (!teamIds.includes(newOwnerId)) {
    return {
      ok: false,
      error: "Le nouveau suivi doit être un membre du groupe Commerciaux",
    };
  }

  const newOwner = await prisma.user.findFirst({
    where: { id: newOwnerId, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!newOwner) {
    return { ok: false, error: "Utilisateur introuvable ou inactif" };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.crmOrganization.update({
      where: { id: deal.organizationId },
      data: { ownerId: newOwnerId },
    });
    await tx.crmOpportunity.update({
      where: { id: deal.id },
      data: { ownerId: newOwnerId },
    });
    await tx.crmTask.updateMany({
      where: {
        opportunityId: deal.id,
        status: CrmTaskStatus.OPEN,
      },
      data: { assigneeId: newOwnerId },
    });
    await tx.crmActivity.create({
      data: {
        opportunityId: deal.id,
        organizationId: deal.organizationId,
        type: CrmActivityType.NOTE,
        summary: `Suivi réassigné à ${newOwner.firstName} ${newOwner.lastName}`,
        body: `Ancien suivi : ${deal.ownerId}`,
        actorId: actor.id,
        occurredAt: now,
      },
    });
  });

  await writeAudit({
    actorId: actor.id,
    action: "crm.reassign",
    entityType: "crm_opportunity",
    entityId: deal.id,
    metadata: {
      fromOwnerId: deal.ownerId,
      toOwnerId: newOwnerId,
      organizationId: deal.organizationId,
    },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/prospects");
  revalidatePath(`/crm/prospects/${deal.id}`);
  revalidatePath("/crm/relances");
  revalidatePath("/crm/equipe");
  return {
    ok: true,
    message: `Suivi confié à ${newOwner.firstName} ${newOwner.lastName}`,
  };
}

export async function updateOpportunityStageAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.prospect.edit_own" });
  const id = String(formData.get("opportunityId") ?? "");
  const stageRaw = String(formData.get("stage") ?? "");
  const lossReasonRaw = String(formData.get("lossReason") ?? "");
  const lossNote = String(formData.get("lossNote") ?? "").trim() || null;
  const contactChannelRaw = String(formData.get("contactChannel") ?? "").trim();
  const contactComment = String(formData.get("contactComment") ?? "").trim();

  const stageParsed = stageSchema.safeParse(stageRaw);
  if (!id || !stageParsed.success) {
    return { ok: false, error: "Étape invalide" };
  }
  const stage = normalizeUiStage(stageParsed.data);

  const deal = await prisma.crmOpportunity.findUnique({
    where: { id },
    include: { _count: { select: { activities: true } } },
  });
  if (!deal) return { ok: false, error: "Opportunité introuvable" };

  if (!canMutateCrmDeal(actor, deal.ownerId)) {
    return { ok: false, error: "Pas le droit de modifier ce deal" };
  }

  if (stage === "PERDU") {
    const loss = lossSchema.safeParse(lossReasonRaw);
    if (!loss.success) {
      return { ok: false, error: "Motif de perte obligatoire" };
    }
    if (deal._count.activities < MIN_ACTIVITIES_BEFORE_LOST) {
      return {
        ok: false,
        error: `GUIDE : au moins ${MIN_ACTIVITIES_BEFORE_LOST} actions journalisées avant de marquer Perdu (${deal._count.activities}/${MIN_ACTIVITIES_BEFORE_LOST}).`,
      };
    }
  }

  const enteringContacte = isEnteringContacte(deal.stage, stage);
  let contactChannel: CrmActivityType | null = null;
  if (enteringContacte) {
    const channelParsed = contactChannelSchema.safeParse(contactChannelRaw);
    if (!channelParsed.success) {
      return {
        ok: false,
        error: "Canal de contact obligatoire (appel, WhatsApp…).",
      };
    }
    if (contactComment.length < CONTACT_COMMENT_MIN_LEN) {
      return {
        ok: false,
        error: `Commentaire obligatoire (min. ${CONTACT_COMMENT_MIN_LEN} caractères) : comment vous avez contacté et ce qui a été dit, ou « pas de réponse ».`,
      };
    }
    contactChannel = channelParsed.data;
  }

  if (
    followUpRequiredForStage(stage) &&
    !deal.followUpAt &&
    stage !== deal.stage
  ) {
    return {
      ok: false,
      error:
        "GUIDE : renseignez une date de relance (via une activité) avant de changer d’étape.",
    };
  }

  const enteringInteresse =
    stage === "INTERESSE" && deal.stage !== "INTERESSE";
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.crmOpportunity.update({
      where: { id },
      data: {
        stage,
        lossReason: stage === "PERDU" ? (lossReasonRaw as CrmLossReason) : null,
        lossNote: stage === "PERDU" ? lossNote : null,
        wonAt: stage === "GAGNE" ? now : deal.wonAt,
        lostAt: stage === "PERDU" ? now : null,
        interestedAt: enteringInteresse ? now : deal.interestedAt,
        lastActivityAt: enteringContacte ? now : deal.lastActivityAt,
      },
    });

    if (enteringContacte && contactChannel) {
      const channelLabel = ACTIVITY_LABELS[contactChannel];
      await tx.crmActivity.create({
        data: {
          opportunityId: id,
          organizationId: deal.organizationId,
          type: contactChannel,
          summary: `Passage en Contacté · ${channelLabel}`,
          body: contactComment,
          actorId: actor.id,
          occurredAt: now,
        },
      });
    }
  });

  if (enteringContacte && contactChannel) {
    await writeAudit({
      actorId: actor.id,
      action: "crm.stage.contacte",
      entityType: "crm_opportunity",
      entityId: id,
      metadata: { channel: contactChannel },
    });
  }

  revalidatePath("/crm");
  revalidatePath(`/crm/prospects/${id}`);
  return { ok: true, message: "Étape mise à jour" };
}

export async function logActivityAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.activity.log" });
  const opportunityId = String(formData.get("opportunityId") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "NOTE");
  const summary = String(formData.get("summary") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const nextAction = String(formData.get("nextAction") ?? "").trim() || null;
  const followUpRaw = String(formData.get("followUpAt") ?? "").trim();
  const followUpAt = followUpRaw ? new Date(followUpRaw) : null;

  const typeParsed = activitySchema.safeParse(typeRaw);
  if (!opportunityId || !summary || !typeParsed.success) {
    return { ok: false, error: "Activité incomplète" };
  }

  const deal = await prisma.crmOpportunity.findUnique({
    where: { id: opportunityId },
  });
  if (!deal) return { ok: false, error: "Deal introuvable" };

  if (!canMutateCrmDeal(actor, deal.ownerId)) {
    return { ok: false, error: "Pas le droit sur ce prospect" };
  }

  const needsFollowUp = followUpRequiredForStage(
    normalizeUiStage(deal.stage),
  );
  const hasNewFollowUp =
    followUpAt != null && !Number.isNaN(followUpAt.getTime());
  if (needsFollowUp && !deal.followUpAt && !hasNewFollowUp) {
    return {
      ok: false,
      error: "GUIDE : date de relance obligatoire pour ce statut.",
    };
  }

  const completeTaskId = String(formData.get("completeTaskId") ?? "").trim();
  const now = new Date();

  await prisma.crmActivity.create({
    data: {
      opportunityId,
      organizationId: deal.organizationId,
      type: typeParsed.data,
      summary,
      body,
      actorId: actor.id,
    },
  });

  await prisma.crmOpportunity.update({
    where: { id: opportunityId },
    data: {
      lastActivityAt: now,
      nextAction: nextAction ?? deal.nextAction,
      followUpAt: hasNewFollowUp ? followUpAt : deal.followUpAt,
    },
  });

  // Clôturer la relance en cours (file Relances) + éviter les doublons OPEN
  if (completeTaskId) {
    const task = await prisma.crmTask.findUnique({
      where: { id: completeTaskId },
    });
    if (
      task &&
      task.status === CrmTaskStatus.OPEN &&
      task.opportunityId === opportunityId
    ) {
      await prisma.crmTask.update({
        where: { id: completeTaskId },
        data: { status: CrmTaskStatus.DONE, completedAt: now },
      });
    }
  }

  if (hasNewFollowUp && followUpAt) {
    await prisma.crmTask.updateMany({
      where: {
        opportunityId,
        status: CrmTaskStatus.OPEN,
        ...(completeTaskId ? { id: { not: completeTaskId } } : {}),
      },
      data: { status: CrmTaskStatus.DONE, completedAt: now },
    });
    await prisma.crmTask.create({
      data: {
        organizationId: deal.organizationId,
        opportunityId,
        title: nextAction || summary,
        dueAt: followUpAt,
        assigneeId: deal.ownerId,
        createdById: actor.id,
      },
    });
  }

  revalidatePath(`/crm/prospects/${opportunityId}`);
  revalidatePath("/crm/relances");
  revalidatePath("/crm");
  return { ok: true, message: "Activité enregistrée" };
}

function canActOnTask(actor: SessionUser, assigneeId: string): boolean {
  return (
    assigneeId === actor.id ||
    actor.isSuperAdmin ||
    hasPermission(actor, "crm.view_team") ||
    hasPermission(actor, "crm.reports.global")
  );
}

/** Reporter une relance de +1 / +3 / +7 jours (sans journal). */
export async function rescheduleTaskAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.activity.log" });
  const id = String(formData.get("taskId") ?? "").trim();
  const daysRaw = Number.parseInt(String(formData.get("days") ?? ""), 10);
  if (!id) return { ok: false, error: "Relance manquante" };
  if (![1, 3, 7].includes(daysRaw)) {
    return { ok: false, error: "Délai invalide (1, 3 ou 7 jours)" };
  }

  const task = await prisma.crmTask.findUnique({ where: { id } });
  if (!task || task.status !== CrmTaskStatus.OPEN) {
    return { ok: false, error: "Relance introuvable" };
  }
  if (!canActOnTask(actor, task.assigneeId)) {
    return { ok: false, error: "Pas assigné à cette tâche" };
  }

  const base = new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + daysRaw);

  await prisma.crmTask.update({
    where: { id },
    data: { dueAt: base },
  });

  if (task.opportunityId) {
    await prisma.crmOpportunity.update({
      where: { id: task.opportunityId },
      data: { followUpAt: base },
    });
    revalidatePath(`/crm/prospects/${task.opportunityId}`);
  }

  revalidatePath("/crm/relances");
  revalidatePath("/crm");
  return {
    ok: true,
    message: `Relance reportée de ${daysRaw} jour${daysRaw > 1 ? "s" : ""}`,
  };
}

export async function saveWeeklyReportAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.access" });
  const weekStartRaw = String(formData.get("weekStart") ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStartRaw);
  if (!m) return { ok: false, error: "Semaine invalide" };
  const weekStart = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  );

  const int = (k: string) => {
    const n = Number.parseInt(String(formData.get(k) ?? "0"), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const difficulty = String(formData.get("difficulty") ?? "").trim() || null;
  const needs = String(formData.get("needs") ?? "").trim() || null;
  const scriptsFeedback =
    String(formData.get("scriptsFeedback") ?? "").trim() || null;

  await prisma.crmWeeklyReport.upsert({
    where: {
      authorId_weekStart: {
        authorId: actor.id,
        weekStart,
      },
    },
    create: {
      authorId: actor.id,
      weekStart,
      newProspects: int("newProspects"),
      firstContacts: int("firstContacts"),
      replies: int("replies"),
      inDiscussion: int("inDiscussion"),
      qualified: int("qualified"),
      meetings: int("meetings"),
      followUpsDone: int("followUpsDone"),
      difficulty,
      needs,
      scriptsFeedback,
    },
    update: {
      newProspects: int("newProspects"),
      firstContacts: int("firstContacts"),
      replies: int("replies"),
      inDiscussion: int("inDiscussion"),
      qualified: int("qualified"),
      meetings: int("meetings"),
      followUpsDone: int("followUpsDone"),
      difficulty,
      needs,
      scriptsFeedback,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "crm.weekly_report.save",
    entityType: "crm_weekly_report",
    entityId: `${actor.id}:${weekStart.toISOString().slice(0, 10)}`,
  });

  revalidatePath("/crm/rapport-semaine");
  return { ok: true, message: "Rapport de semaine enregistré" };
}

/** Import CSV type Excel CRM (séparateur `;`, max 400, dédupliqué). */
export async function importCrmCsvAction(
  formData: FormData,
): Promise<
  ActionResult & { imported?: number; skipped?: number; duplicates?: number }
> {
  const actor = await requireUser({ permission: "crm.import" });
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fichier CSV manquant" };
  }

  const { parseImportCsv, normalizeOrgName: norm } = await import(
    "@/lib/crm/import-csv"
  );
  const text = await file.text();
  const { rows, skipped: parseSkipped } = parseImportCsv(text);

  const existing = await prisma.crmOrganization.findMany({
    select: { normalizedName: true },
  });
  const known = new Set(existing.map((o) => o.normalizedName));

  let imported = 0;
  let skipped = parseSkipped;
  let duplicates = 0;
  const MAX = 400;

  for (const row of rows) {
    if (imported >= MAX) {
      skipped += rows.length - imported - duplicates;
      break;
    }
    const normalizedName = norm(row.orgName);
    if (known.has(normalizedName)) {
      duplicates += 1;
      continue;
    }

    let notes = row.notes;
    const srcRaw = row.source;
    // Marquer ChatGPT dans les notes si origine AUTRE + hint
    if (row.ownerHint) {
      notes = [notes, `Suivi (import) : ${row.ownerHint}`]
        .filter(Boolean)
        .join("\n");
    }

    const org = await prisma.crmOrganization.create({
      data: {
        name: row.orgName,
        normalizedName,
        sector: row.sector,
        source: srcRaw,
        notes,
        ownerId: actor.id,
        createdById: actor.id,
        contacts: {
          create: {
            firstName: row.contactFirst,
            lastName: row.contactLast,
            jobTitle: row.jobTitle,
            phone: row.phone,
            email: row.email,
            isPrimary: true,
          },
        },
      },
    });

    known.add(normalizedName);

    const deal = await prisma.crmOpportunity.create({
      data: {
        organizationId: org.id,
        title: row.orgName,
        stage: row.stage,
        source: srcRaw,
        offerLabel: row.offerLabel,
        nextAction: row.nextAction,
        followUpAt: row.followUpAt,
        lastActivityAt: row.lastAction ? new Date() : null,
        ownerId: actor.id,
        createdById: actor.id,
        wonAt: row.stage === "GAGNE" ? new Date() : null,
        lostAt: row.stage === "PERDU" ? new Date() : null,
        lossReason: row.stage === "PERDU" ? CrmLossReason.AUTRE : null,
      },
    });

    if (row.lastAction) {
      await prisma.crmActivity.create({
        data: {
          organizationId: org.id,
          opportunityId: deal.id,
          type: CrmActivityType.NOTE,
          summary: row.lastAction,
          actorId: actor.id,
        },
      });
    }

    if (row.followUpAt) {
      await prisma.crmTask.create({
        data: {
          organizationId: org.id,
          opportunityId: deal.id,
          title: row.nextAction || `Relance ${row.orgName}`,
          dueAt: row.followUpAt,
          assigneeId: actor.id,
          createdById: actor.id,
        },
      });
    }

    imported += 1;
  }

  await writeAudit({
    actorId: actor.id,
    action: "crm.import",
    entityType: "crm",
    entityId: "csv",
    metadata: { imported, skipped, duplicates },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/prospects");
  return {
    ok: true,
    message: `${imported} importés · ${duplicates} doublons · ${skipped} ignorés`,
    imported,
    skipped,
    duplicates,
  };
}

const scriptSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Code: a-z, 0-9, _"),
  channel: sourceSchema,
  title: z.string().min(2).max(120),
  body: z.string().min(10).max(8000),
  tips: z.string().max(500).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export async function upsertCrmScriptAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.scripts.manage" });
  const id = String(formData.get("id") ?? "").trim() || null;

  const parsed = scriptSchema.safeParse({
    code: String(formData.get("code") ?? "")
      .trim()
      .toLowerCase(),
    channel: String(formData.get("channel") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    tips: String(formData.get("tips") ?? "").trim() || undefined,
    sortOrder: String(formData.get("sortOrder") ?? "100").replace(/\s/g, ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Champs script invalides" };
  }

  if (id) {
    await prisma.crmScript.update({
      where: { id },
      data: {
        channel: parsed.data.channel,
        title: parsed.data.title,
        body: parsed.data.body,
        tips: parsed.data.tips ?? null,
        sortOrder: parsed.data.sortOrder,
      },
    });
  } else {
    await prisma.crmScript.create({
      data: {
        code: parsed.data.code,
        channel: parsed.data.channel,
        title: parsed.data.title,
        body: parsed.data.body,
        tips: parsed.data.tips ?? null,
        sortOrder: parsed.data.sortOrder,
      },
    });
  }

  await writeAudit({
    actorId: actor.id,
    action: id ? "crm.script.update" : "crm.script.create",
    entityType: "crm_script",
    entityId: id ?? parsed.data.code,
  });

  revalidatePath("/crm/scripts");
  redirect("/crm/scripts");
}

export async function toggleCrmScriptAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireUser({ permission: "crm.scripts.manage" });
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return { ok: false, error: "Script manquant" };

  await prisma.crmScript.update({
    where: { id },
    data: { active },
  });
  revalidatePath("/crm/scripts");
  return { ok: true, message: active ? "Script activé" : "Script désactivé" };
}

/** Objectifs hebdo — TEAM (global) ou USER (soi / collab si lead). */
export async function saveWeeklyGoalsAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.access" });
  const scopeRaw = String(formData.get("scope") ?? "USER");
  const scope = scopeRaw === "TEAM" ? "TEAM" : "USER";
  const canManage =
    actor.isSuperAdmin || hasPermission(actor, "crm.reports.global");

  // Objectifs = Direction / crm.reports.global uniquement (pas d’auto-édition collab).
  if (!canManage) {
    return {
      ok: false,
      error: "Seule la Direction (ou un droit dédié) peut fixer les objectifs",
    };
  }

  let targetUserId = actor.id;
  if (scope === "USER") {
    const requested = String(formData.get("targetUserId") ?? "").trim();
    if (requested) {
      const exists = await prisma.user.findFirst({
        where: { id: requested, status: "ACTIVE" },
        select: { id: true },
      });
      if (!exists) return { ok: false, error: "Collaborateur introuvable" };
      targetUserId = requested;
    }
  }

  for (const metric of GOAL_METRICS) {
    const raw = String(formData.get(metric) ?? "").trim();
    const target = Number.parseInt(raw, 10);
    if (!Number.isFinite(target) || target < 0 || target > 9999) continue;

    if (scope === "TEAM") {
      const existing = await prisma.crmWeeklyGoal.findFirst({
        where: { scope: "TEAM", metric, userId: null },
      });
      if (existing) {
        await prisma.crmWeeklyGoal.update({
          where: { id: existing.id },
          data: { target },
        });
      } else {
        await prisma.crmWeeklyGoal.create({
          data: { scope: "TEAM", userId: null, metric, target },
        });
      }
    } else {
      await prisma.crmWeeklyGoal.upsert({
        where: {
          scope_userId_metric: {
            scope: "USER",
            userId: targetUserId,
            metric,
          },
        },
        create: {
          scope: "USER",
          userId: targetUserId,
          metric,
          target,
        },
        update: { target },
      });
    }
  }

  revalidatePath("/crm");
  revalidatePath("/crm/objectifs");
  revalidatePath("/crm/rapport-semaine");
  revalidatePath("/crm/equipe");
  return { ok: true, message: "Objectifs enregistrés" };
}
