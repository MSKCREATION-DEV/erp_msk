"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Feedback immédiat pendant la navigation Link (tri / pagination).
 * Doit être **descendant** d’un `<Link>` — `useLinkStatus` (Next 15.5+).
 */
export function SortPendingIndicator({
  className,
  label = "Chargement",
}: {
  className?: string;
  label?: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("inline-flex items-center", className)}
    >
      <Loader2
        className="h-3 w-3 animate-spin text-msk-blue"
        strokeWidth={2.5}
        aria-hidden
      />
    </span>
  );
}

/** Remplace l’icône de colonne quand le Link de tri est pending. */
export function SortIconSlot({
  idle,
  className,
}: {
  idle: ReactNode;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <span
        role="status"
        aria-live="polite"
        aria-label="Tri en cours"
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center",
          className,
        )}
      >
        <Loader2
          className="h-3 w-3 animate-spin text-msk-blue"
          strokeWidth={2.5}
          aria-hidden
        />
      </span>
    );
  }
  return <>{idle}</>;
}

export function LinkPendingBusy({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={className}
      aria-busy={pending || undefined}
      data-pending={pending ? "true" : undefined}
    >
      {children}
    </span>
  );
}
