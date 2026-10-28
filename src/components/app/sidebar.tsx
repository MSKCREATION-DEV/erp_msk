import { BadgeCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { LogoutButton } from "@/components/app/logout-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NAV_GROUPS } from "@/lib/nav";
import { hasPermission, type SessionUser } from "@/lib/rbac/resolve";
import { cn } from "@/lib/utils";

export function Sidebar({
  user,
  variant = "desktop",
  className,
}: {
  user: SessionUser;
  /** `drawer` = pleine largeur dans le panneau mobile. */
  variant?: "desktop" | "drawer";
  className?: string;
}) {
  const allowedIds = NAV_GROUPS.flatMap((g) =>
    g.items
      .filter((item) => !item.permission || hasPermission(user, item.permission))
      .map((item) => item.id),
  );

  const displayName =
    user.firstName.length + user.lastName.length > 18
      ? user.firstName
      : `${user.firstName} ${user.lastName}`;

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden bg-white",
        variant === "desktop" &&
          "w-56 border-r border-msk-ink/7 xl:w-62",
        variant === "drawer" && "w-full border-0",
        className,
      )}
    >
      <div className="flex h-16 items-center px-4">
        <Logo variant="bloc" size="sm" href="/accueil" priority />
      </div>

      <SidebarNav allowedIds={allowedIds} />

      <div className="mt-auto border-t border-msk-ink/7 p-3">
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
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
