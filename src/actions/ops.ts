"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { OpsTicketPriority, OpsTicketStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

type ActionResult = { ok: boolean; error?: string; message?: string; id?: string };

function revalidateOps(id?: string) {
  revalidatePath("/ops/anomalies");
  if (id) revalidatePath(`/ops/anomalies/${id}`);
}

export async function createTicketAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (
    !hasPermission(user, "ops.ticket.create") &&
    !hasPermission(user, "ops.ticket.manage")
  ) {
    return { ok: false, error: "Permission refusée" };
  }

  const parsed = z
    .object({
      equipment: z.string().trim().min(1).max(200),
      problem: z.string().trim().min(1).max(2000),
      priority: z.nativeEnum(OpsTicketPriority).default("MEDIUM"),
      actionPlan: z.string().trim().max(2000).optional(),
      observations: z.string().trim().max(2000).optional(),
      assignedToId: z.string().uuid().optional().or(z.literal("")),
    })
    .safeParse({
      equipment: formData.get("equipment"),
      problem: formData.get("problem"),
      priority: formData.get("priority") || "MEDIUM",
      actionPlan: String(formData.get("actionPlan") ?? "").trim() || undefined,
      observations:
        String(formData.get("observations") ?? "").trim() || undefined,
      assignedToId: String(formData.get("assignedToId") ?? "").trim() || undefined,
    });
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const ticket = await prisma.opsTicket.create({
    data: {
      equipment: parsed.data.equipment,
      problem: parsed.data.problem,
      priority: parsed.data.priority,
      actionPlan: parsed.data.actionPlan ?? null,
      observations: parsed.data.observations ?? null,
      assignedToId: parsed.data.assignedToId || null,
      createdById: user.id,
    },
  });
  await writeAudit({
    actorId: user.id,
    action: "ops.ticket.create",
    entityType: "OpsTicket",
    entityId: ticket.id,
  });
  revalidateOps(ticket.id);
  return { ok: true, id: ticket.id, message: "Anomalie enregistrée" };
}

export async function updateTicketAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "ops.ticket.manage")) {
    return { ok: false, error: "Permission refusée" };
  }
  const id = z.string().cuid().safeParse(formData.get("ticketId"));
  if (!id.success) return { ok: false, error: "Ticket manquant" };

  const status = z.nativeEnum(OpsTicketStatus).optional().safeParse(
    formData.get("status") || undefined,
  );
  const priority = z.nativeEnum(OpsTicketPriority).optional().safeParse(
    formData.get("priority") || undefined,
  );
  const assignedToId = String(formData.get("assignedToId") ?? "").trim();
  const actionPlan = String(formData.get("actionPlan") ?? "").trim() || null;
  const observations =
    String(formData.get("observations") ?? "").trim() || null;

  await prisma.opsTicket.update({
    where: { id: id.data },
    data: {
      ...(status.success && status.data ? { status: status.data } : {}),
      ...(priority.success && priority.data ? { priority: priority.data } : {}),
      assignedToId: assignedToId ? assignedToId : null,
      actionPlan,
      observations,
    },
  });
  revalidateOps(id.data);
  return { ok: true, message: "Ticket mis à jour" };
}
