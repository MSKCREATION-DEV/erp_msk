"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveSearchStatus } from "@/hooks/use-duplicate-live-search";
import { cn } from "@/lib/utils";

export function DuplicateSearchStatus({
  status,
  error,
  onRetry,
  idleHint,
  okEmptyHint,
  className,
}: {
  status: LiveSearchStatus;
  error: string | null;
  onRetry?: () => void;
  idleHint?: string | null;
  okEmptyHint?: string | null;
  className?: string;
}) {
  if (status === "idle" && idleHint) {
    return (
      <p className={cn("mt-3 text-xs text-msk-ink/40", className)}>{idleHint}</p>
    );
  }
  if (status === "pending") {
    return (
      <p
        className={cn(
          "mt-3 flex items-center gap-2 text-xs text-msk-ink/50",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Vérification des correspondances…
      </p>
    );
  }
  if (status === "error") {
    return (
      <div
        className={cn(
          "mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-msk-coral/25 bg-msk-coral/5 px-3 py-2 text-xs text-msk-coral",
          className,
        )}
        role="alert"
      >
        <span>
          {error ??
            "La vérification n’a pas pu être effectuée. Réessayez avant de continuer."}
        </span>
        {onRetry ? (
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-2 text-xs"
            onClick={onRetry}
          >
            Réessayer
          </Button>
        ) : null}
      </div>
    );
  }
  if (status === "ok" && okEmptyHint) {
    return (
      <p
        className={cn("mt-3 text-xs text-msk-ink/40", className)}
        role="status"
        aria-live="polite"
      >
        {okEmptyHint}
      </p>
    );
  }
  return null;
}
