import { cache } from "react";
import { redirect } from "next/navigation";
import { UserStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import {
  hasPermission,
  resolveUserPermissions,
  type SessionUser,
} from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";

export type { SessionUser };

/** Une seule résolution Auth+RBAC par requête (layout + page). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return resolveUserPermissions(user.id);
});

/** Gate app authentifiée — refuse suspended/archived. */
export async function requireUser(opts?: {
  permission?: string;
  allowMustChangePassword?: boolean;
}): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }

  if (
    session.status === UserStatus.SUSPENDED ||
    session.status === UserStatus.ARCHIVED
  ) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=compte_indisponible");
  }

  if (
    (session.mustChangePassword ||
      session.status === UserStatus.MUST_CHANGE_PASSWORD ||
      session.status === UserStatus.INVITE_PENDING) &&
    !opts?.allowMustChangePassword
  ) {
    redirect("/changer-mot-de-passe");
  }

  if (opts?.permission && !hasPermission(session, opts.permission)) {
    redirect("/accueil?error=acces_refuse");
  }

  return session;
}

export async function touchLastLogin(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}
