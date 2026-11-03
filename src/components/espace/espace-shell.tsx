import { Suspense } from "react";
import { EspaceNav } from "@/components/espace/espace-nav";

/** Shell Mon espace — sous-nav 5 entrées ; profil hors nav. */
export function EspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <Suspense
        fallback={
          <div className="h-10 animate-pulse rounded bg-msk-ink/4" />
        }
      >
        <EspaceNav />
      </Suspense>
      {children}
    </div>
  );
}
