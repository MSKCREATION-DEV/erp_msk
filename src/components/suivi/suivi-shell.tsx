import { Suspense } from "react";
import { SuiviNav } from "@/components/suivi/suivi-nav";

export function SuiviShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <Suspense
        fallback={<div className="h-10 animate-pulse rounded bg-msk-ink/4" />}
      >
        <SuiviNav />
      </Suspense>
      {children}
    </div>
  );
}
