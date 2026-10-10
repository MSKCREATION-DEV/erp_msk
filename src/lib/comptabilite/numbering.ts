import { prisma } from "@/lib/prisma";

/** Numéro pièce : {JOURNAL}-{YYYY}-{####} */
export async function nextCptEntryNumber(
  journalCode: string,
  year: number,
): Promise<string> {
  const prefix = `${journalCode.toUpperCase()}-${year}-`;
  const last = await prisma.cptEntry.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  let seq = 1;
  if (last?.number) {
    const part = last.number.slice(prefix.length);
    const n = Number.parseInt(part, 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}
