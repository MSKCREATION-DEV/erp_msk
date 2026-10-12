"use client";

import { Surface } from "@/components/ui/surface";
import { formatXof } from "@/lib/crm/labels";
import { cn } from "@/lib/utils";

export function ConversionRadial({
  ratePercent,
  caSigne,
  overdue,
}: {
  ratePercent: number;
  caSigne: number;
  overdue: number;
}) {
  const pct = Math.max(0, Math.min(100, ratePercent));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <Surface className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
        Conversion
      </p>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-[132px] w-[132px] shrink-0">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke="currentColor"
              className="text-msk-ink/[0.08]"
              strokeWidth="12"
            />
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke="currentColor"
              className="text-msk-blue"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
            <p className="text-2xl font-semibold tabular-nums text-msk-ink">
              {pct.toFixed(0)}%
            </p>
            <p className="text-[10px] uppercase tracking-wide text-msk-ink/40">
              Clients
            </p>
          </div>
        </div>
        <dl className="min-w-0 flex-1 space-y-3 text-sm">
          <div>
            <dt className="text-msk-ink/45">CA signé</dt>
            <dd className="font-semibold tabular-nums text-msk-ink">
              {formatXof(caSigne)}
            </dd>
          </div>
          <div>
            <dt className="text-msk-ink/45">Relances en retard</dt>
            <dd
              className={cn(
                "font-semibold tabular-nums",
                overdue > 0 ? "text-msk-coral" : "text-msk-ink",
              )}
            >
              {overdue}
            </dd>
          </div>
        </dl>
      </div>
    </Surface>
  );
}
