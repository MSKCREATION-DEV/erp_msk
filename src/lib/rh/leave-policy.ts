/** Politique congés MSK — calculs purs (Code du travail Mali L.148–L.154 + params MSK). */

export type LeavePolicyConfig = {
  /** Jours acquis par mois de service effectif (L.151). */
  monthlyAccrualDays: number;
  /** Mois de service avant jouissance (L.148) — 12 par défaut. */
  enjoymentAfterMonths: number;
  /** Si true, l’acquisition démarre dès l’embauche (solde peut croître avant jouissance). */
  accrueFromHire: boolean;
  /** Prorata calendaire le mois d’embauche. */
  prorataFirstMonth: boolean;
};

export const DEFAULT_LEAVE_POLICY: LeavePolicyConfig = {
  monthlyAccrualDays: 2.5,
  enjoymentAfterMonths: 12,
  accrueFromHire: true,
  prorataFirstMonth: true,
};

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** Fraction du mois travaillée (embauche jour D → fin de mois). */
export function monthWorkedFraction(
  hireDate: Date,
  year: number,
  month1to12: number,
): number {
  const hireY = hireDate.getUTCFullYear();
  const hireM = hireDate.getUTCMonth() + 1;
  if (year < hireY || (year === hireY && month1to12 < hireM)) return 0;
  if (year === hireY && month1to12 === hireM) {
    const dim = daysInMonth(year, month1to12);
    const day = hireDate.getUTCDate();
    return Math.max(0, (dim - day + 1) / dim);
  }
  return 1;
}

export function monthsOfService(hireDate: Date, asOf: Date): number {
  let months =
    (asOf.getUTCFullYear() - hireDate.getUTCFullYear()) * 12 +
    (asOf.getUTCMonth() - hireDate.getUTCMonth());
  if (asOf.getUTCDate() < hireDate.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function canEnjoyLeave(
  hireDate: Date,
  asOf: Date,
  policy: LeavePolicyConfig = DEFAULT_LEAVE_POLICY,
): boolean {
  return monthsOfService(hireDate, asOf) >= policy.enjoymentAfterMonths;
}

/**
 * Crédit d’acquisition pour un mois civil donné.
 * Retourne 0 si hors période ou policy sans accrual.
 */
export function accrualForMonth(
  hireDate: Date | null,
  year: number,
  month1to12: number,
  policy: LeavePolicyConfig = DEFAULT_LEAVE_POLICY,
  eligible = true,
): number {
  if (!eligible || !hireDate) return 0;
  if (!policy.accrueFromHire) return 0;

  const fraction = monthWorkedFraction(hireDate, year, month1to12);
  if (fraction <= 0) return 0;

  if (!policy.prorataFirstMonth && fraction < 1) {
    return 0;
  }

  const raw = policy.monthlyAccrualDays * fraction;
  return Math.round(raw * 100) / 100;
}

/** Bonus ancienneté L.154 (jours ouvrables / an) — 0 si sous les seuils. */
export function seniorityBonusDays(monthsOfSvc: number): number {
  const years = monthsOfSvc / 12;
  if (years >= 25) return 6;
  if (years >= 20) return 4;
  if (years >= 15) return 2;
  return 0;
}

export function sumMovements(
  movements: Array<{ days: number | string }>,
): number {
  const total = movements.reduce((acc, m) => acc + Number(m.days), 0);
  return Math.round(total * 100) / 100;
}
