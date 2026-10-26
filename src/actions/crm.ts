"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CrmActivityType,
  CrmContactChannelType,
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
import { ACTIVITY_LABELS, STAGE_LABELS } from "@/lib/crm/labels";
import { GOAL_METRICS } from "@/lib/crm/goals";
import { toPeriodStartDate } from "@/lib/crm/goal-scale";
import {
  canMutateCrmDeal,
  canReassignCrmDeal,
} from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { countOutreachActivities } from "@/lib/crm/follow-up-count";
import {
  mirrorPhoneEmail,
  normalizeChannelValue,
  parseChannelsJson,
  validateChannels,
  type ChannelInput,
} from "@/lib/crm/channels";
import { sanitizeUrl } from "@/lib/crm/social";
import {
  hasBlockingOrgDuplicate,
  searchContactDuplicates,
  searchOrgDuplicates,
} from "@/lib/crm/duplicate-search";
import { hasIdentityContactMatch } from "@/lib/crm/duplicates";
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
    instagramUrl: z.string().trim().max(400).optional().default(""),
    linkedinUrl: z.string().trim().max(400).optional().default(""),
    tiktokUrl: z.string().trim().max(400).optional().default(""),
    facebookUrl: z.string().trim().max(400).optional().default(""),
    whatsappUrl: z.string().trim().max(400).optional().default(""),
    offerLabel: z.string().trim().max(200).optional().default(""),
    budgetXof: z.string().trim().optional().default(""),
    nextAction: z.string().trim().max(300).optional().default(""),
    followUpAt: z.string().trim().optional().default(""),
    notes: z.string().trim().max(4000).optional().default(""),
  })
  .superRefine((data, ctx) => {
    // Channels validés à part (channelsJson) — phone/email restent fallback.
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

function resolveChannelsFromForm(formData: FormData): ChannelInput[] | { error: string } {
  const raw = fdString(formData, "channelsJson");
  const parsed = parseChannelsJson(raw);
  if (parsed && parsed.length > 0) {
    const err = validateChannels(parsed);
    if (err) return { error: err };
    return parsed;
  }
  const phone = fdString(formData, "phone").trim();
  const email = fdString(formData, "email").trim();
  if (!phone && !email) {
    return { error: "Au moins un moyen de contact est obligatoire." };
  }
  const fallback: ChannelInput[] = [];
  if (phone) {
    fallback.push({ type: "PHONE", value: phone, isPrimary: true });
  }
  if (email) {
    fallback.push({
      type: "EMAIL",
      value: email,
      isPrimary: fallback.length === 0,
    });
  }
  return fallback;
}

/**
 * LOT-F — candidats doublons entreprise (exact / fuzzy).
 * Live : dès 3 caractères côté UI ; ici tout nom non vide est accepté (contrôle étape / submit).
 */
export async function findOrgDuplicateCandidatesAction(
  formData: FormData,
): Promise<
  | { ok: true; candidates: Awaited<ReturnType<typeof searchOrgDuplicates>> }
  | { ok: false; error: string }
> {
  await requireUser({ permission: "crm.prospect.create" });
  const orgName = fdString(formData, "orgName").trim();
  if (!orgName) {
    return { ok: false, error: "Indiquez le nom de l’entreprise." };
  }
  const candidates = await searchOrgDuplicates(orgName);
  return { ok: true, candidates };
}

/**
 * LOT-F — candidats doublons contact (tél / e-mail / canaux).
 * Live : canaux partiels OK (pas d’obligation « principal » tant que la saisie est exploratoire).
 */
export async function findContactDuplicateCandidatesAction(
  formData: FormData,
): Promise<
  | {
      ok: true;
      candidates: Awaited<ReturnType<typeof searchContactDuplicates>>;
    }
  | { ok: false; error: string }
> {
  await requireUser({ permission: "crm.prospect.create" });
  const raw = fdString(formData, "channelsJson");
  const parsed = parseChannelsJson(raw);
  if (parsed && parsed.length > 0) {
    const candidates = await searchContactDuplicates(parsed);
    return { ok: true, candidates };
  }
  const channels = resolveChannelsFromForm(formData);
  if ("error" in channels) {
    // Live search : saisie encore incomplète → pas d’erreur, liste vide
    if (fdString(formData, "live") === "1") {
      return { ok: true, candidates: [] };
    }
    return { ok: false, error: channels.error };
  }
  const candidates = await searchContactDuplicates(channels);
  return { ok: true, candidates };
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
    instagramUrl: fdString(formData, "instagramUrl"),
    linkedinUrl: fdString(formData, "linkedinUrl"),
    tiktokUrl: fdString(formData, "tiktokUrl"),
    facebookUrl: fdString(formData, "facebookUrl"),
    whatsappUrl: fdString(formData, "whatsappUrl"),
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

  const channelsOrErr = resolveChannelsFromForm(formData);
  if ("error" in channelsOrErr) {
    return { ok: false, error: channelsOrErr.error };
  }
  const channels = channelsOrErr;
  const mirrored = mirrorPhoneEmail(channels);

  const data = parsed.data;
  const orgName = data.orgName;
  const contactFirst = data.contactFirst;
  const contactLast = data.contactLast;
  const title = data.title || orgName;
  const phone = mirrored.phone;
  const email = mirrored.email;
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

  if (await hasBlockingOrgDuplicate(orgName)) {
    return {
      ok: false,
      error:
        "Une entreprise correspondante existe déjà (nom identique ou très proche). Ouvrez la fiche existante ou modifiez le nom.",
    };
  }

  const contactDupes = await searchContactDuplicates(channels);
  const ackContact = fdString(formData, "acknowledgeContactDupes") === "1";
  if (hasIdentityContactMatch(contactDupes) && !ackContact) {
    return {
      ok: false,
      error:
        "Un contact avec le même téléphone ou e-mail existe déjà. Vérifiez la fiche ou confirmez « Continuer quand même ».",
    };
  }

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
      instagramUrl: sanitizeUrl(data.instagramUrl),
      linkedinUrl: sanitizeUrl(data.linkedinUrl),
      tiktokUrl: sanitizeUrl(data.tiktokUrl),
      facebookUrl: sanitizeUrl(data.facebookUrl),
      whatsappUrl: sanitizeUrl(data.whatsappUrl),
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
          channels: {
            create: channels.map((c) => ({
              type: c.type as CrmContactChannelType,
              value: c.value.trim(),
              normalizedValue: normalizeChannelValue(c.type, c.value),
              isPrimary: c.isPrimary,
            })),
          },
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

  const createdAt = deal.createdAt ?? new Date();
  await prisma.crmActivity.create({
    data: {
      opportunityId: deal.id,
      organizationId: org.id,
      type: CrmActivityType.NOTE,
      summary: "Prospect créé",
      body: [
        orgName,
        src ? `Origine : ${src}` : null,
        nextAction ? `Prochaine action : ${nextAction}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      actorId: actor.id,
      occurredAt: createdAt,
    },
  });

  if (ackContact && contactDupes.length > 0) {
    await writeAudit({
      actorId: actor.id,
      action: "crm.duplicate.ignored",
      entityType: "crm_opportunity",
      entityId: deal.id,
      metadata: {
        orgName,
        kind: "contact_identity",
        candidateIds: contactDupes.map((c) => c.id).slice(0, 10),
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
    instagramUrl: z.string().trim().max(400).optional().default(""),
    linkedinUrl: z.string().trim().max(400).optional().default(""),
    tiktokUrl: z.string().trim().max(400).optional().default(""),
    facebookUrl: z.string().trim().max(400).optional().default(""),
    whatsappUrl: z.string().trim().max(400).optional().default(""),
    budgetXof: z.string().trim().optional().default(""),
    nextAction: z.string().trim().max(300).optional().default(""),
    followUpAt: z.string().trim().optional().default(""),
    notes: z.string().trim().max(4000).optional().default(""),
  })
  .superRefine((data, ctx) => {
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
    instagramUrl: fdString(formData, "instagramUrl"),
    linkedinUrl: fdString(formData, "linkedinUrl"),
    tiktokUrl: fdString(formData, "tiktokUrl"),
    facebookUrl: fdString(formData, "facebookUrl"),
    whatsappUrl: fdString(formData, "whatsappUrl"),
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

  const channelsOrErr = resolveChannelsFromForm(formData);
  if ("error" in channelsOrErr) {
    return { ok: false, error: channelsOrErr.error };
  }
  const channels = channelsOrErr;
  const mirrored = mirrorPhoneEmail(channels);

  const data = parsed.data;
  const deal = await prisma.crmOpportunity.findUnique({
    where: { id: data.opportunityId },
    include: {
      organization: {
        include: {
          contacts: {
            where: { isPrimary: true },
            take: 1,
            include: { channels: true },
          },
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
  const socialFields = [
    "instagramUrl",
    "linkedinUrl",
    "tiktokUrl",
    "facebookUrl",
    "whatsappUrl",
  ] as const;
  for (const f of socialFields) {
    const prev = deal.organization[f] ?? "";
    const next = sanitizeUrl(data[f]) ?? "";
    if (prev !== next) {
      changed.push("social");
      break;
    }
  }
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
    if ((primary.phone ?? "") !== (mirrored.phone ?? "")) changed.push("phone");
    if ((primary.email ?? "") !== (mirrored.email ?? "")) changed.push("email");
  } else {
    changed.push("contact");
  }
  changed.push("channels");

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
        instagramUrl: sanitizeUrl(data.instagramUrl),
        linkedinUrl: sanitizeUrl(data.linkedinUrl),
        tiktokUrl: sanitizeUrl(data.tiktokUrl),
        facebookUrl: sanitizeUrl(data.facebookUrl),
        whatsappUrl: sanitizeUrl(data.whatsappUrl),
        source: data.source,
        notes: data.notes || null,
      },
    });

    let contactId = primary?.id;
    if (primary) {
      await tx.crmContact.update({
        where: { id: primary.id },
        data: {
          firstName: data.contactFirst,
          lastName: data.contactLast || "—",
          jobTitle: data.jobTitle || null,
          phone: mirrored.phone,
          email: mirrored.email,
        },
      });
      await tx.crmContactChannel.deleteMany({
        where: { contactId: primary.id },
      });
    } else {
      const created = await tx.crmContact.create({
        data: {
          organizationId: deal.organizationId,
          firstName: data.contactFirst,
          lastName: data.contactLast || "—",
          jobTitle: data.jobTitle || null,
          phone: mirrored.phone,
          email: mirrored.email,
          isPrimary: true,
        },
      });
      contactId = created.id;
    }

    if (contactId) {
      await tx.crmContactChannel.createMany({
        data: channels.map((c) => ({
          contactId,
          type: c.type as CrmContactChannelType,
          value: c.value.trim(),
          normalizedValue: normalizeChannelValue(c.type, c.value),
          isPrimary: c.isPrimary,
        })),
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
        lastActivityAt: new Date(),
      },
    });

    const fieldLabels: Record<string, string> = {
      orgName: "entreprise",
      sector: "secteur",
      city: "ville",
      country: "pays",
      website: "site web",
      notes: "résumé",
      source: "origine",
      budgetXof: "budget",
      nextAction: "prochaine action",
      followUpAt: "date de relance",
      contactFirst: "prénom contact",
      contactLast: "nom contact",
      jobTitle: "poste",
      phone: "téléphone",
      email: "e-mail",
      contact: "contact",
      channels: "moyens de contact",
      social: "réseaux sociaux",
    };
    const labels = [...new Set(changed.map((f) => fieldLabels[f] ?? f))];
    await tx.crmActivity.create({
      data: {
        opportunityId: deal.id,
        organizationId: deal.organizationId,
        type: CrmActivityType.NOTE,
        summary: "Fiche mise à jour",
        body:
          labels.length > 0
            ? `Champs : ${labels.join(", ")}`
            : "Modification enregistrée",
        actorId: actor.id,
        occurredAt: new Date(),
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
      error: "Le nouveau suivi doit être un membre de l’équipe commerciale",
    };
  }

  const newOwner = await prisma.user.findFirst({
    where: {
      id: newOwnerId,
      status: { in: ["ACTIVE", "MUST_CHANGE_PASSWORD"] },
    },
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
  revalidatePath("/crm/affectations");
  return {
    ok: true,
    message: `Suivi confié à ${newOwner.firstName} ${newOwner.lastName}`,
  };
}

/**
 * Commercial en lecture seule — demande à récupérer le suivi.
 * Direction / Admin traimtent dans `/crm/affectations`.
 */
export async function requestAssignmentAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.access" });
  const opportunityId = String(formData.get("opportunityId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim() || null;
  if (!opportunityId) return { ok: false, error: "Prospect manquant" };

  const deal = await prisma.crmOpportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      ownerId: true,
      organizationId: true,
      organization: { select: { name: true } },
      comClients: { select: { id: true }, take: 1 },
    },
  });
  if (!deal) return { ok: false, error: "Prospect introuvable" };
  if (deal.comClients.length > 0) {
    return {
      ok: false,
      error: "Ce dossier est déjà un client commercial — ouvrez la fiche client.",
    };
  }
  if (canMutateCrmDeal(actor, deal.ownerId)) {
    return { ok: false, error: "Vous suivez déjà ce dossier" };
  }

  const existing = await prisma.crmAssignmentRequest.findFirst({
    where: {
      opportunityId,
      requesterId: actor.id,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "Une demande est déjà en attente pour ce dossier" };
  }

  const req = await prisma.crmAssignmentRequest.create({
    data: {
      opportunityId,
      requesterId: actor.id,
      message,
    },
  });

  await prisma.crmActivity.create({
    data: {
      opportunityId: deal.id,
      organizationId: deal.organizationId,
      type: CrmActivityType.NOTE,
      summary: `Demande d’affectation par ${actor.firstName} ${actor.lastName}`,
      body: message,
      actorId: actor.id,
      occurredAt: new Date(),
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "crm.assignment.request",
    entityType: "crm_assignment_request",
    entityId: req.id,
    metadata: { opportunityId },
  });

  revalidatePath(`/crm/prospects/${opportunityId}`);
  revalidatePath("/crm/affectations");
  return {
    ok: true,
    message: "Demande envoyée — la Direction / Admin CRM la traitera.",
  };
}

const resolveAssignmentSchema = z.object({
  requestId: z.string().trim().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  resolveNote: z.string().trim().optional(),
});

/** Approuve (réassigne au demandeur) ou refuse une demande. */
export async function resolveAssignmentRequestAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.reassign" });
  if (!canReassignCrmDeal(actor)) {
    return { ok: false, error: "Pas le droit de traiter les affectations" };
  }

  const parsed = resolveAssignmentSchema.safeParse({
    requestId: String(formData.get("requestId") ?? ""),
    decision: String(formData.get("decision") ?? ""),
    resolveNote: String(formData.get("resolveNote") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Décision invalide" };

  const req = await prisma.crmAssignmentRequest.findUnique({
    where: { id: parsed.data.requestId },
    include: {
      opportunity: {
        select: {
          id: true,
          ownerId: true,
          organizationId: true,
          organization: { select: { name: true } },
        },
      },
      requester: {
        select: { id: true, firstName: true, lastName: true, status: true },
      },
    },
  });
  if (!req || req.status !== "PENDING") {
    return { ok: false, error: "Demande introuvable ou déjà traitée" };
  }

  const now = new Date();

  if (parsed.data.decision === "REJECT") {
    await prisma.crmAssignmentRequest.update({
      where: { id: req.id },
      data: {
        status: "REJECTED",
        resolvedAt: now,
        resolvedById: actor.id,
        resolveNote: parsed.data.resolveNote ?? null,
      },
    });
    await writeAudit({
      actorId: actor.id,
      action: "crm.assignment.reject",
      entityType: "crm_assignment_request",
      entityId: req.id,
    });
    revalidatePath("/crm/affectations");
    revalidatePath(`/crm/prospects/${req.opportunityId}`);
    return { ok: true, message: "Demande refusée" };
  }

  if (
    req.requester.status !== "ACTIVE" &&
    req.requester.status !== "MUST_CHANGE_PASSWORD"
  ) {
    return {
      ok: false,
      error: "Le demandeur n’est plus disponible pour une affectation",
    };
  }

  const teamIds = await commercialTeamUserIds();
  if (!teamIds.includes(req.requesterId) && !actor.isSuperAdmin) {
    return {
      ok: false,
      error: "Le demandeur doit être dans le groupe Commerciaux",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.crmOrganization.update({
      where: { id: req.opportunity.organizationId },
      data: { ownerId: req.requesterId },
    });
    await tx.crmOpportunity.update({
      where: { id: req.opportunityId },
      data: { ownerId: req.requesterId },
    });
    await tx.crmTask.updateMany({
      where: {
        opportunityId: req.opportunityId,
        status: CrmTaskStatus.OPEN,
      },
      data: { assigneeId: req.requesterId },
    });
    await tx.crmActivity.create({
      data: {
        opportunityId: req.opportunityId,
        organizationId: req.opportunity.organizationId,
        type: CrmActivityType.NOTE,
        summary: `Suivi confié à ${req.requester.firstName} ${req.requester.lastName} (demande approuvée)`,
        body: parsed.data.resolveNote ?? null,
        actorId: actor.id,
        occurredAt: now,
      },
    });
    await tx.crmAssignmentRequest.update({
      where: { id: req.id },
      data: {
        status: "APPROVED",
        resolvedAt: now,
        resolvedById: actor.id,
        resolveNote: parsed.data.resolveNote ?? null,
      },
    });
    await tx.crmAssignmentRequest.updateMany({
      where: {
        opportunityId: req.opportunityId,
        status: "PENDING",
        id: { not: req.id },
      },
      data: {
        status: "CANCELLED",
        resolvedAt: now,
        resolvedById: actor.id,
        resolveNote: "Annulée — autre demande approuvée",
      },
    });
  });

  await writeAudit({
    actorId: actor.id,
    action: "crm.assignment.approve",
    entityType: "crm_assignment_request",
    entityId: req.id,
    metadata: {
      opportunityId: req.opportunityId,
      toOwnerId: req.requesterId,
    },
  });

  revalidatePath("/crm/affectations");
  revalidatePath("/crm");
  revalidatePath("/crm/prospects");
  revalidatePath(`/crm/prospects/${req.opportunityId}`);
  revalidatePath("/crm/relances");
  revalidatePath("/crm/equipe");
  return {
    ok: true,
    message: `Suivi confié à ${req.requester.firstName} ${req.requester.lastName}`,
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
    const outreachCount = await countOutreachActivities(id);
    if (outreachCount < MIN_ACTIVITIES_BEFORE_LOST) {
      return {
        ok: false,
        error: `GUIDE : au moins ${MIN_ACTIVITIES_BEFORE_LOST} relances journalisées (appel, WhatsApp…) avant de marquer Perdu (${outreachCount}/${MIN_ACTIVITIES_BEFORE_LOST}).`,
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

  const stageChanged = normalizeUiStage(deal.stage) !== stage;

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
        lastActivityAt: stageChanged || enteringContacte ? now : deal.lastActivityAt,
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
    } else if (stageChanged) {
      const fromLabel =
        STAGE_LABELS[normalizeUiStage(deal.stage)] ?? deal.stage;
      const toLabel = STAGE_LABELS[stage] ?? stage;
      await tx.crmActivity.create({
        data: {
          opportunityId: id,
          organizationId: deal.organizationId,
          type: CrmActivityType.NOTE,
          summary: `Statut : ${fromLabel} → ${toLabel}`,
          body:
            stage === "PERDU" && lossNote
              ? lossNote
              : stage === "PERDU" && lossReasonRaw
                ? `Motif : ${lossReasonRaw}`
                : null,
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
  } else if (stageChanged) {
    await writeAudit({
      actorId: actor.id,
      action: "crm.stage.update",
      entityType: "crm_opportunity",
      entityId: id,
      metadata: { from: deal.stage, to: stage },
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

/** Import CSV / XLSX type Excel CRM (max 500, dédupliqué, owners résolus). */
export async function importCrmCsvAction(
  formData: FormData,
): Promise<
  ActionResult & { imported?: number; skipped?: number; duplicates?: number }
> {
  const actor = await requireUser({ permission: "crm.import" });
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fichier CSV ou Excel manquant" };
  }

  const { parseImportFile } = await import("@/lib/crm/import/parse-tabular");
  const { applyCrmImport } = await import("@/lib/crm/import/apply-import");

  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = await parseImportFile({
    fileName: file.name || "import.csv",
    bytes: buf,
  });

  const result = await applyCrmImport({
    prisma,
    rows: parsed.rows,
    fallbackUserId: actor.id,
    max: 500,
  });

  const skipped = parsed.skipped + result.skipped;
  const warn =
    result.warnings.length > 0 ? ` · ${result.warnings.join(" · ")}` : "";

  await writeAudit({
    actorId: actor.id,
    action: "crm.import",
    entityType: "crm",
    entityId: "tabular",
    metadata: {
      imported: result.imported,
      skipped,
      duplicates: result.duplicates,
      fileName: file.name,
      unresolved: result.unresolvedPeople,
    },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/prospects");
  return {
    ok: true,
    message: `${result.imported} importés · ${result.duplicates} doublons · ${skipped} ignorés${warn}`,
    imported: result.imported,
    skipped,
    duplicates: result.duplicates,
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

const goalPeriodTypeSchema = z.enum(["DAY", "WEEK", "MONTH"]);

/** Objectifs période — TEAM (global) ou USER (collab si lead). */
export async function savePeriodGoalsAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.access" });
  const scopeRaw = String(formData.get("scope") ?? "USER");
  const scope = scopeRaw === "TEAM" ? "TEAM" : "USER";
  const canManage =
    actor.isSuperAdmin || hasPermission(actor, "crm.reports.global");

  if (!canManage) {
    return {
      ok: false,
      error: "Seule la Direction (ou un droit dédié) peut fixer les objectifs",
    };
  }

  const periodTypeParsed = goalPeriodTypeSchema.safeParse(
    String(formData.get("periodType") ?? "WEEK"),
  );
  if (!periodTypeParsed.success) {
    return { ok: false, error: "Type de période invalide" };
  }
  const periodType = periodTypeParsed.data;

  const periodStartRaw = String(formData.get("periodStart") ?? "").trim();
  if (!periodStartRaw) {
    return { ok: false, error: "Période manquante" };
  }

  let periodStart: Date;
  try {
    periodStart = toPeriodStartDate(periodType, periodStartRaw);
    if (Number.isNaN(periodStart.getTime())) {
      return { ok: false, error: "Date de période invalide" };
    }
  } catch {
    return { ok: false, error: "Date de période invalide" };
  }

  let targetUserId = actor.id;
  if (scope === "USER") {
    const requested = String(formData.get("targetUserId") ?? "").trim();
    if (requested) {
      const exists = await prisma.user.findFirst({
        where: {
          id: requested,
          status: { in: ["ACTIVE", "MUST_CHANGE_PASSWORD"] },
        },
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
      const existing = await prisma.crmPeriodGoal.findFirst({
        where: {
          scope: "TEAM",
          metric,
          userId: null,
          periodType,
          periodStart,
        },
      });
      if (existing) {
        await prisma.crmPeriodGoal.update({
          where: { id: existing.id },
          data: { target },
        });
      } else {
        await prisma.crmPeriodGoal.create({
          data: {
            scope: "TEAM",
            userId: null,
            metric,
            periodType,
            periodStart,
            target,
          },
        });
      }
    } else {
      await prisma.crmPeriodGoal.upsert({
        where: {
          scope_userId_metric_periodType_periodStart: {
            scope: "USER",
            userId: targetUserId,
            metric,
            periodType,
            periodStart,
          },
        },
        create: {
          scope: "USER",
          userId: targetUserId,
          metric,
          periodType,
          periodStart,
          target,
        },
        update: { target },
      });
    }
  }

  revalidatePath("/crm");
  revalidatePath("/crm/objectifs");
  revalidatePath("/crm/objectifs/assigner");
  if (scope === "USER") {
    revalidatePath(`/crm/objectifs/assigner/${targetUserId}`);
    revalidatePath(`/crm/objectifs/${targetUserId}`);
  }
  revalidatePath("/crm/rapport-semaine");
  revalidatePath("/crm/equipe");
  return { ok: true, message: "Objectifs enregistrés" };
}

/** @deprecated Alias — préférer savePeriodGoalsAction. */
export async function saveWeeklyGoalsAction(
  formData: FormData,
): Promise<ActionResult> {
  if (!formData.get("periodType")) formData.set("periodType", "WEEK");
  return savePeriodGoalsAction(formData);
}
