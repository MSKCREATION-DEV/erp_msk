import { notFound, redirect } from "next/navigation";
import type { SvCountry } from "@/generated/prisma/client";
import { hasPermission } from "@/lib/rbac/resolve";
import type { SessionUser } from "@/lib/rbac/session-user";
import { canSvCountry, parseSvCountryParam } from "@/lib/suivi/country";

export function requireSvAccess(user: SessionUser) {
  if (!hasPermission(user, "sv.access") && !user.isSuperAdmin) {
    redirect("/accueil");
  }
}

export function requireSvPermission(user: SessionUser, code: string) {
  requireSvAccess(user);
  if (!hasPermission(user, code) && !user.isSuperAdmin) {
    redirect("/suivi");
  }
}

/**
 * Garde portée pays — capacité métier à vérifier à part via `requireSvPermission`.
 * Pays OK mais sans `sv.country.*` → redirect hub `/suivi` (intent Phase B).
 * Super Admin court-circuit via `canSvCountry` / `hasPermission`.
 */
export function requireSvCountry(user: SessionUser, country: SvCountry) {
  requireSvAccess(user);
  if (!canSvCountry(user, country)) {
    redirect("/suivi");
  }
}

/**
 * Capacité métier **et** portée pays (règle intent).
 * Super Admin court-circuit.
 */
export function requireSvPermissionInCountry(
  user: SessionUser,
  code: string,
  country: SvCountry,
) {
  requireSvPermission(user, code);
  requireSvCountry(user, country);
}

/**
 * Routes 3 piliers : `?pays=` obligatoire.
 * Absent / invalide → 404 ; pays connu sans droit → redirect hub.
 */
export function requireSvPermissionFromPaysParam(
  user: SessionUser,
  code: string,
  searchParams: Record<string, string | string[] | undefined>,
): SvCountry {
  const raw = searchParams.pays;
  const country = parseSvCountryParam(
    Array.isArray(raw) ? raw[0] : raw,
  );
  if (!country) notFound();
  requireSvPermissionInCountry(user, code, country);
  return country;
}

/**
 * Fiche détail : `?pays=` obligatoire et doit matcher la ressource.
 * Absent / invalide / mismatch → 404 ; sans droit pays → redirect hub.
 */
export function requireSvResourceCountry(
  user: SessionUser,
  code: string,
  searchParams: Record<string, string | string[] | undefined>,
  resourceCountry: SvCountry,
): SvCountry {
  const country = requireSvPermissionFromPaysParam(user, code, searchParams);
  if (country !== resourceCountry) notFound();
  return country;
}
