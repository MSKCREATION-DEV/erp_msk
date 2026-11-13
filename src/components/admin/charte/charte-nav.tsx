"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  Eye,
  ImageIcon,
  Palette,
  Type,
  Shapes,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: {
  href: string;
  label: string;
  icon: typeof Eye;
  exact?: boolean;
}[] = [
  { href: "/administration/charte", label: "Vue d’ensemble", icon: Eye, exact: true },
  { href: "/administration/charte/logos", label: "Logos", icon: ImageIcon },
  { href: "/administration/charte/couleurs", label: "Couleurs", icon: Palette },
  {
    href: "/administration/charte/typographies",
    label: "Typographies",
    icon: Type,
  },
  {
    href: "/administration/charte/ressources",
    label: "Autres ressources",
    icon: Shapes,
  },
];

function TabLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <>{pending ? "…" : label}</>;
}

export function CharteNav() {
  const pathname = usePathname();

  return (
    <nav
      className="scrollbar-thin -mx-1 overflow-x-auto px-1"
      aria-label="Sections charte"
    >
      <div className="flex min-w-max gap-1.5 border-b border-msk-ink/8 pb-px" role="tablist">
        {TABS.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(`${t.href}/`);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch={false}
              role="tab"
              aria-selected={active}
              className={cn(
                "inline-flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium transition",
                active
                  ? "border-msk-blue text-msk-blue"
                  : "border-transparent text-msk-ink/55 hover:border-msk-ink/15 hover:text-msk-ink",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <TabLabel label={t.label} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
