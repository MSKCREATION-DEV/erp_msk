"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/auth";
import { calculatePayslip } from "@/lib/paie/calc";
import {
  DEFAULT_INPS_RATES,
  INPS_PROVISIONAL_NOTE,
  type InpsRateLine,
} from "@/lib/paie/rates";
import { postPayslipToCpt } from "@/lib/paie/post-to-cpt";
import { generateFichePaiePdf } from "@/lib/pdf/rh";
import { formatDateFr } from "@/lib/pdf/winansi";
import { uploadGedObject } from "@/lib/ged/storage";
import { ensureCollaboratorSubfolder } from "@/lib/ged/tree";
import { RH_DOC } from "@/lib/rh/docs";
import { CONTRACT_TYPE_LABEL } from "@/lib/rh/labels";

const cuidSchema = z.string().min(8).max(40);

function revalidatePaie(periodId?: string) {
  revalidatePath("/rh");
  revalidatePath("/rh/paie");
  revalidatePath("/rh/inps");
  revalidatePath("/espace/bulletins");
  revalidatePath("/espace/documents");
  if (periodId) revalidatePath(`/rh/paie/${periodId}`);
}

async function getActiveRates(): Promise<InpsRateLine[]> {
  const row = await prisma.rhInpsSettings.findFirst({
    orderBy: { effectiveFrom: "desc" },
  });
  if (!row) return DEFAULT_INPS_RATES;
  const rates = row.ratesJson as InpsRateLine[];
  return Array.isArray(rates) && rates.length ? rates : DEFAULT_INPS_RATES;
}

export async function openPayrollPeriodAction(
  formData: FormData,
): Promise<ActionResult & { periodId?: string }> {
  const actor = await requireUser();
  if (!hasPermission(actor, "rh.payroll.run")) {
    return { ok: false, error: "Permission refusée" };
  }
  const year = z.coerce.number().int().min(2020).max(2100).safeParse(formData.get("year"));
  const month = z.coerce.number().int().min(1).max(12).safeParse(formData.get("month"));
  if (!year.success || !month.success) {
    return { ok: false, error: "Période invalide" };
  }

  const existing = await prisma.rhPayrollPeriod.findUnique({
    where: { year_month: { year: year.data, month: month.data } },
  });
  if (existing) {
    return { ok: false, error: "Cette période existe déjà", periodId: existing.id };
  }

  // Seed settings si absent
  const settingsCount = await prisma.rhInpsSettings.count();
  if (settingsCount === 0) {
    await prisma.rhInpsSettings.create({
      data: {
        effectiveFrom: new Date(`${year.data}-01-01`),
        ratesJson: DEFAULT_INPS_RATES,
        note: INPS_PROVISIONAL_NOTE,
      },
    });
  }

  const period = await prisma.rhPayrollPeriod.create({
    data: {
      year: year.data,
      month: month.data,
      status: "OPEN",
      openedById: actor.id,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "rh.payroll.open",
    entityType: "RhPayrollPeriod",
    entityId: period.id,
    metadata: { year: year.data, month: month.data },
  });

  revalidatePaie(period.id);
  return { ok: true, periodId: period.id, message: "Période ouverte" };
}

export async function calculatePayrollAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  if (!hasPermission(actor, "rh.payroll.run")) {
    return { ok: false, error: "Permission refusée" };
  }
  const id = cuidSchema.safeParse(formData.get("periodId"));
  if (!id.success) return { ok: false, error: "Période manquante" };

  const period = await prisma.rhPayrollPeriod.findUnique({
    where: { id: id.data },
  });
  if (!period) return { ok: false, error: "Période introuvable" };
  if (period.status === "APPROVED" || period.status === "CLOSED") {
    return { ok: false, error: "Période verrouillée" };
  }

  const rates = await getActiveRates();
  const contracts = await prisma.rhContract.findMany({
    where: {
      status: "ACTIVE",
      type: { in: ["CDI", "CDD", "STAGE"] },
      salaryXof: { gt: 0 },
      employee: { status: "ACTIVE" },
    },
    include: {
      employee: true,
    },
  });

  let count = 0;
  for (const c of contracts) {
    const calc = calculatePayslip({
      baseSalaryXof: c.salaryXof ?? 0,
      primesXof: 0,
      rates,
    });

    const slip = await prisma.rhPayslip.upsert({
      where: {
        periodId_employeeId: {
          periodId: period.id,
          employeeId: c.employeeId,
        },
      },
      create: {
        periodId: period.id,
        employeeId: c.employeeId,
        contractId: c.id,
        status: "CALCULATED",
        baseSalaryXof: calc.baseSalaryXof,
        primesXof: calc.primesXof,
        brutXof: calc.brutXof,
        employeeDeductXof: calc.employeeDeductXof,
        employerChargesXof: calc.employerChargesXof,
        netXof: calc.netXof,
        lines: {
          create: calc.lines.map((l, i) => ({
            code: l.code,
            label: l.label,
            kind: l.kind,
            rate: l.rate,
            amountXof: l.amountXof,
            sortOrder: i,
          })),
        },
      },
      update: {
        contractId: c.id,
        status: "CALCULATED",
        baseSalaryXof: calc.baseSalaryXof,
        primesXof: calc.primesXof,
        brutXof: calc.brutXof,
        employeeDeductXof: calc.employeeDeductXof,
        employerChargesXof: calc.employerChargesXof,
        netXof: calc.netXof,
        lines: {
          deleteMany: {},
          create: calc.lines.map((l, i) => ({
            code: l.code,
            label: l.label,
            kind: l.kind,
            rate: l.rate,
            amountXof: l.amountXof,
            sortOrder: i,
          })),
        },
      },
    });

    await prisma.rhInpsLine.upsert({
      where: {
        periodId_employeeId: {
          periodId: period.id,
          employeeId: c.employeeId,
        },
      },
      create: {
        periodId: period.id,
        employeeId: c.employeeId,
        payslipId: slip.id,
        baseAmountXof: calc.brutXof,
        employeeContributionXof: calc.employeeDeductXof,
        employerContributionXof: calc.employerChargesXof,
        status: "CALCULATED",
      },
      update: {
        payslipId: slip.id,
        baseAmountXof: calc.brutXof,
        employeeContributionXof: calc.employeeDeductXof,
        employerContributionXof: calc.employerChargesXof,
        status: "CALCULATED",
      },
    });
    count += 1;
  }

  await prisma.rhPayrollPeriod.update({
    where: { id: period.id },
    data: { status: "CALCULATED" },
  });

  await writeAudit({
    actorId: actor.id,
    action: "rh.payroll.calculate",
    entityType: "RhPayrollPeriod",
    entityId: period.id,
    metadata: { slips: count },
  });

  revalidatePaie(period.id);
  return {
    ok: true,
    message: `${count} bulletin(s) calculé(s)`,
  };
}

