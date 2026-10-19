"use client";

import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function KpiRadial({
  label,
  value,
  target,
  hint,
  tone = "blue",
}: {
  label: string;
  value: number;
  target?: number;
  hint?: string;
  tone?: "blue" | "coral";
}) {
  const pct =
    target && target > 0
      ? Math.min(100, Math.round((value / target) * 100))
      : Math.min(100, value);
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <Surface className="flex items-center gap-3 p-4">
      <div className="relative h-22 w-22 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            className="text-msk-ink/8"
            stroke="currentColor"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            className={tone === "coral" ? "text-msk-coral" : "text-msk-blue"}
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold tabular-nums text-msk-ink">
            {value}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-msk-ink">{label}</p>
        {target != null ? (
          <p className="text-xs text-msk-ink/45">
            Objectif {target} · {pct}%
          </p>
        ) : null}
        {hint ? (
          <p className={cn("mt-0.5 text-xs text-msk-ink/45")}>{hint}</p>
        ) : null}
      </div>
    </Surface>
  );
}
