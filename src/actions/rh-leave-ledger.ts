"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/auth";
import {
  createLeaveMovement,
  ensureOpeningBalance,
  LEAVE_SOURCE,
  syncLeaveBalanceFromLedger,
} from "@/lib/rh/leave-ledger";

/**
 * Régularisation RH manuelle (+/− jours) avec mouvement ADJUSTMENT.
 */
export async function adjustLeaveBalanceAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "rh.leave.validate")) {
    return { ok: false, error: "Permission refusée" };
  }

  const parsed = z
    .object({
      employeeId: z.string().min(8).max(40),
      days: z.number().min(-365).max(365),
      note: z.string().trim().min(3).max(500),
      effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    .safeParse({
      employeeId: formData.get("employeeId"),
      days: Number(formData.get("days")),
      note: formData.get("note"),
      effectiveDate: formData.get("effectiveDate") || undefined,
    });
  if (!parsed.success) {
    return { ok: false, error: "Données invalides (jours + motif ≥ 3 car.)" };
  }
  if (parsed.data.days === 0) {
    return { ok: false, error: "Indiquez un écart non nul" };
  }

  const emp = await prisma.rhEmployee.findUnique({
    where: { id: parsed.data.employeeId },
    select: { id: true },
  });
  if (!emp) return { ok: false, error: "Collaborateur introuvable" };

  const effectiveDate = parsed.data.effectiveDate
    ? new Date(`${parsed.data.effectiveDate}T00:00:00.000Z`)
    : new Date();

  await prisma.$transaction(async (tx) => {
    await ensureOpeningBalance(emp.id, tx);
    await createLeaveMovement(tx, {
      employeeId: emp.id,
      type: "ADJUSTMENT",
      days: parsed.data.days,
      effectiveDate,
      sourceType: LEAVE_SOURCE.ADJUSTMENT,
      sourceId: `${emp.id}:${Date.now()}`,
      note: parsed.data.note,
      createdById: user.id,
    });
    await syncLeaveBalanceFromLedger(emp.id, tx);
  });

  await writeAudit({
    actorId: user.id,
    action: "rh.leave.adjust",
    entityType: "RhEmployee",
    entityId: emp.id,
    metadata: { days: parsed.data.days, note: parsed.data.note },
  });

  revalidatePath("/rh");
  revalidatePath("/rh/conges");
  revalidatePath(`/rh/collaborateurs/${emp.id}`);
  revalidatePath("/espace/conges");
  return { ok: true, message: "Solde régularisé" };
}
