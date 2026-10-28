import { CrmTaskStatus, type PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type FollowUpDb = PrismaClient | Prisma.TransactionClient;

export type SyncFollowUpInput = {
  opportunityId: string;
  organizationId: string;
  assigneeId: string;
  createdById: string;
  nextAction: string | null;
  followUpAt: Date | null;
  /** Tâche à clôturer DONE avant sync (ex. Traiter). */
  completeTaskId?: string | null;
  /** Statut des OPEN supersédées (défaut DONE). */
  closeAs?: "DONE" | "CANCELLED";
  now?: Date;
};

export type SyncFollowUpPlan = {
  completeIds: string[];
  closeOtherIds: string[];
  closeAs: "DONE" | "CANCELLED";
  create: {
    title: string;
    dueAt: Date;
    assigneeId: string;
    createdById: string;
    organizationId: string;
    opportunityId: string;
  } | null;
  clearOpportunityFollowUp: boolean;
};

/**
 * Décide comment aligner les CrmTask OPEN sur nextAction / followUpAt.
 * Une seule OPEN cohérente ; sinon aucune si pas de date.
 */
export function planSyncFollowUpTasks(
  openTasks: { id: string }[],
  input: SyncFollowUpInput,
): SyncFollowUpPlan {
  const closeAs = input.closeAs ?? "DONE";
  const completeIds: string[] = [];
  if (
    input.completeTaskId &&
    openTasks.some((t) => t.id === input.completeTaskId)
  ) {
    completeIds.push(input.completeTaskId);
  }

  const remaining = openTasks.filter((t) => !completeIds.includes(t.id));

  if (!input.followUpAt || Number.isNaN(input.followUpAt.getTime())) {
    return {
      completeIds,
      closeOtherIds: remaining.map((t) => t.id),
      closeAs: closeAs === "DONE" ? "CANCELLED" : closeAs,
      create: null,
      clearOpportunityFollowUp: true,
    };
  }

  const title =
    (input.nextAction?.trim() || "").length > 0
      ? input.nextAction!.trim()
      : "Relance";

  return {
    completeIds,
    closeOtherIds: remaining.slice(1).map((t) => t.id),
    closeAs,
    create:
      remaining.length === 0
        ? {
            title,
            dueAt: input.followUpAt,
            assigneeId: input.assigneeId,
            createdById: input.createdById,
            organizationId: input.organizationId,
            opportunityId: input.opportunityId,
          }
        : null,
    clearOpportunityFollowUp: false,
  };
}

/** ID de la tâche OPEN à mettre à jour (première restante), ou null. */
export function planReuseOpenTaskId(
  openTasks: { id: string }[],
  completeTaskId?: string | null,
): string | null {
  const remaining = openTasks.filter((t) => t.id !== completeTaskId);
  return remaining[0]?.id ?? null;
}

/**
 * Aligne les tâches OPEN du deal sur followUpAt / nextAction.
 */
export async function syncOpportunityFollowUpTasks(
  db: FollowUpDb,
  input: SyncFollowUpInput,
  opts?: {
    updateOpportunity?: (data: {
      nextAction: string | null;
      followUpAt: Date | null;
    }) => Promise<unknown>;
  },
): Promise<{ reusedTaskId: string | null; created: boolean }> {
  const now = input.now ?? new Date();
  const openTasks = await db.crmTask.findMany({
    where: {
      opportunityId: input.opportunityId,
      status: CrmTaskStatus.OPEN,
    },
    select: { id: true },
    orderBy: { dueAt: "asc" },
  });

  const plan = planSyncFollowUpTasks(openTasks, input);
  const reuseId = planReuseOpenTaskId(openTasks, input.completeTaskId);

  for (const id of plan.completeIds) {
    await db.crmTask.update({
      where: { id },
      data: { status: CrmTaskStatus.DONE, completedAt: now },
    });
  }

  if (plan.closeOtherIds.length > 0) {
    await db.crmTask.updateMany({
      where: { id: { in: plan.closeOtherIds } },
      data: {
        status:
          plan.closeAs === "CANCELLED"
            ? CrmTaskStatus.CANCELLED
            : CrmTaskStatus.DONE,
        completedAt: now,
      },
    });
  }

  let created = false;
  let reusedTaskId: string | null = null;

  if (
    input.followUpAt &&
    !Number.isNaN(input.followUpAt.getTime()) &&
    reuseId
  ) {
    const title =
      (input.nextAction?.trim() || "").length > 0
        ? input.nextAction!.trim()
        : "Relance";
    await db.crmTask.update({
      where: { id: reuseId },
      data: {
        title,
        dueAt: input.followUpAt,
        assigneeId: input.assigneeId,
      },
    });
    reusedTaskId = reuseId;
  } else if (plan.create) {
    await db.crmTask.create({
      data: {
        organizationId: plan.create.organizationId,
        opportunityId: plan.create.opportunityId,
        title: plan.create.title,
        dueAt: plan.create.dueAt,
        assigneeId: plan.create.assigneeId,
        createdById: plan.create.createdById,
        status: CrmTaskStatus.OPEN,
      },
    });
    created = true;
  }

  if (opts?.updateOpportunity) {
    await opts.updateOpportunity({
      nextAction: input.nextAction,
      followUpAt:
        input.followUpAt && !Number.isNaN(input.followUpAt.getTime())
          ? input.followUpAt
          : null,
    });
  }

  return { reusedTaskId, created };
}
