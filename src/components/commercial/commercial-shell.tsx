import { Suspense } from "react";
import { CommercialNav } from "@/components/commercial/commercial-nav";
import { CommercialNavGate } from "@/components/commercial/commercial-nav-gate";

/**
 * Menu `/commercial` = hub cartes (pas de tabs).
 * Sous-pages = sous-nav filtrée selon droits.
 */
export function CommercialShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <CommercialNavGate>
        <Suspense
          fallback={
            <div className="h-10 animate-pulse rounded bg-msk-ink/4" />
          }
        >
          <CommercialNav />
        </Suspense>
      </CommercialNavGate>
      {children}
    </div>
  );
}
