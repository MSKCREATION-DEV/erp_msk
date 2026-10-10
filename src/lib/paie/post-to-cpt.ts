import { prisma } from "@/lib/prisma";
import { nextCptEntryNumber } from "@/lib/comptabilite/numbering";

/**
 * Écriture PA pour un bulletin approuvé :
 * Dr 661 brut | Cr 421 net | Cr 4313 (retenues sal. + charges emp.)
 */
export async function postPayslipToCpt(opts: {
  actorId: string;
  payslipId: string;
  label: string;
  entryDate: Date;
  brutXof: number;
  netXof: number;
  employeeDeductXof: number;
  employerChargesXof: number;
}): Promise<{ entryId: string; number: string }> {
  // Dr 661 (brut + charges emp.) = Cr 421 (net) + Cr 4313 (sal. + emp.)
  const socialCredit = opts.employeeDeductXof + opts.employerChargesXof;
  const debit = opts.brutXof + opts.employerChargesXof;
  const credit = opts.netXof + socialCredit;
  if (debit !== credit) {
    throw new Error(`Écriture PA déséquilibrée (Dr ${debit} ≠ Cr ${credit})`);
  }

  const year = opts.entryDate.getFullYear();
  const month = opts.entryDate.getMonth() + 1;

  const [journal, acc661, acc421, acc4313] = await Promise.all([
    prisma.cptJournal.findUnique({ where: { code: "PA" } }),
    prisma.cptAccount.findUnique({ where: { code: "661" } }),
    prisma.cptAccount.findUnique({ where: { code: "421" } }),
    prisma.cptAccount.findUnique({ where: { code: "4313" } }),
  ]);

  if (!journal || !acc661 || !acc421 || !acc4313) {
    throw new Error("Comptes / journal PA manquants — relancer seed CPT");
  }

  let exercise = await prisma.cptExercise.findUnique({ where: { year } });
  if (!exercise) {
    exercise = await prisma.cptExercise.create({
      data: { year, status: "OPEN" },
    });
  }
  let period = await prisma.cptPeriod.findUnique({
    where: { exerciseId_month: { exerciseId: exercise.id, month } },
  });
  if (!period) {
    period = await prisma.cptPeriod.create({
      data: { exerciseId: exercise.id, month, status: "OPEN" },
    });
  }

  const number = await nextCptEntryNumber("PA", opts.entryDate.getFullYear());

  const entry = await prisma.cptEntry.create({
    data: {
      number,
      journalId: journal.id,
      periodId: period.id,
      entryDate: opts.entryDate,
      label: opts.label,
      status: "DRAFT",
      sourceType: "RhPayslip",
      sourceId: opts.payslipId,
      createdById: opts.actorId,
      lines: {
        create: [
          {
            accountId: acc661.id,
            label: "Remunerations + charges",
            debit: opts.brutXof + opts.employerChargesXof,
            credit: 0,
            sortOrder: 0,
          },
          {
            accountId: acc421.id,
            label: "Net a payer",
            debit: 0,
            credit: opts.netXof,
            sortOrder: 1,
          },
          {
            accountId: acc4313.id,
            label: "Cotisations sociales",
            debit: 0,
            credit: socialCredit,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  return { entryId: entry.id, number };
}
