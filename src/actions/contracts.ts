"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ComContractStatus, ComQuoteStatus } from "@/generated/prisma/client";
import type { ActionResult } from "@/actions/auth";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import {
  buildContractLinesFromQuote,
  nextContractReference,
} from "@/lib/commercial/contract-from-quote";
import { canAccessOwned } from "@/lib/commercial/scope";
import { prisma } from "@/lib/prisma";

function revalidateContractPaths(paths: string[]) {
  for (const p of paths) revalidatePath(p);
  revalidatePath("/commercial");
  revalidatePath("/commercial/contrats");
}

/**
 * Transforme un devis accepté en contrat avec snapshot des lignes.
 */
export async function createContractFromQuoteAction(
  formData: FormData,
): Promise<ActionResult & { contractId?: string }> {
  const actor = await requireUser({ permission: "com.contrats.manage" });
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  const startRaw = String(formData.get("startDate") ?? "").trim();
  const billingDayRaw = Number.parseInt(
    String(formData.get("billingDay") ?? "5"),
    10,
  );
  const title = String(formData.get("title") ?? "").trim() || null;

  if (!quoteId) return { ok: false, error: "Devis manquant" };

  const quote = await prisma.comQuote.findUnique({
    where: { id: quoteId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) return { ok: false, error: "Devis introuvable" };
  if (!canAccessOwned(actor, quote.ownerId)) {
    return { ok: false, error: "Hors périmètre" };
  }
  if (quote.status !== ComQuoteStatus.ACCEPTE) {
    return { ok: false, error: "Le devis doit être accepté" };
  }

  const existing = await prisma.comContract.findFirst({
    where: { quoteId: quote.id },
    select: { id: true },
  });
  if (existing) {
    redirect(`/commercial/contrats/${existing.id}`);
  }

  const startDate = startRaw ? new Date(startRaw) : new Date();
  const startOk = Number.isNaN(startDate.getTime()) ? new Date() : startDate;
  const billingDay = Number.isFinite(billingDayRaw)
    ? Math.min(28, Math.max(1, billingDayRaw))
    : 5;

  const lineData = buildContractLinesFromQuote(
    quote.lines.map((l) => ({
      id: l.id,
      label: l.label,
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
      catalogOfferId: l.catalogOfferId,
      isTravel: l.isTravel,
      sortOrder: l.sortOrder,
    })),
    startOk,
  );

  let contractId: string;
  try {
    const contract = await prisma.$transaction(async (tx) => {
      const count = await tx.comContract.count();
      const reference = nextContractReference(count + 1);
      return tx.comContract.create({
        data: {
          reference,
          status: ComContractStatus.ACTIF,
          title: title ?? quote.object,
          regime: quote.regime,
          currency: quote.currency,
          vatEnabled: quote.vatEnabled,
          vatRate: quote.vatRate,
          billingDay,
          startDate: startOk,
          clientId: quote.clientId,
          quoteId: quote.id,
          ownerId: actor.id,
          createdById: actor.id,
          signedAt: new Date(),
          lines: { create: lineData },
        },
      });
    });
    contractId = contract.id;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec création contrat",
    };
  }

  await prisma.comClientEvent.create({
    data: {
      clientId: quote.clientId,
      type: "CONTRACT_SIGNED",
      summary: `Contrat créé depuis devis ${quote.number ?? quote.draftCode}`,
      entityType: "com_contract",
      entityId: contractId,
      actorId: actor.id,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.contract.from_quote",
    entityType: "com_contract",
    entityId: contractId,
    metadata: { quoteId },
  });

  revalidateContractPaths([
    `/commercial/contrats/${contractId}`,
    `/commercial/devis/${quoteId}`,
    `/commercial/clients/${quote.clientId}`,
  ]);
  redirect(`/commercial/contrats/${contractId}`);
}
