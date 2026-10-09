"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CrmActivityType,
  CrmLossReason,
  CrmPipelineStage,
  CrmSource,
  CrmTaskStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import {
  mapExcelSource,
  mapExcelStatus,
  normalizeOrgName,
} from "@/lib/crm/labels";
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
  const offerLabel = String(formData.get("offerLabel") ?? "").trim() || null;
  const catalogOfferId =
    String(formData.get("catalogOfferId") ?? "").trim() || null;
  const budgetXofRaw = String(formData.get("budgetXof") ?? "").replace(/\s/g, "");
  const budgetXof = budgetXofRaw ? Number.parseInt(budgetXofRaw, 10) : null;
  const nextAction = String(formData.get("nextAction") ?? "").trim() || null;
  const followUpRaw = String(formData.get("followUpAt") ?? "").trim();
  const followUpAt = followUpRaw ? new Date(followUpRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!orgName) return { ok: false, error: "Entreprise obligatoire" };
  if (!contactFirst && !contactLast) {
    return { ok: false, error: "Contact (prénom ou nom) obligatoire" };
  }

  const source = sourceSchema.safeParse(sourceRaw);
  const src = source.success ? source.data : CrmSource.AUTRE;

  const org = await prisma.crmOrganization.create({
    data: {
      name: orgName,
      normalizedName: normalizeOrgName(orgName),
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
      catalogOfferId,
      budgetXof: Number.isFinite(budgetXof) ? budgetXof : null,
      nextAction,
      followUpAt:
        followUpAt && !Number.isNaN(followUpAt.getTime()) ? followUpAt : null,
      ownerId: actor.id,
      createdById: actor.id,
    },
  });

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
  const stage = stageParsed.data;

  const deal = await prisma.crmOpportunity.findUnique({ where: { id } });
  if (!deal) return { ok: false, error: "Opportunité introuvable" };

  const canGlobal =
    actor.isSuperAdmin ||
    hasPermission(actor, "crm.reports.global") ||
    hasPermission(actor, "crm.reassign");
  if (deal.ownerId !== actor.id && !canGlobal) {
    return { ok: false, error: "Pas le droit de modifier ce deal" };
  }

  if (stage === "PERDU") {
    const loss = lossSchema.safeParse(lossReasonRaw);
    if (!loss.success) {
      return { ok: false, error: "Motif de perte obligatoire" };
    }
  }

  await prisma.crmOpportunity.update({
    where: { id },
    data: {
      stage,
      lossReason: stage === "PERDU" ? (lossReasonRaw as CrmLossReason) : null,
      lossNote: stage === "PERDU" ? lossNote : null,
      wonAt: stage === "GAGNE" ? new Date() : deal.wonAt,
      lostAt: stage === "PERDU" ? new Date() : null,
    },
  });

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
      followUpAt:
        followUpAt && !Number.isNaN(followUpAt.getTime())
          ? followUpAt
          : deal.followUpAt,
    },
  });

  if (followUpAt && !Number.isNaN(followUpAt.getTime())) {
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

/** Import CSV type Excel CRM (séparateur `;`). */
export async function importCrmCsvAction(
  formData: FormData,
): Promise<ActionResult & { imported?: number; skipped?: number }> {
  const actor = await requireUser({ permission: "crm.import" });
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fichier CSV manquant" };
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // Skip title + header rows (2 premières lignes typiques Excel MSK)
  const dataLines = lines.slice(2);
  let imported = 0;
  let skipped = 0;

  for (const line of dataLines) {
    const cols = line.split(";");
    if (cols.length < 9) {
      skipped += 1;
      continue;
    }
    const orgName = (cols[1] ?? "").trim();
    const contactName = (cols[2] ?? "").trim();
    if (!orgName || orgName.startsWith("#")) {
      skipped += 1;
      continue;
    }

    const [firstName, ...rest] = contactName.split(/\s+/);
    const lastName = rest.join(" ") || "—";
    const jobTitle = (cols[3] ?? "").trim() || null;
    const phone = (cols[4] ?? "").trim() || null;
    const email = (cols[5] ?? "").trim() || null;
    const source = mapExcelSource(cols[6] ?? "");
    const stage = mapExcelStatus(cols[8] ?? "");
    const lastAction = (cols[9] ?? "").trim() || null;
    const nextAction = (cols[10] ?? "").trim() || null;
    const followUpRaw = (cols[11] ?? "").trim();
    const offerLabel = (cols[12] ?? "").trim() || null;
    const notes = (cols[14] ?? "").trim() || null;

    let followUpAt: Date | null = null;
    if (followUpRaw && /^\d{2}\/\d{2}\/\d{4}$/.test(followUpRaw)) {
      const [d, m, y] = followUpRaw.split("/").map(Number);
      followUpAt = new Date(y!, m! - 1, d!);
    }

    const org = await prisma.crmOrganization.create({
      data: {
        name: orgName,
        normalizedName: normalizeOrgName(orgName),
        source,
        notes,
        ownerId: actor.id,
        createdById: actor.id,
        contacts: {
          create: {
            firstName: firstName || "—",
            lastName,
            jobTitle,
            phone: phone === "//" ? null : phone,
            email: email === "//" ? null : email,
            isPrimary: true,
          },
        },
      },
    });

    const deal = await prisma.crmOpportunity.create({
      data: {
        organizationId: org.id,
        title: orgName,
        stage,
        source,
        offerLabel,
        nextAction,
        followUpAt,
        lastActivityAt: lastAction ? new Date() : null,
        ownerId: actor.id,
        createdById: actor.id,
        wonAt: stage === "GAGNE" ? new Date() : null,
        lostAt: stage === "PERDU" ? new Date() : null,
        lossReason: stage === "PERDU" ? CrmLossReason.AUTRE : null,
      },
    });

    if (lastAction) {
      await prisma.crmActivity.create({
        data: {
          organizationId: org.id,
          opportunityId: deal.id,
          type: CrmActivityType.NOTE,
          summary: lastAction,
          actorId: actor.id,
        },
      });
    }

    if (followUpAt) {
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

    imported += 1;
    if (imported >= 200) break; // garde-fou import
  }

  await writeAudit({
    actorId: actor.id,
    action: "crm.import",
    entityType: "crm",
    entityId: "csv",
    metadata: { imported, skipped },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/prospects");
  return {
    ok: true,
    message: `${imported} prospects importés (${skipped} ignorés)`,
    imported,
    skipped,
  };
}
