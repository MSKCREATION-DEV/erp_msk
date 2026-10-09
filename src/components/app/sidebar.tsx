import { BadgeCheck, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { UserAvatar } from "@/components/ui/user-avatar";
import { logoutAction } from "@/actions/auth";
import { NAV_GROUPS } from "@/lib/nav";
import { hasPermission, type SessionUser } from "@/lib/rbac/resolve";

export function Sidebar({ user }: { user: SessionUser }) {
  const allowedIds = NAV_GROUPS.flatMap((g) =>
    g.items
      .filter((item) => !item.permission || hasPermission(user, item.permission))
      .map((item) => item.id),
  );

  // Évite Utilisateurs + Administration en double dans le menu
  const dedupedIds = allowedIds.filter((id, _, arr) => {
    if (id === "administration" && arr.includes("utilisateurs")) return false;
    return true;
  });

  const displayName =
    user.firstName.length + user.lastName.length > 18
      ? user.firstName
      : `${user.firstName} ${user.lastName}`;

  return (
    <aside className="flex h-screen w-[248px] shrink-0 flex-col border-r border-msk-ink/[0.07] bg-white">
      <div className="flex h-[64px] items-center px-4">
        <Logo variant="bloc" size="sm" href="/accueil" priority />
      </div>

      <SidebarNav allowedIds={dedupedIds} />

      <div className="mt-auto border-t border-msk-ink/[0.07] p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <UserAvatar
            firstName={user.firstName}
            lastName={user.lastName}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p
              className="flex items-center gap-1 text-[13px] font-semibold leading-tight text-msk-ink"
              title={`${user.firstName} ${user.lastName}`}
            >
              <span className="truncate">{displayName}</span>
              {user.isSuperAdmin ? (
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-msk-blue" />
              ) : null}
            </p>
            <p className="truncate text-[11px] text-msk-ink/40" title={user.email}>
              {user.email}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Déconnexion"
              className="cursor-pointer rounded-lg p-2 text-msk-ink/35 transition hover:bg-msk-chalk hover:text-msk-ink"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Déconnexion</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
