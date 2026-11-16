/** Inventaire hard-delete prospect/client — safe client (pas Prisma). */

export type HardDeleteInventory = {
  label: string;
  /** Si true, la suppression est refusée (ex. prospect déjà client). */
  blocked?: boolean;
  blockReason?: string;
  /** Id client à utiliser si bloqué (lien fiche). */
  relatedClientId?: string | null;
  willDeleteOrganization: boolean;
  counts: {
    activities: number;
    tasks: number;
    appointments: number;
    offers: number;
    assignmentRequests: number;
    contacts: number;
    quotes: number;
    invoices: number;
    payments: number;
    contracts: number;
    creditNotes: number;
    clientEvents: number;
    gedDocuments: number;
    /** Opportunité source (suppression client). */
    sourceOpportunity: number;
  };
};

export function hardDeleteInventoryLines(
  inv: HardDeleteInventory,
): string[] {
  const c = inv.counts;
  const lines: string[] = [];
  const push = (n: number, one: string, many: string) => {
    if (n > 0) lines.push(`${n} ${n > 1 ? many : one}`);
  };
  push(c.activities, "activité journalisée", "activités journalisées");
  push(c.tasks, "relance / tâche", "relances / tâches");
  push(c.appointments, "rendez-vous", "rendez-vous");
  push(c.offers, "offre proposée", "offres proposées");
  push(
    c.assignmentRequests,
    "demande d’affectation",
    "demandes d’affectation",
  );
  push(c.contacts, "contact", "contacts");
  push(c.quotes, "devis", "devis");
  push(c.invoices, "facture", "factures");
  push(c.payments, "paiement", "paiements");
  push(c.contracts, "contrat", "contrats");
  push(c.creditNotes, "avoir", "avoirs");
  push(c.clientEvents, "événement client", "événements client");
  push(c.gedDocuments, "document GED", "documents GED");
  if (c.sourceOpportunity > 0) {
    lines.push("l’opportunité CRM source");
  }
  if (inv.willDeleteOrganization) {
    lines.push("l’entreprise CRM (plus aucun autre deal / client)");
  }
  return lines;
}

export function hardDeleteInventoryTotal(inv: HardDeleteInventory): number {
  const c = inv.counts;
  return (
    c.activities +
    c.tasks +
    c.appointments +
    c.offers +
    c.assignmentRequests +
    c.contacts +
    c.quotes +
    c.invoices +
    c.payments +
    c.contracts +
    c.creditNotes +
    c.clientEvents +
    c.gedDocuments +
    c.sourceOpportunity +
    (inv.willDeleteOrganization ? 1 : 0)
  );
}