export async function updatePayslipPrimesAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  if (!hasPermission(actor, "rh.payroll.run")) {
    return { ok: false, error: "Permission refusée" };
  }
  const id = cuidSchema.safeParse(formData.get("payslipId"));
  const primes = z.coerce.number().int().min(0).safeParse(formData.get("primesXof"));
  if (!id.success || !primes.success) {
    return { ok: false, error: "Données invalides" };
  }

  const slip = await prisma.rhPayslip.findUnique({
    where: { id: id.data },
    include: { period: true },
  });
  if (!slip) return { ok: false, error: "Bulletin introuvable" };
  if (slip.period.status === "APPROVED" || slip.period.status === "CLOSED") {
    return { ok: false, error: "Période verrouillée" };
  }

  const rates = await getActiveRates();
  const calc = calculatePayslip({
    baseSalaryXof: slip.baseSalaryXof,
    primesXof: primes.data,
    rates,
  });

  await prisma.rhPayslip.update({
    where: { id: slip.id },
    data: {
      primesXof: calc.primesXof,
      brutXof: calc.brutXof,
      employeeDeductXof: calc.employeeDeductXof,
      employerChargesXof: calc.employerChargesXof,
      netXof: calc.netXof,
      status: "CALCULATED",
      lines: {
        deleteMany: {},
        create: calc.lines.map((l, i) => ({
          code: l.code,
          label: l.label,
          kind: l.kind,
          rate: l.rate,
          amountXof: l.amountXof,
          sortOrder: i,
        })),
      },
    },
  });

  await prisma.rhInpsLine.updateMany({
    where: { payslipId: slip.id },
    data: {
      baseAmountXof: calc.brutXof,
      employeeContributionXof: calc.employeeDeductXof,
      employerContributionXof: calc.employerChargesXof,
      status: "CALCULATED",
    },
  });

  revalidatePaie(slip.periodId);
  return { ok: true, message: "Primes mises à jour" };
}

