import { prisma } from "@/lib/prisma";
import type { CptAccountNature } from "@/generated/prisma/client";

/** Plafond de lignes GL pour éviter un dump illimité (UI + mémoire). */
const GL_LINE_CAP = 20_000;

export type GlRow = {
  accountCode: string;
  accountLabel: string;
  entryNumber: string;
  entryDate: Date;
  label: string;
  debit: number;
  credit: number;
};

export type BalanceRow = {
  accountCode: string;
  accountLabel: string;
  classNum: number;
  nature: CptAccountNature;
  debit: number;
  credit: number;
  solde: number;
};

function entryWhere(opts: {
  periodId?: string;
  year?: number;
}): {
  status: "VALIDATED";
  periodId?: string;
  period?: { exercise: { year: number } };
} {
  // Sans filtre explicite → exercice civil courant (évite un full-scan historique).
  const year =
    opts.year ??
    (opts.periodId ? undefined : new Date().getFullYear());
  return {
    status: "VALIDATED" as const,
    ...(opts.periodId ? { periodId: opts.periodId } : {}),
    ...(year != null ? { period: { exercise: { year } } } : {}),
  };
}

/** Grand livre : lignes validées, filtrées période / compte, plafonnées. */
export async function fetchGrandLivre(opts: {
  periodId?: string;
  accountId?: string;
  year?: number;
}): Promise<GlRow[]> {
  const lines = await prisma.cptEntryLine.findMany({
    where: {
      entry: entryWhere(opts),
      ...(opts.accountId ? { accountId: opts.accountId } : {}),
    },
    include: {
      account: { select: { code: true, label: true } },
      entry: { select: { number: true, entryDate: true, label: true } },
    },
    orderBy: [{ account: { code: "asc" } }, { entry: { entryDate: "asc" } }],
    take: GL_LINE_CAP,
  });

  return lines.map((l) => ({
    accountCode: l.account.code,
    accountLabel: l.account.label,
    entryNumber: l.entry.number,
    entryDate: l.entry.entryDate,
    label: l.label ?? l.entry.label,
    debit: l.debit,
    credit: l.credit,
  }));
}

/** Balance : agrégats SQL par compte (pas de chargement de toutes les lignes). */
export async function fetchTrialBalance(opts: {
  periodId?: string;
  year?: number;
}): Promise<BalanceRow[]> {
  const grouped = await prisma.cptEntryLine.groupBy({
    by: ["accountId"],
    where: {
      entry: entryWhere(opts),
    },
    _sum: { debit: true, credit: true },
  });

  if (grouped.length === 0) return [];

  const accounts = await prisma.cptAccount.findMany({
    where: { id: { in: grouped.map((g) => g.accountId) } },
    select: { id: true, code: true, label: true, classNum: true, nature: true },
  });
  const byId = new Map(accounts.map((a) => [a.id, a]));

  const rows: BalanceRow[] = [];
  for (const g of grouped) {
    const acc = byId.get(g.accountId);
    if (!acc) continue;
    const debit = g._sum.debit ?? 0;
    const credit = g._sum.credit ?? 0;
    rows.push({
      accountCode: acc.code,
      accountLabel: acc.label,
      classNum: acc.classNum,
      nature: acc.nature,
      debit,
      credit,
      solde: debit - credit,
    });
  }

  return rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

export type BilanCr = {
  actif: { code: string; label: string; amount: number }[];
  passif: { code: string; label: string; amount: number }[];
  charges: { code: string; label: string; amount: number }[];
  produits: { code: string; label: string; amount: number }[];
  totalActif: number;
  totalPassif: number;
  totalCharges: number;
  totalProduits: number;
  resultat: number;
};

/** Bilan / CR simplifiés depuis balance (écritures validées). */
export function buildBilanCr(balance: BalanceRow[]): BilanCr {
  const actif: BilanCr["actif"] = [];
  const passif: BilanCr["passif"] = [];
  const charges: BilanCr["charges"] = [];
  const produits: BilanCr["produits"] = [];

  for (const r of balance) {
    if (r.nature === "ASSET") {
      const amount = r.debit - r.credit;
      if (amount !== 0)
        actif.push({
          code: r.accountCode,
          label: r.accountLabel,
          amount,
        });
    } else if (r.nature === "LIABILITY" || r.nature === "EQUITY") {
      const amount = r.credit - r.debit;
      if (amount !== 0)
        passif.push({
          code: r.accountCode,
          label: r.accountLabel,
          amount,
        });
    } else if (r.nature === "EXPENSE") {
      const amount = r.debit - r.credit;
      if (amount !== 0)
        charges.push({
          code: r.accountCode,
          label: r.accountLabel,
          amount,
        });
    } else if (r.nature === "INCOME") {
      const amount = r.credit - r.debit;
      if (amount !== 0)
        produits.push({
          code: r.accountCode,
          label: r.accountLabel,
          amount,
        });
    }
  }

  const totalActif = actif.reduce((s, x) => s + x.amount, 0);
  const totalPassif = passif.reduce((s, x) => s + x.amount, 0);
  const totalCharges = charges.reduce((s, x) => s + x.amount, 0);
  const totalProduits = produits.reduce((s, x) => s + x.amount, 0);
  const resultat = totalProduits - totalCharges;

  return {
    actif,
    passif,
    charges,
    produits,
    totalActif,
    totalPassif,
    totalCharges,
    totalProduits,
    resultat,
  };
}

/** TVA collectée (crédits 4432) vs récupérable (débits 4452) sur période. */
export async function fetchTvaAssistee(opts: {
  periodId?: string;
  year?: number;
}) {
  const balance = await fetchTrialBalance(opts);
  const collected = balance.find((b) => b.accountCode === "4432");
  const deductible = balance.find((b) => b.accountCode === "4452");
  const collectee = collected ? collected.credit - collected.debit : 0;
  const deductibleAmt = deductible ? deductible.debit - deductible.credit : 0;
  return {
    collectee: Math.max(0, collectee),
    deductible: Math.max(0, deductibleAmt),
    nette: Math.max(0, collectee) - Math.max(0, deductibleAmt),
  };
}
