import { prisma } from "@/lib/prisma";

/** Taux EUR→XOF le plus récent ≤ date (défaut 655.957). */
export async function getEurXofRate(asOf: Date = new Date()): Promise<number> {
  const row = await prisma.cptFxRate.findFirst({
    where: {
      pair: "EUR/XOF",
      validFrom: { lte: asOf },
    },
    orderBy: { validFrom: "desc" },
  });
  if (!row) return 655.957;
  return Number(row.rate);
}

export function convertEurToXof(amountEur: number, rate: number): number {
  return Math.round(amountEur * rate);
}
