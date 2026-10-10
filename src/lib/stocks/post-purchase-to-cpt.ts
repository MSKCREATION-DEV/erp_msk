import { prisma } from "@/lib/prisma";
import { nextCptEntryNumber } from "@/lib/comptabilite/numbering";

/** Proposition écriture AC : Dr 601 / Cr 4011 (brouillon). */
export async function postPurchaseToCpt(opts: {
  actorId: string;
  purchaseId: string;
  label: string;
  entryDate: Date;
  amountXof: number;
}): Promise<{ entryId: string; number: string } | null> {
  if (opts.amountXof <= 0) return null;

  const [journal, acc601, acc4011] = await Promise.all([
    prisma.cptJournal.findUnique({ where: { code: "AC" } }),
    prisma.cptAccount.findUnique({ where: { code: "601" } }),
    prisma.cptAccount.findUnique({ where: { code: "4011" } }),
  ]);
  if (!journal || !acc601 || !acc4011) {
    console.warn("postPurchaseToCpt: journal AC / comptes 601/4011 manquants");
    return null;
  }

  const year = opts.entryDate.getFullYear();
  const month = opts.entryDate.getMonth() + 1;
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

  const number = await nextCptEntryNumber("AC", year);
  const entry = await prisma.cptEntry.create({
    data: {
      number,
      journalId: journal.id,
      periodId: period.id,
      entryDate: opts.entryDate,
      label: opts.label,
      status: "DRAFT",
      sourceType: "StkPurchase",
      sourceId: opts.purchaseId,
      createdById: opts.actorId,
      lines: {
        create: [
          {
            accountId: acc601.id,
            label: "Achats",
            debit: opts.amountXof,
            credit: 0,
            sortOrder: 0,
          },
          {
            accountId: acc4011.id,
            label: "Fournisseurs",
            debit: 0,
            credit: opts.amountXof,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  return { entryId: entry.id, number };
}
