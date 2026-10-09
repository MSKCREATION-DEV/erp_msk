"use client";

import { ErrorFallback } from "@/components/ui/error-fallback";

/**
 * Boundary App Router — ne jamais afficher error.message brut
 * (Prisma / chemins / stack). Voir `toUserFacingError`.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback error={error} reset={reset} scope="(app)/error" />
  );
}
