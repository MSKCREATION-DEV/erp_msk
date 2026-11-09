import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { computeClientFinancials } from "@/lib/billing/client-financials";
import type { ClientAccountRow } from "./client-accounts";

/**
 * Charge tous les clients COM (hors archivés) + leurs données de facturation
 * nécessaires au calcul `computeClientFinancials`. Mémoïsé par requête
 * (`react.cache`) — réutilisé par la liste et ses KPI sans double requête.
 *
 * Fichier séparé de `client-accounts.ts` (Prisma = server-only) : les
 * helpers purs de filtre/tri restent importables depuis un composant client
 * (ex. `clients-filter-modal.tsx`) sans entraîner `pg`/`prisma` dans le bundle.
 */
export const loadClientAccounts = cache(async (): Promise<ClientAccountRow[]> => {
  const clients = await prisma.comClient.findMany({
    where: { status: { not: "ARCHIVE" } },
    orderBy: { name: "asc" },
    take: 500,
    select: {
      id: true,
      name: true,
      status: true,
      contactName: true,
      email: true,
      phone: true,
      createdAt: true,
      owner: { select: { firstName: true, lastName: true } },
      invoices: {
        select: {
          id: true,
          status: true,
          totalTtc: true,
          amountPaid: true,
          dueDate: true,
          issuedAt: true,
          createdAt: true,
          allocations: {
            select: { paymentId: true, invoiceId: true, amount: true },
          },
          creditNotes: { select: { amount: true } },
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          paidAt: true,
          allocations: { select: { amount: true } },
        },
      },
    },
  });

  return clients.map((c) => {
    const fin = computeClientFinancials({
      invoices: c.invoices.map((inv) => ({
        id: inv.id,
        status: inv.status,
        totalTtc: inv.totalTtc,
        amountPaid: inv.amountPaid,
        dueDate: inv.dueDate,
        issuedAt: inv.issuedAt,
        createdAt: inv.createdAt,
        allocations: inv.allocations,
        creditNotesApplied: inv.creditNotes.reduce((s, n) => s + n.amount, 0),
      })),
      payments: c.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paidAt: p.paidAt,
        allocationsSum: p.allocations.reduce((s, a) => s + a.amount, 0),
      })),
    });
    return {
      client: {
        id: c.id,
        name: c.name,
        status: c.status,
        contactName: c.contactName,
        email: c.email,
        phone: c.phone,
        ownerName: `${c.owner.firstName} ${c.owner.lastName}`.trim(),
        createdAt: c.createdAt,
      },
      fin,
    };
  });
});
