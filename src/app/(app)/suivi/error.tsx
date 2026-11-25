"use client";

import { ErrorFallback } from "@/components/ui/error-fallback";

/**
 * Boundary Suivi — même filet removeChild (auto-reset) que (app)/error.
 */
export default function SuiviError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback error={error} reset={reset} scope="suivi/error" />
  );
}
