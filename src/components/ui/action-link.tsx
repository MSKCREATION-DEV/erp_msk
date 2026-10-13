import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-msk-blue text-white hover:bg-msk-blue/90 focus-visible:ring-msk-blue/40",
  secondary:
    "border border-msk-ink/15 bg-white text-msk-ink hover:bg-msk-chalk focus-visible:ring-msk-blue/30",
  ghost:
    "bg-transparent text-msk-blue hover:bg-msk-blue/5 focus-visible:ring-msk-blue/30",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
} as const;

export type ActionLinkProps = {
  href: string;
  icon: LucideIcon;
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
};

/**
 * CTA navigation MSK : icône + libellé explicite (jamais un « Nouveau » nu).
 */
export function ActionLink({
  href,
  icon: Icon,
  children,
  variant = "primary",
  size = "sm",
  className,
}: ActionLinkProps) {
  return (
    <Link
      prefetch={false}
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-tight transition focus-visible:outline-none focus-visible:ring-2",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {children}
    </Link>
  );
}
