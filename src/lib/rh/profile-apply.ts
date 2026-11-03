import type { Prisma } from "@prisma/client";
import { PROFILE_REQUESTABLE_KEYS } from "@/lib/rh/profile-fields";

const DATE_KEYS = new Set([
  "birthDate",
  "idIssuedOn",
  "idExpiresOn",
]);

/** Lit la valeur affichable / comparable d’un champ fiche RH. */
export function readEmployeeField(
  employee: Record<string, unknown>,
  fieldKey: string,
): string | null {
  if (!PROFILE_REQUESTABLE_KEYS.has(fieldKey)) return null;
  const raw = employee[fieldKey];
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) {
    return raw.toISOString().slice(0, 10);
  }
  return String(raw);
}

export function parseProfileFieldValue(
  fieldKey: string,
  newValue: string,
): { ok: true; value: string | Date | null } | { ok: false; error: string } {
  if (!PROFILE_REQUESTABLE_KEYS.has(fieldKey)) {
    return { ok: false, error: `Champ non autorisé : ${fieldKey}` };
  }
  const trimmed = newValue.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (DATE_KEYS.has(fieldKey)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return { ok: false, error: `Date invalide pour ${fieldKey} (AAAA-MM-JJ)` };
    }
    const d = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: `Date invalide pour ${fieldKey}` };
    }
    return { ok: true, value: d };
  }
  if (fieldKey === "personalEmail" || fieldKey === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { ok: false, error: "E-mail invalide" };
    }
  }
  if (trimmed.length > 500) {
    return { ok: false, error: "Valeur trop longue" };
  }
  return { ok: true, value: trimmed };
}

/** Construit le patch Prisma à partir des lignes approuvées. */
export function buildEmployeeUpdateFromLines(
  lines: Array<{ fieldKey: string; newValue: string }>,
):
  | { ok: true; data: Prisma.RhEmployeeUpdateInput }
  | { ok: false; error: string } {
  const data: Prisma.RhEmployeeUpdateInput = {};
  for (const line of lines) {
    const parsed = parseProfileFieldValue(line.fieldKey, line.newValue);
    if (!parsed.ok) return parsed;
    (data as Record<string, unknown>)[line.fieldKey] = parsed.value;
  }
  return { ok: true, data };
}
