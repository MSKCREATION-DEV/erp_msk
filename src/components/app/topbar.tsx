import { Suspense } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { TopbarNotifications } from "@/components/app/topbar-notifications";
import { MobileNavHost } from "@/components/app/mobile-nav-host";

/** Barre globale minimale — le titre de page vit dans PageHeader. */
export function Topbar() {
  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-msk-ink/6 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-msk-ink/10 text-msk-ink/30 md:hidden"
            aria-hidden
            data-testid="mobile-nav-trigger"
          >
            <Menu className="h-4.5 w-4.5" />
          </span>
        }
      >
        <MobileNavHost />
      </Suspense>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-msk-ink/10 text-msk-ink/40"
          aria-label="Recherche — bientôt"
          disabled
        >
          <Search className="h-4 w-4" />
        </button>
        <Suspense
          fallback={
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-msk-ink/10 text-msk-ink/30"
              aria-hidden
            >
              <Bell className="h-4 w-4" />
            </span>
          }
        >
          <TopbarNotifications />
        </Suspense>
      </div>
    </header>
  );
}
