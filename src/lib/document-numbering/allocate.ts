import type { PrismaClient } from "@/generated/prisma/client";
import { createId } from "@/lib/document-numbering/id";
import {
  formatOfficialNumber,
  periodKeyFromDate,
  yearPeriodKeyFromDate,
} from "./format";
import type { DocNumberKind } from "./kinds";
import { DOC_NUMBER_PREFIX, YEARLY_DOC_NUMBER_KINDS } from "./kinds";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const KIND_TO_ENUM: Record<DocNumberKind, string> = {
  DEVIS: "DEVIS",
  FACTURE: "FACTURE",
  AVOIR: "AVOIR",
  BDC: "BDC",
  CONTRAT: "CONTRAT",
};

/**
 * Alloue un numéro officiel de façon atomique (INSERT … ON CONFLICT DO UPDATE).
 * À appeler uniquement à l’émission — jamais pour un brouillon.
 */
export async function allocateOfficialNumber(params: {
  kind: DocNumberKind;
  at?: Date;
  db: Tx;
}): Promise<string> {
  const at = params.at ?? new Date();
  const yearly = YEARLY_DOC_NUMBER_KINDS.has(params.kind);
  const periodKey = yearly ? yearPeriodKeyFromDate(at) : periodKeyFromDate(at);
  const kind = KIND_TO_ENUM[params.kind];
  const id = createId();

  // Atomic upsert + increment — une seule requête, sûr sous concurrence.
  const rows = await params.db.$queryRaw<Array<{ lastValue: number }>>`
    INSERT INTO "com_number_sequences" ("id", "kind", "periodKey", "lastValue", "updatedAt")
    VALUES (${id}, ${kind}::"ComDocKind", ${periodKey}, 1, NOW())
    ON CONFLICT ("kind", "periodKey")
    DO UPDATE SET
      "lastValue" = "com_number_sequences"."lastValue" + 1,
      "updatedAt" = NOW()
    RETURNING "lastValue"
  `;

  const lastValue = rows[0]?.lastValue;
  if (!lastValue || lastValue < 1) {
    throw new Error(`Failed to allocate number for ${params.kind}/${periodKey}`);
  }

  return formatOfficialNumber({
    kind: params.kind,
    periodKey,
    sequence: lastValue,
    pad: yearly ? 3 : undefined,
  });
}

/** Préfixe court pour draftCode. */
export function draftPrefix(kind: DocNumberKind): string {
  return `DRF-${DOC_NUMBER_PREFIX[kind]}`;
}
