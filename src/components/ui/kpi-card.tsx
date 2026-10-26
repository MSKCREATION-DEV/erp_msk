import { TrendingDown, TrendingUp } from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { gridKpi4 } from "@/lib/ui/layout-grids";
import { cn } from "@/lib/utils";

export type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  className?: string;
};

export function KpiCard({ label, value, hint, trend, className }: KpiCardProps) {
  return (
    <Surface className={cn("min-w-0 overflow-hidden p-4 sm:p-5", className)}>
      <p className="text-[13px] font-medium text-msk-ink/50">{label}</p>
      <p className="mt-2 break-words text-[1.65rem] font-semibold leading-none tracking-tight text-msk-ink">
        {value}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {hint ? <span className="text-xs text-msk-ink/40">{hint}</span> : null}
        {trend && trend.direction !== "neutral" ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              trend.direction === "up" && "bg-emerald-500/10 text-emerald-700",
              trend.direction === "down" && "bg-msk-coral/10 text-msk-coral",
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}
          </span>
        ) : null}
      </div>
    </Surface>
  );
}

export function KpiGrid({
  items,
  className,
}: {
  items: KpiCardProps[];
  className?: string;
}) {
  return (
    <div className={cn(gridKpi4, className)}>
      {items.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </div>
  );
}
