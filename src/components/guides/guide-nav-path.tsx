import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Fil de navigation visuel (pills) pour une étape. */
export function GuideNavPath({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  const parts = path
    .split(/→|->|\//)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <nav
      aria-label="Chemin dans l’application"
      className={cn("flex flex-wrap items-center gap-1", className)}
    >
      {parts.map((part, i) => (
        <span key={`${part}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 ? (
            <ChevronRight
              className="h-3.5 w-3.5 text-msk-ink/25"
              aria-hidden
            />
          ) : null}
          <span
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium",
              i === parts.length - 1
                ? "bg-msk-blue text-white"
                : "bg-msk-ink/6 text-msk-ink/70",
            )}
          >
            {part}
          </span>
        </span>
      ))}
    </nav>
  );
}
