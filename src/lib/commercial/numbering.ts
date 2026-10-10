import type { ComDocKind, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/** DEV-2026-0001 / FAC-2026-0001 — séquence transactionnelle. */
export async function nextComNumber(
  kind: ComDocKind,
  year = new Date().getFullYear(),
  db: Tx = prisma,
): Promise<string> {
  const prefix = kind === "DEVIS" ? "DEV" : "FAC";

  const seq = await db.comNumberSequence.upsert({
    where: { kind_year: { kind, year } },
    create: { kind, year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });

  const n = String(seq.lastValue).padStart(4, "0");
  return `${prefix}-${year}-${n}`;
}