export async function approvePayrollAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  if (!hasPermission(actor, "rh.payroll.approve")) {
    return { ok: false, error: "Permission refusée" };
  }
  const id = cuidSchema.safeParse(formData.get("periodId"));
  if (!id.success) return { ok: false, error: "Période manquante" };

  const period = await prisma.rhPayrollPeriod.findUnique({
    where: { id: id.data },
    include: {
      slips: {
        include: { employee: true },
      },
    },
  });
  if (!period) return { ok: false, error: "Période introuvable" };
  if (period.status !== "CALCULATED" && period.status !== "OPEN") {
    return { ok: false, error: "Calculer la paie avant approbation" };
  }
  if (period.slips.length === 0) {
    return { ok: false, error: "Aucun bulletin — lancer le calcul" };
  }

  const entryDate = new Date(period.year, period.month - 1, 28);
  let posted = 0;

  for (const slip of period.slips) {
    if (slip.status === "APPROVED" || slip.status === "PAID") continue;

    let cptEntryId = slip.cptEntryId;
    if (!cptEntryId) {
      const { entryId } = await postPayslipToCpt({
        actorId: actor.id,
        payslipId: slip.id,
        label: `Paie ${String(period.month).padStart(2, "0")}/${period.year} — ${slip.employee.lastName} ${slip.employee.firstName}`,
        entryDate,
        brutXof: slip.brutXof,
        netXof: slip.netXof,
        employeeDeductXof: slip.employeeDeductXof,
        employerChargesXof: slip.employerChargesXof,
      });
      cptEntryId = entryId;
      posted += 1;
    }

    // PDF
    const periodStart = new Date(period.year, period.month - 1, 1);
    const periodEnd = new Date(period.year, period.month, 0);
    const pdfBytes = await generateFichePaiePdf({
      employee: {
        firstName: slip.employee.firstName,
        lastName: slip.employee.lastName,
        email: slip.employee.email ?? undefined,
        jobTitle: slip.employee.jobTitle ?? undefined,
      },
      periodStart: formatDateFr(periodStart),
      periodEnd: formatDateFr(periodEnd),
      baseSalaryXof: slip.baseSalaryXof,
      netSalaryXof: slip.netXof,
      leaveBalanceDays: Number(slip.employee.leaveBalanceDays),
      contractTypeLabel: slip.contractId
        ? undefined
        : CONTRACT_TYPE_LABEL.CDI,
    });

    const folder = await ensureCollaboratorSubfolder(
      slip.employee.firstName,
      slip.employee.lastName,
      "03_PAIE",
      period.year,
      actor.id,
    );
    const fileName = `PAIE_${slip.employee.lastName}_${slip.employee.firstName}_${period.year}-${String(period.month).padStart(2, "0")}.pdf`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_");
    const storagePath = `${folder.path.replace(/^\//, "")}/${fileName}`;
    await uploadGedObject(storagePath, pdfBytes, "application/pdf", {
      upsert: true,
    });
    const checksum = createHash("sha256").update(pdfBytes).digest("hex");
    const doc = await prisma.document.create({
      data: {
        folderId: folder.id,
        storagePath,
        originalName: fileName,
        mime: "application/pdf",
        size: pdfBytes.byteLength,
        checksum,
        createdById: actor.id,
        links: {
          create: {
            entityType: RH_DOC.FICHE_PAIE,
            entityId: slip.employeeId,
          },
        },
      },
    });

    await prisma.rhPayslip.update({
      where: { id: slip.id },
      data: {
        status: "APPROVED",
        cptEntryId,
        gedDocumentId: doc.id,
      },
    });
  }

  await prisma.rhInpsLine.updateMany({
    where: { periodId: period.id },
    data: { status: "CALCULATED" },
  });

  await prisma.rhPayrollPeriod.update({
    where: { id: period.id },
    data: {
      status: "APPROVED",
      approvedById: actor.id,
      approvedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "rh.payroll.approve",
    entityType: "RhPayrollPeriod",
    entityId: period.id,
    metadata: { posted },
  });

  revalidatePaie(period.id);
  revalidatePath("/comptabilite/ecritures");
  return {
    ok: true,
    message: `Paie approuvée — ${posted} écriture(s) PA, PDF classés`,
  };
}

export async function markInpsDeclaredAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  if (!hasPermission(actor, "rh.inps.manage")) {
    return { ok: false, error: "Permission refusée" };
  }
  const id = cuidSchema.safeParse(formData.get("periodId"));
  if (!id.success) return { ok: false, error: "Période manquante" };

  await prisma.rhInpsLine.updateMany({
    where: { periodId: id.data, status: "CALCULATED" },
    data: { status: "DECLARED", declaredAt: new Date() },
  });
  revalidatePaie(id.data);
  revalidatePath("/rh/inps");
  return { ok: true, message: "Cotisations marquées déclarées" };
}
