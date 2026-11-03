import type { Prisma, RhLeaveMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  accrualForMonth,
  DEFAULT_LEAVE_POLICY,
  sumMovements,
} from "@/lib/rh/leave-policy";
import { getRuleForType } from "@/lib/paie/contract-rules";

type Tx = Prisma.TransactionClient;

export const LEAVE_SOURCE = {
  OPENING: "RhLeaveOpening",
  ACCRUAL: "RhLeaveAccrual",
  REQUEST: "RhLeaveRequest",
  ADJUSTMENT: "RhLeaveAdjustment",
} as const;

export function accrualSourceId(
  employeeId: string,
  year: number,
  month1to12: number,
): string {
  return `${employeeId}:${year}-${String(month1to12).padStart(2, "0")}`;
}

export async function sumEmployeeLeaveBalance(
  employeeId: string,
  tx: Tx | typeof prisma = prisma,
): Promise<number> {
  const rows = await tx.rhLeaveMovement.findMany({
    where: { employeeId },
    select: { days: true },
  });
  return sumMovements(rows.map((r) => ({ days: Number(r.days) })));
}

/** Si aucun mouvement : fige le solde actuel comme OPENING_BALANCE. */
export async function ensureOpeningBalance(
  employeeId: string,
  tx: Tx,
): Promise<void> {
  const count = await tx.rhLeaveMovement.count({ where: { employeeId } });
  if (count > 0) return;

  const emp = await tx.rhEmployee.findUnique({
    where: { id: employeeId },
    select: { leaveBalanceDays: true, hireDate: true },
  });
  if (!emp) return;

  const bal = Number(emp.leaveBalanceDays);
  if (bal === 0) return;

  await tx.rhLeaveMovement.create({
    data: {
      employeeId,
      type: "OPENING_BALANCE",
      days: bal,
      effectiveDate: emp.hireDate ?? new Date(),
      sourceType: LEAVE_SOURCE.OPENING,
      sourceId: employeeId,
      note: "Solde initial (migration ledger)",
    },
  });
}

export async function createLeaveMovement(
  tx: Tx,
  input: {
    employeeId: string;
    type: RhLeaveMovementType;
    days: number;
    effectiveDate: Date;
    sourceType?: string;
    sourceId?: string;
    note?: string | null;
    createdById?: string | null;
  },
) {
  return tx.rhLeaveMovement.create({
    data: {
      employeeId: input.employeeId,
      type: input.type,
      days: input.days,
      effectiveDate: input.effectiveDate,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      note: input.note ?? null,
      createdById: input.createdById ?? null,
    },
  });
}

/** Après mouvement : aligne leaveBalanceDays sur la somme du ledger. */
export async function syncLeaveBalanceFromLedger(
  employeeId: string,
  tx: Tx,
): Promise<number> {
  const bal = await sumEmployeeLeaveBalance(employeeId, tx);
  await tx.rhEmployee.update({
    where: { id: employeeId },
    data: { leaveBalanceDays: bal },
  });
  return bal;
}

/**
 * Consommation CP à l’approbation (jours négatifs).
 * Prérequis : solde suffisant contrôlé par l’appelant / updateMany.
 */
export async function recordLeaveConsumption(
  tx: Tx,
  input: {
    employeeId: string;
    leaveRequestId: string;
    days: number;
    startDate: Date;
    createdById: string;
  },
): Promise<void> {
  await ensureOpeningBalance(input.employeeId, tx);

  const existing = await tx.rhLeaveMovement.findFirst({
    where: {
      sourceType: LEAVE_SOURCE.REQUEST,
      sourceId: input.leaveRequestId,
      type: "CONSUMPTION",
    },
  });
  if (existing) return;

  const need = Math.abs(Number(input.days));
  await createLeaveMovement(tx, {
    employeeId: input.employeeId,
    type: "CONSUMPTION",
    days: -need,
    effectiveDate: input.startDate,
    sourceType: LEAVE_SOURCE.REQUEST,
    sourceId: input.leaveRequestId,
    createdById: input.createdById,
    note: "Congés payés approuvés",
  });

  const updated = await tx.rhEmployee.updateMany({
    where: {
      id: input.employeeId,
      leaveBalanceDays: { gte: need },
    },
    data: { leaveBalanceDays: { decrement: need } },
  });
  if (updated.count !== 1) {
    throw new Error("SOLDE_INSUFFISANT");
  }
}

export type AccrualRunResult = {
  year: number;
  month: number;
  processed: number;
  accrued: number;
  skipped: number;
  totalDays: number;
};

/** Acquisition mensuelle pour tous les collaborateurs éligibles. */
export async function runMonthlyLeaveAccrual(
  year: number,
  month1to12: number,
): Promise<AccrualRunResult> {
  const employees = await prisma.rhEmployee.findMany({
    where: { status: { in: ["ACTIVE", "ONBOARDING"] } },
    select: {
      id: true,
      hireDate: true,
      leaveBalanceDays: true,
      contracts: {
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        take: 1,
        select: { type: true },
      },
    },
  });

  let processed = 0;
  let accrued = 0;
  let skipped = 0;
  let totalDays = 0;

  const effectiveDate = new Date(Date.UTC(year, month1to12, 0)); // dernier jour du mois

  for (const emp of employees) {
    processed += 1;
    const contract = emp.contracts[0];
    if (!contract) {
      skipped += 1;
      continue;
    }
    const rule = await getRuleForType(contract.type);
    if (!rule.active || !rule.accruePaidLeave) {
      skipped += 1;
      continue;
    }

    const days = accrualForMonth(
      emp.hireDate,
      year,
      month1to12,
      DEFAULT_LEAVE_POLICY,
      true,
    );
    if (days <= 0) {
      skipped += 1;
      continue;
    }

    const sourceId = accrualSourceId(emp.id, year, month1to12);
    const already = await prisma.rhLeaveMovement.findFirst({
      where: {
        employeeId: emp.id,
        sourceType: LEAVE_SOURCE.ACCRUAL,
        sourceId,
      },
      select: { id: true },
    });
    if (already) {
      skipped += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await ensureOpeningBalance(emp.id, tx);
      await createLeaveMovement(tx, {
        employeeId: emp.id,
        type: "ACCRUAL",
        days,
        effectiveDate,
        sourceType: LEAVE_SOURCE.ACCRUAL,
        sourceId,
        note: `Acquisition ${String(month1to12).padStart(2, "0")}/${year}`,
      });
      await tx.rhEmployee.update({
        where: { id: emp.id },
        data: { leaveBalanceDays: { increment: days } },
      });
    });

    accrued += 1;
    totalDays += days;
  }

  return {
    year,
    month: month1to12,
    processed,
    accrued,
    skipped,
    totalDays: Math.round(totalDays * 100) / 100,
  };
}

/** Mois civil précédent (UTC). */
export function previousUtcMonth(now = new Date()): {
  year: number;
  month: number;
} {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based
  if (m === 0) return { year: y - 1, month: 12 };
  return { year: y, month: m };
}

export const LEAVE_MOVEMENT_LABEL: Record<RhLeaveMovementType, string> = {
  OPENING_BALANCE: "Solde d’ouverture",
  ACCRUAL: "Acquisition mensuelle",
  CONSUMPTION: "Congé consommé",
  ADJUSTMENT: "Régularisation RH",
  CANCEL: "Annulation",
  SENIORITY_BONUS: "Bonus ancienneté",
};
