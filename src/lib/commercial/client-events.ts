import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Journal fiche client — aligné plan phases 4–5 (traçabilité métier). */
export const COM_CLIENT_EVENT = {
  CREATED: "CLIENT_CREATED",
  UPDATED: "CLIENT_UPDATED",
  CRM_CONVERTED: "CLIENT_FROM_CRM",
  CONTRACT_CREATED: "CONTRACT_CREATED",
  CONTRACT_SIGNED: "CONTRACT_SIGNED",
  CONTRACT_STATUS: "CONTRACT_STATUS",
  OWNER_CHANGED: "OWNER_CHANGED",
  QUOTE_CREATED: "QUOTE_CREATED",
  QUOTE_STATUS: "QUOTE_STATUS",
  INVOICE_CREATED: "INVOICE_CREATED",
  INVOICE_DRAFT_FROM_CONTRACT: "INVOICE_DRAFT_FROM_CONTRACT",
  INVOICE_ISSUED: "INVOICE_ISSUED",
  PAYMENT_RECORDED: "PAYMENT_RECORDED",
} as const;

export type ComClientEventType =
  (typeof COM_CLIENT_EVENT)[keyof typeof COM_CLIENT_EVENT];

type LogOpts = {
  clientId: string;
  actorId: string;
  type: ComClientEventType;
  summary: string;
  entityType?: string | null;
  entityId?: string | null;
  metaJson?: Prisma.InputJsonValue | null;
};

export async function logComClientEvent(
  opts: LogOpts,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const db = tx ?? prisma;
  await db.comClientEvent.create({
    data: {
      clientId: opts.clientId,
      actorId: opts.actorId,
      type: opts.type,
      summary: opts.summary,
      entityType: opts.entityType ?? null,
      entityId: opts.entityId ?? null,
      metaJson: opts.metaJson ?? undefined,
    },
  });
}
