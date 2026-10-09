"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  NAV_GROUPS,
  flatNavItems,
  isNavActive,
  type NavItem,
} from "@/lib/nav";

export function SidebarNav({ allowedIds }: { allowedIds: string[] }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const allowed = new Set(allowedIds);
  const allItems = flatNavItems().filter((i) => allowed.has(i.id));

  // Navigation terminée → clear pending (feedback instantané pendant le fetch RSC)
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => allowed.has(item.id));
        if (items.length === 0) return null;
        return (
          <div key={group.id}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
              {group.label}
            </p>
            <ul className="space-y-1">
              {items.map((item) => {
                const active = isNavActive(pathname, item, allItems);
                const pending = pendingHref === item.href;
                return (
                  <li key={item.id}>
                    <NavItemRow
                      item={item}
                      active={active}
                      pending={pending}
                      onNavigate={() => {
                        if (item.soon || item.href === pathname) return;
                        setPendingHref(item.href);
                        startTransition(() => {
                          /* Link gère la nav ; transition marque le pending React */
                        });
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function NavItemRow({
  item,
  active,
  pending,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  pending: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const className = cn(
    "relative flex w-full items-center gap-3 rounded-lg py-2.5 pl-3 pr-3 text-[13px] font-medium transition-colors",
    (active || pending) &&
      "bg-msk-blue/[0.1] text-msk-blue before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-msk-blue",
    !active &&
      !pending &&
      !item.soon &&
      "cursor-pointer text-msk-ink/65 hover:bg-msk-ink/[0.04] hover:text-msk-ink",
    item.soon && "cursor-not-allowed text-msk-ink/35",
    pending && "opacity-80",
  );

  const content = (
    <>
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active || pending ? "text-msk-blue" : "text-msk-ink/40",
        )}
        strokeWidth={1.75}
      />
      <span className="flex-1 text-left">{item.label}</span>
      {pending ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-msk-blue/30 border-t-msk-blue"
          aria-hidden
        />
      ) : item.soon ? (
        <span className="rounded-md bg-msk-ink/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-msk-ink/35">
          bientôt
        </span>
      ) : null}
    </>
  );

  if (item.soon) {
    return (
      <span className={className} title="Module à venir">
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch
      scroll={false}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-busy={pending || undefined}
      className={className}
    >
      {content}
    </Link>
  );
}
