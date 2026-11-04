/** Résumé liens prospect — safe client (pas Prisma runtime). */

export type ProspectLinkedSummary = {
  openTasks: number;
  scheduledAppointments: number;
  pendingAssignments: number;
  quotes: number;
  invoices: number;
  offers: number;
};

export function countLinkedEntities(s: ProspectLinkedSummary): number {
  return (
    s.openTasks +
    s.scheduledAppointments +
    s.pendingAssignments +
    s.quotes +
    s.invoices +
    s.offers
  );
}

export function linkedEntitiesLabels(s: ProspectLinkedSummary): string[] {
  const lines: string[] = [];
  if (s.openTasks > 0) {
    lines.push(
      `${s.openTasks} relance${s.openTasks > 1 ? "s" : ""} ouverte${s.openTasks > 1 ? "s" : ""}`,
    );
  }
  if (s.scheduledAppointments > 0) {
    lines.push(
      `${s.scheduledAppointments} RDV planifié${s.scheduledAppointments > 1 ? "s" : ""}`,
    );
  }
  if (s.pendingAssignments > 0) {
    lines.push(
      `${s.pendingAssignments} demande${s.pendingAssignments > 1 ? "s" : ""} d’affectation`,
    );
  }
  if (s.quotes > 0) {
    lines.push(`${s.quotes} devis lié${s.quotes > 1 ? "s" : ""}`);
  }
  if (s.invoices > 0) {
    lines.push(`${s.invoices} facture${s.invoices > 1 ? "s" : ""}`);
  }
  if (s.offers > 0) {
    lines.push(
      `${s.offers} offre${s.offers > 1 ? "s" : ""} proposée${s.offers > 1 ? "s" : ""}`,
    );
  }
  return lines;
}
