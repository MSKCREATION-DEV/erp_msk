/**
 * Messages d’erreur destinés à l’UI.
 * Jamais de stack Prisma / chemins locaux / dumps techniques.
 * En prod Next.js redacte déjà les erreurs Server Components → `digest`.
 * En dev le `message` brut fuit : on le sanitize ici aussi.
 */

export type UserFacingKind =
  | "transient"
  | "forbidden"
  | "not_found"
  | "unknown";

export type UserFacingError = {
  title: string;
  description: string;
  hint?: string;
  kind: UserFacingKind;
};

const TECHNICAL =
  /prisma|invalid `|invocation|fatal:|emaxconn|max clients|pool_size|econnrefused|etimedout|enotfound|node_modules|\/users\/|\/home\/|at\s+\w+\s+\(|webpack|turbopack|digest|stack trace|sqlstate|postgres|supabase/i;

export function isTechnicalErrorMessage(message: string | undefined | null): boolean {
  if (!message) return false;
  return TECHNICAL.test(message) || message.length > 280;
}

export function toUserFacingError(
  error: Error & { digest?: string },
): UserFacingError {
  const raw = (error.message ?? "").toLowerCase();

  if (
    /emaxconn|max clients|too many connections|connection pool|pool_size|remaining connection slots/i.test(
      raw,
    )
  ) {
    return {
      title: "Service temporairement saturé",
      description:
        "Trop de connexions sont ouvertes vers la base. Réessayez dans quelques secondes.",
      hint: "Si ça persiste, un administrateur devra vérifier le pooler (session vs transaction).",
      kind: "transient",
    };
  }

  if (
    /fetch failed|network|econnrefused|etimedout|enotfound|socket hang up|failed to fetch/i.test(
      raw,
    )
  ) {
    return {
      title: "Connexion interrompue",
      description:
        "Impossible de joindre le serveur pour le moment. Vérifiez votre réseau puis réessayez.",
      kind: "transient",
    };
  }

  if (/forbidden|accès refusé|unauthorized|permission/i.test(raw)) {
    return {
      title: "Accès refusé",
      description: "Vous n’avez pas les droits nécessaires pour cette action.",
      kind: "forbidden",
    };
  }

  if (/not found|introuvable|404/i.test(raw)) {
    return {
      title: "Ressource introuvable",
      description: "Cet élément n’existe plus ou a été déplacé.",
      kind: "not_found",
    };
  }

  // Message court + non technique → on peut le montrer (ex. erreurs métier)
  if (
    error.message &&
    !isTechnicalErrorMessage(error.message) &&
    error.message.length <= 160
  ) {
    return {
      title: "Une erreur est survenue",
      description: error.message,
      kind: "unknown",
    };
  }

  return {
    title: "Une erreur est survenue",
    description:
      "Nous n’avons pas pu afficher cette page. Vous pouvez réessayer ou revenir à l’accueil.",
    hint: "Si le problème continue, notez la référence ci-dessous pour le support.",
    kind: "unknown",
  };
}
