import { ComQuoteStatus } from "@prisma/client";

/** Transitions autorisées serveur (indépendamment de l’UI). */
const ALLOWED: Record<ComQuoteStatus, ReadonlySet<ComQuoteStatus>> = {
  BROUILLON: new Set([ComQuoteStatus.ENVOYE, ComQuoteStatus.ANNULE]),
  ENVOYE: new Set([
    ComQuoteStatus.ACCEPTE,
    ComQuoteStatus.REFUSE,
    ComQuoteStatus.EXPIRE,
    ComQuoteStatus.ANNULE,
  ]),
  ACCEPTE: new Set([ComQuoteStatus.ANNULE]),
  REFUSE: new Set(),
  EXPIRE: new Set(),
  ANNULE: new Set(),
};

export function canTransitionQuoteStatus(
  from: ComQuoteStatus,
  to: ComQuoteStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.has(to) ?? false;
}

/** Permission requise pour la transition (cible). */
export function permissionForQuoteStatus(
  status: ComQuoteStatus,
): "com.devis.send" | "com.devis.accept_reject" | "com.devis.edit_own" {
  if (status === ComQuoteStatus.ENVOYE) return "com.devis.send";
  if (
    status === ComQuoteStatus.ACCEPTE ||
    status === ComQuoteStatus.REFUSE
  ) {
    return "com.devis.accept_reject";
  }
  return "com.devis.edit_own";
}
