import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  info: {
    icon: Info,
    className: "border-msk-blue/20 bg-msk-blue/5 text-msk-ink",
    iconClass: "text-msk-blue",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-msk-coral/25 bg-msk-coral/5 text-msk-ink",
    iconClass: "text-msk-coral",
  },
  tip: {
    icon: Lightbulb,
    className: "border-msk-ink/10 bg-msk-chalk text-msk-ink",
    iconClass: "text-msk-ink/60",
  },
} as const;

export function GuideCallout({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: keyof typeof variants;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const v = variants[variant];
  const Icon = v.icon;
  return (
    <aside
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed",
        v.className,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", v.iconClass)} aria-hidden />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-medium text-msk-ink">{title}</p> : null}
        <div className="text-msk-ink/70">{children}</div>
      </div>
    </aside>
  );
}
