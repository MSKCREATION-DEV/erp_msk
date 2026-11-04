/** Période de facturation mensuelle calendaire (début inclus, fin exclusive). */

export function monthPeriod(at: Date = new Date()): {
  periodStart: Date;
  periodEnd: Date;
  label: string;
} {
  const y = at.getFullYear();
  const m = at.getMonth();
  const periodStart = new Date(y, m, 1, 0, 0, 0, 0);
  const periodEnd = new Date(y, m + 1, 1, 0, 0, 0, 0);
  const label = periodStart.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return { periodStart, periodEnd, label };
}

export function dueDateForBillingDay(
  periodEnd: Date,
  billingDay: number,
): Date {
  const day = Math.min(28, Math.max(1, billingDay));
  // Échéance = jour N du mois de la période (ou mois suivant si après fin)
  const y = periodEnd.getFullYear();
  const m = periodEnd.getMonth(); // déjà mois suivant (fin exclusive)
  // Utiliser le mois de periodStart = m-1
  const due = new Date(y, m - 1, day, 12, 0, 0, 0);
  return due;
}
