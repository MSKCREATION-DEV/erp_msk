import { notFound, redirect } from "next/navigation";
import type { SvCountry } from "@/generated/prisma/client";
import { hasPermission } from "@/lib/rbac/resolve";
import type { SessionUser } from "@/lib/rbac/session-user";
import {
  canSvCountry,
  classifySvCountryParam,
  listSvCountriesForUser,
  withSvCountryQuery,
} from "@/lib/suivi/country";

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
 * Listes 3 piliers : `?pays=` valide → pays ; **absent** → `null` (écran de choix) ;
 * invalide → 404 ; sans droit pays → redirect hub.
 * Si un seul pays autorisé et `pays` absent → redirect direct vers `targetPath?pays=`.
 */
export function resolveSvPermissionFromPaysParam(
  user: SessionUser,
  code: string,
  searchParams: Record<string, string | string[] | undefined>,
  targetPath: string,
): SvCountry | null {
  const classified = classifySvCountryParam(searchParams.pays);
  if (classified.kind === "absent") {
    requireSvPermission(user, code);
    const countries = listSvCountriesForUser(user);
    if (countries.length === 1) {
      redirect(withSvCountryQuery(targetPath, countries[0]));
    }
    return null;
  }
  if (classified.kind === "invalid") notFound();
  requireSvPermissionInCountry(user, code, classified.country);
  return classified.country;
}

/**
 * Create / nested : `?pays=` requis.
 * Absent → redirect vers `missingHref` (liste = gate) ; invalide → 404.
 */
export function requireSvPermissionFromPaysParam(
  user: SessionUser,
  code: string,
  searchParams: Record<string, string | string[] | undefined>,
  options?: { missingHref?: string },
): SvCountry {
  const classified = classifySvCountryParam(searchParams.pays);
  if (classified.kind === "absent") {
    requireSvPermission(user, code);
    redirect(options?.missingHref ?? "/suivi");
  }
  if (classified.kind === "invalid") notFound();
  requireSvPermissionInCountry(user, code, classified.country);
  return classified.country;
}

/**
 * Fiche détail : si `pays` absent → utilise le pays de la ressource (si droits) ;
 * invalide / mismatch → 404 ; sans droit pays → redirect hub.
 */
export function requireSvResourceCountry(
  user: SessionUser,
  code: string,
  searchParams: Record<string, string | string[] | undefined>,
  resourceCountry: SvCountry,
): SvCountry {
  const classified = classifySvCountryParam(searchParams.pays);
  if (classified.kind === "absent") {
    requireSvPermissionInCountry(user, code, resourceCountry);
    return resourceCountry;
  }
  if (classified.kind === "invalid") notFound();
  requireSvPermissionInCountry(user, code, classified.country);
  if (classified.country !== resourceCountry) notFound();
  return classified.country;
}
