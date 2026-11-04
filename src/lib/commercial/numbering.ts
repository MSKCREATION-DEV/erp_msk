import type { ComDocKind, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { allocateOfficialNumber } from "@/lib/document-numbering/allocate";
import type { DocNumberKind } from "@/lib/document-numbering/kinds";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

function toDocKind(kind: ComDocKind): DocNumberKind {
  if (kind === "DEVIS") return "DEVIS";
  if (kind === "FACTURE") return "FACTURE";
  if (kind === "AVOIR") return "AVOIR";
  if (kind === "BDC") return "BDC";
  throw new Error(`Unsupported ComDocKind: ${kind}`);
}

/**
 * Alloue un numéro officiel (FAC|DEV|AVO|BDC-YYYYMMDD-XXXX).
 * `year` est ignoré (compat Phase 3) — la période est le jour d’émission.
 */
export async function nextComNumber(
  kind: ComDocKind,
  _year = new Date().getFullYear(),
  db: Tx = prisma,
): Promise<string> {
  return allocateOfficialNumber({
    kind: toDocKind(kind),
    db,
  });
}
