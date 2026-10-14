import Link from "next/link";
import { Surface } from "@/components/ui/surface";
import { RadialShape } from "@/components/ui/radial-shape";
import { METRIC_NAV_TONE_CHART } from "@/components/ui/metric-nav-card";
import type { GoalProgressItem } from "@/lib/crm/goals";
import { cn } from "@/lib/utils";

/** Bandeau minimal objectifs (dashboard) — lien détail optionnel. */
export function GoalsProgressStrip({
  progress,
  title = "Objectifs semaine",
  detailHref,
  detailLabel = "Voir le détail",
  compact = false,
  /** Sans Surface (déjà dans une carte parent). */
  embedded = false,
}: {
  progress: GoalProgressItem[];
  title?: string;
  /** Si omis : pas de CTA (ex. Vue Équipe). */
  detailHref?: string;
  detailLabel?: string;
  compact?: boolean;
  embedded?: boolean;
}) {
  const body = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
          {title}
        </p>
        {detailHref ? (
          <Link
            prefetch={false}
            href={detailHref}
            className="text-sm font-medium text-msk-blue hover:underline"
          >
            {detailLabel}
          </Link>
        ) : null}
      </div>
      <div
        className={cn(
          "mt-4 grid gap-3",
          compact
            ? "grid-cols-2 sm:grid-cols-4"
            : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {progress.map((g) => (
          <RadialShape
            key={g.metric}
            current={g.current}
            target={g.target}
            label={g.label}
            color={
              g.metric === "FOLLOW_UPS"
                ? METRIC_NAV_TONE_CHART.coral
                : METRIC_NAV_TONE_CHART.blue
            }
            className={compact ? "scale-90" : undefined}
          />
        ))}
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="rounded-lg border border-msk-ink/[0.06] bg-msk-chalk/30 p-4">
        {body}
      </div>
    );
  }

  return <Surface className="p-5">{body}</Surface>;
}
