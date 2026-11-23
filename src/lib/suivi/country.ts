import type { SvCountry } from "@/generated/prisma/client";
import { hasPermission, type SessionUser } from "@/lib/rbac/session-user";

/** Codes URL V1 (`?pays=ml|tg`) — Phase B brancherá les pages. */
export const SV_COUNTRY_URL_CODES = ["ml", "tg"] as const;
export type SvCountryUrlCode = (typeof SV_COUNTRY_URL_CODES)[number];

export const SV_COUNTRY_FROM_URL: Record<SvCountryUrlCode, SvCountry> = {
  ml: "MALI",
  tg: "TOGO",
};

export const SV_COUNTRY_TO_URL: Record<SvCountry, SvCountryUrlCode> = {
  MALI: "ml",
  TOGO: "tg",
};

export const SV_COUNTRY_LABEL_FR: Record<SvCountry, string> = {
  MALI: "Mali",
  TOGO: "Togo",
};

export const SV_COUNTRY_ISO: Record<SvCountry, string> = {
  MALI: "ML",
  TOGO: "TG",
};

/** Capacité portée pays — AND avec la capacité métier (sv.accounts.* …). */
export const SV_COUNTRY_PERMISSION: Record<SvCountry, string> = {
  MALI: "sv.country.mali",
  TOGO: "sv.country.togo",
};

export const SV_COUNTRIES: readonly SvCountry[] = ["MALI", "TOGO"] as const;

/**
 * Défaut legacy (TB / charges hors scope pays V1).
 * Les 3 piliers Phase B exigent `?pays=` — ne plus l’utiliser comme filtre listes.
 */
export const SV_COUNTRY_DEFAULT: SvCountry = "MALI";

/** Affichage UI : « Mali (ML) » / « Togo (TG) ». */
export function svCountryDisplayLabel(country: SvCountry): string {
  return `${SV_COUNTRY_LABEL_FR[country]} (${SV_COUNTRY_ISO[country]})`;
}

/**
 * Construit une URL avec `pays` imposé (et paramètres optionnels).
 * Si `path` a déjà une query, elle est fusionnée (`pays` gagne).
 */
export function withSvCountryQuery(
  path: string,
  country: SvCountry,
  extra?: Record<string, string | undefined | null>,
): string {
  const [base, existingQs = ""] = path.split("?");
  const params = new URLSearchParams(existingQs);
  params.set("pays", SV_COUNTRY_TO_URL[country]);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function isSvCountry(value: unknown): value is SvCountry {
  return value === "MALI" || value === "TOGO";
}

/**
 * Parse `pays` query (`ml` | `tg` | `MALI` | `TOGO`, case-insensitive).
 * Retourne null si absent **ou** invalide — préférer `classifySvCountryParam`
 * quand il faut distinguer (gate vs 404).
 */
export function parseSvCountryParam(
  raw: string | string[] | null | undefined,
): SvCountry | null {
  const classified = classifySvCountryParam(raw);
  return classified.kind === "ok" ? classified.country : null;
}

export type SvCountryParamClass =
  | { kind: "absent" }
  | { kind: "invalid" }
  | { kind: "ok"; country: SvCountry };

/**
 * Distingue `pays` absent (écran de choix) vs invalide (404) vs OK.
 */
export function classifySvCountryParam(
  raw: string | string[] | null | undefined,
): SvCountryParamClass {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v == null || typeof v !== "string" || v.trim() === "") {
    return { kind: "absent" };
  }
  const t = v.trim().toLowerCase();
  if (t === "ml" || t === "mali") return { kind: "ok", country: "MALI" };
  if (t === "tg" || t === "togo") return { kind: "ok", country: "TOGO" };
  const upper = v.trim().toUpperCase();
  if (isSvCountry(upper)) return { kind: "ok", country: upper };
  return { kind: "invalid" };
}

export function svCountryPermission(country: SvCountry): string {
  return SV_COUNTRY_PERMISSION[country];
}

/** Super Admin court-circuit via hasPermission. */
export function canSvCountry(user: SessionUser, country: SvCountry): boolean {
  return hasPermission(user, svCountryPermission(country));
}

/** Pays autorisés pour l’écran de choix (Phase B). */
export function listSvCountriesForUser(user: SessionUser): SvCountry[] {
  return SV_COUNTRIES.filter((c) => canSvCountry(user, c));
}
