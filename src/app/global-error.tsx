"use client";

import { fontVariables } from "@/fonts";
import { ErrorFallback } from "@/components/ui/error-fallback";

/**
 * Remplace le root layout en cas d’échec critique.
 * Doit définir ses propres <html> / <body> (convention Next.js).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr" className={fontVariables}>
      <body className="min-h-screen bg-msk-chalk font-sans text-msk-ink antialiased">
        <ErrorFallback
          error={error}
          reset={reset}
          variant="page"
          scope="global-error"
        />
      </body>
    </html>
  );
}
