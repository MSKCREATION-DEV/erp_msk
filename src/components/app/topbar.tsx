import { Bell, Search } from "lucide-react";

/** Barre globale minimale — le titre de page vit dans PageHeader. */
export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-end gap-2 border-b border-msk-ink/[0.06] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-msk-ink/10 text-msk-ink/40"
        aria-label="Recherche — bientôt"
        disabled
      >
        <Search className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-msk-ink/10 text-msk-ink/40"
        aria-label="Notifications — bientôt"
        disabled
      >
        <Bell className="h-4 w-4" />
      </button>
    </header>
  );
}
