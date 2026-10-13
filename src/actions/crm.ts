"use server";

import { revalidatePath } from "next/cache";
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
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import { normalizeOrgName } from "@/lib/crm/labels";
import {
  followUpRequiredForStage,
  MIN_ACTIVITIES_BEFORE_LOST,
  normalizeUiStage,
} from "@/lib/crm/guide-rules";
import { GOAL_METRICS } from "@/lib/crm/goals";
import type { ActionResult } from "@/actions/auth";

const stageSchema = z.nativeEnum(CrmPipelineStage);
const sourceSchema = z.nativeEnum(CrmSource);
const activitySchema = z.nativeEnum(CrmActivityType);
const lossSchema = z.nativeEnum(CrmLossReason);

export async function createProspectAction(
  formData: FormData,
): Promise<ActionResult & { opportunityId?: string }> {
  const actor = await requireUser({ permission: "crm.prospect.create" });

  const orgName = String(formData.get("orgName") ?? "").trim();
  const contactFirst = String(formData.get("contactFirst") ?? "").trim();
  const contactLast = String(formData.get("contactLast") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || orgName;
  const sourceRaw = String(formData.get("source") ?? "AUTRE");
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const jobTitle = String(formData.get("jobTitle") ?? "").trim() || null;
  const sector = String(formData.get("sector") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  const offerLabel = String(formData.get("offerLabel") ?? "").trim() || null;
  const budgetXofRaw = String(formData.get("budgetXof") ?? "").replace(/\s/g, "");
  const budgetXof = budgetXofRaw ? Number.parseInt(budgetXofRaw, 10) : null;
  const nextAction = String(formData.get("nextAction") ?? "").trim() || null;
  const followUpRaw = String(formData.get("followUpAt") ?? "").trim();
  const followUpAt = followUpRaw ? new Date(followUpRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  type OfferLink = {
    catalogOfferId: string;
    config?: Record<string, unknown>;
  };
  let offerLinks: OfferLink[] = [];
  const offersRaw = String(formData.get("offersJson") ?? "").trim();
  if (offersRaw) {
    try {
      const parsed = JSON.parse(offersRaw) as unknown;
      if (Array.isArray(parsed)) {
        offerLinks = parsed
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

  if (!orgName) return { ok: false, error: "Entreprise obligatoire" };
  if (!contactFirst && !contactLast) {
    return { ok: false, error: "Contact (prénom ou nom) obligatoire" };
  }
  if (
    nextAction &&
    (!followUpAt || Number.isNaN(followUpAt.getTime()))
  ) {
    return {
      ok: false,
      error: "GUIDE : date de relance obligatoire si une prochaine action est renseignée.",
    };
  }

  const source = sourceSchema.safeParse(sourceRaw);
  const src = source.success ? source.data : CrmSource.AUTRE;

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
  return { ok: true, message: "Prospect créé", opportunityId: deal.id };
}

export async function updateOpportunityStageAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.prospect.edit_own" });
  const id = String(formData.get("opportunityId") ?? "");
  const stageRaw = String(formData.get("stage") ?? "");
  const lossReasonRaw = String(formData.get("lossReason") ?? "");
  const lossNote = String(formData.get("lossNote") ?? "").trim() || null;

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

  const canTeam =
    actor.isSuperAdmin ||
    hasPermission(actor, "crm.reports.global") ||
    hasPermission(actor, "crm.reassign") ||
    hasPermission(actor, "crm.view_team");
  if (deal.ownerId !== actor.id && !canTeam) {
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

  await prisma.crmOpportunity.update({
    where: { id },
    data: {
      stage,
      lossReason: stage === "PERDU" ? (lossReasonRaw as CrmLossReason) : null,
      lossNote: stage === "PERDU" ? lossNote : null,
      wonAt: stage === "GAGNE" ? new Date() : deal.wonAt,
      lostAt: stage === "PERDU" ? new Date() : null,
      interestedAt: enteringInteresse ? new Date() : deal.interestedAt,
    },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/par-etapes");
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

  const canTeam =
    actor.isSuperAdmin ||
    hasPermission(actor, "crm.view_team") ||
    hasPermission(actor, "crm.reports.global");
  if (deal.ownerId !== actor.id && !canTeam) {
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
      lastActivityAt: new Date(),
      nextAction: nextAction ?? deal.nextAction,
      followUpAt: hasNewFollowUp ? followUpAt : deal.followUpAt,
    },
  });

  if (hasNewFollowUp && followUpAt) {
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
  revalidatePath("/crm/par-etapes");
  revalidatePath("/crm");
  return { ok: true, message: "Activité enregistrée" };
}

export async function completeTaskAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.activity.log" });
  const id = String(formData.get("taskId") ?? "");
  if (!id) return { ok: false, error: "Tâche manquante" };

  const task = await prisma.crmTask.findUnique({ where: { id } });
  if (!task) return { ok: false, error: "Tâche introuvable" };
  if (
    task.assigneeId !== actor.id &&
    !hasPermission(actor, "crm.view_team") &&
    !hasPermission(actor, "crm.reports.global") &&
    !actor.isSuperAdmin
  ) {
    return { ok: false, error: "Pas assigné à cette tâche" };
  }

  await prisma.crmTask.update({
    where: { id },
    data: { status: CrmTaskStatus.DONE, completedAt: new Date() },
  });

  revalidatePath("/crm/relances");
  revalidatePath("/crm");
  return { ok: true, message: "Relance terminée" };
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
  revalidatePath("/crm/par-etapes");
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
  return { ok: true, message: "Script enregistré" };
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
