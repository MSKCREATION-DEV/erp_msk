import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac/resolve";
import type { SessionUser } from "@/lib/rbac/session-user";

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
