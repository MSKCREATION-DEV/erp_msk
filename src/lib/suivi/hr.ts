/**
 * Absences & retards Suivi (tampon) — helpers métier.
 * Isolé du module RH (`rh_absences` / congés) : flag congés = traçabilité seule.
 */

export const SV_ABSENCE_REASONS = [
  "MALADIE",
  "PERSONNEL",
  "AUTORISEE",
  "FORMATION",
  "AUTRE",
] as const;

export type SvAbsenceReasonCode = (typeof SV_ABSENCE_REASONS)[number];

export const SV_ABSENCE_STATUSES = [
  "ENREGISTREE",
  "JUSTIFIEE",
  "NON_JUSTIFIEE",
  "ANNULEE",
] as const;

export type SvAbsenceStatusCode = (typeof SV_ABSENCE_STATUSES)[number];

export const SV_LATE_STATUSES = ["ENREGISTRE", "ANNULE"] as const;

export type SvLateStatusCode = (typeof SV_LATE_STATUSES)[number];

/** Parse `YYYY-MM-DD` → Date UTC noon-safe (colonne @db.Date). */
export function parseSvDateOnly(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

/** Combine date `YYYY-MM-DD` + heure `HH:mm` → Date (UTC wall). */
export function combineSvDateTime(
  dateRaw: string,
  timeRaw: string,
): Date | null {
  const day = parseSvDateOnly(dateRaw);
  if (!day) return null;
  const tm = /^(\d{1,2}):(\d{2})$/.exec(timeRaw.trim());
  if (!tm) return null;
  const h = Number(tm[1]);
  const min = Number(tm[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      h,
      min,
      0,
      0,
    ),
  );
}

export function formatSvDateInput(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatSvTimeInput(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatSvTimeFr(d: Date | null | undefined): string {
  if (!d) return "—";
  return formatSvTimeInput(d).replace(":", " h ");
}

/** Minutes de retard (arrivé − prévu) ; null si pas d’heure prévue. */
export function computeMinutesLate(
  expectedAt: Date | null,
  arrivedAt: Date,
): number | null {
  if (!expectedAt) return null;
  const diff = Math.round(
    (arrivedAt.getTime() - expectedAt.getTime()) / 60_000,
  );
  return Math.max(0, diff);
}

/** Nombre de jours calendaires inclusifs. */
export function absenceDaySpan(start: Date, end: Date): number {
  const a = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const b = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.floor((b - a) / 86_400_000) + 1;
}

export function employeeDisplayName(e: {
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
}): string {
  return `${e.firstName} ${e.lastName}`.trim();
}

/** Message UX / Server Action — Justifiée exige un document GED. */
export const SV_ABSENCE_JUSTIFIED_REQUIRES_GED =
  "Ajoutez un justificatif pour marquer l’absence justifiée";

/**
 * Justifiée ⇔ justificatif présent (GED lié ou fichier en cours d’upload).
 * Retourne le message d’erreur, ou null si OK.
 */
export function assertJustifiedRequiresGed(
  status: SvAbsenceStatusCode,
  hasJustificatif: boolean,
): string | null {
  if (status === "JUSTIFIEE" && !hasJustificatif) {
    return SV_ABSENCE_JUSTIFIED_REQUIRES_GED;
  }
  return null;
}

/** Après upload justificatif → statut Justifiée si encore Enregistrée / Non justifiée. */
export function statusAfterJustification(
  current: SvAbsenceStatusCode,
  hasGed: boolean,
): SvAbsenceStatusCode {
  if (current === "ANNULEE") return current;
  if (hasGed && (current === "ENREGISTREE" || current === "NON_JUSTIFIEE")) {
    return "JUSTIFIEE";
  }
  // Sans justificatif, Justifiée n’est pas tenable.
  if (!hasGed && current === "JUSTIFIEE") {
    return "NON_JUSTIFIEE";
  }
  return current;
}
