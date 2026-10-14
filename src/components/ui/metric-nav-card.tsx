import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accents MSK pour pastille d’icône (réutilisable hors Commercial). */
export type MetricNavTone = "blue" | "coral" | "cyan" | "ink";

export const METRIC_NAV_TONE_ICON: Record<MetricNavTone, string> = {
  blue: "bg-msk-blue/10 text-msk-blue",
  coral: "bg-msk-coral/10 text-msk-coral",
  cyan: "bg-[#00ACEE]/12 text-[#1384CB]",
  ink: "bg-msk-ink/[0.06] text-msk-ink/70",
};

export const METRIC_NAV_TONE_CHART: Record<
  Exclude<MetricNavTone, "cyan">,
  string
> = {
  coral: "#FF5A3C",
  blue: "#1D73BC",
  ink: "#284393",
};

const shellClass =
  "group flex h-full flex-col rounded-xl border border-msk-ink/[0.08] bg-white p-4 shadow-sm transition hover:border-msk-blue/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40";

export type MetricNavCardProps = {
  href: string;
  icon: LucideIcon;
  tone?: MetricNavTone;
  title: string;
  description: string;
  /** Bloc bas (KPI texte ou mini-chart) — aligné à droite. */
  footer?: ReactNode;
  className?: string;
  /** Carte visible mais non cliquable (module gelé). */
  gated?: boolean;
  gatedHint?: string;
};

/**
 * Carte de navigation métrique MSK.
 * En-tête : icône + titre/sous-titre (centrés verticalement) + flèche.
 */
export function MetricNavCard({
  href,
  icon: Icon,
  tone = "blue",
  title,
  description,
  footer,
  className,
  gated = false,
  gatedHint,
}: MetricNavCardProps) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            gated
              ? "bg-msk-ink/[0.04] text-msk-ink/35"
              : METRIC_NAV_TONE_ICON[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "truncate text-base font-semibold leading-tight",
              gated ? "text-msk-ink/45" : "text-msk-ink",
            )}
          >
            {title}
          </h3>
          <p
            className={cn(
              "mt-0.5 line-clamp-2 text-[13px] leading-snug",
              gated ? "text-msk-ink/35" : "text-msk-ink/50",
            )}
          >
            {gated && gatedHint ? gatedHint : description}
          </p>
        </div>
        {gated ? (
          <span className="shrink-0 rounded-md border border-msk-ink/10 bg-msk-chalk/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-msk-ink/40">
            Bientôt
          </span>
        ) : (
          <ArrowRight
            className="h-4 w-4 shrink-0 text-msk-blue/55 transition group-hover:translate-x-0.5 group-hover:text-msk-blue"
            aria-hidden
          />
        )}
      </div>
      {footer && !gated ? (
        <div className="mt-auto flex justify-end pt-3">{footer}</div>
      ) : (
        <div className="mt-auto" aria-hidden />
      )}
    </>
  );

  if (gated) {
    return (
      <div
        aria-disabled="true"
        className={cn(
          shellClass,
          "cursor-not-allowed opacity-70 shadow-none hover:border-msk-ink/[0.08] hover:shadow-none",
          className,
        )}
      >
        {body}
      </div>
    );
  }

  return (
    <Link prefetch={false} href={href} className={cn(shellClass, className)}>
      {body}
    </Link>
  );
}

/** KPI texte centré (bas droite des cartes module). */
export function MetricNavKpi({
  value,
  hint,
}: {
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-18 text-center">
      <p className="text-lg font-semibold tabular-nums leading-none text-msk-ink">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-tight text-msk-ink/45">{hint}</p>
      ) : null}
    </div>
  );
}
