import { hasPermission, type SessionUser } from "@/lib/rbac/resolve";
import type { Guide } from "./types";

/**
 * Visibilité documentaire — ne remplace pas le RBAC métier sur l’action.
 * Super Admin : voit tout le catalogue publié (hors draft si on filtre ailleurs).
 */
export function canViewGuide(user: SessionUser, guide: Guide): boolean {
  if (!guide.viewPermission) return true;
  return hasPermission(user, guide.viewPermission);
}

export function visibleGuides(user: SessionUser, guides: Guide[]): Guide[] {
  return guides.filter((g) => canViewGuide(user, g));
}

/** Brouillons masqués aux non Super Admin (édition doc future). */
export function publishedForUser(user: SessionUser, guides: Guide[]): Guide[] {
  const visible = visibleGuides(user, guides);
  if (user.isSuperAdmin) return visible;
  return visible.filter((g) => g.status !== "draft");
}
