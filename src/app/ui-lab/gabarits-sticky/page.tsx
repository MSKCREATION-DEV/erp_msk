import { FileStack } from "lucide-react";
import { GabaritsStickyChrome } from "@/components/admin/gabarits-sticky-chrome";
import { TemplateStudioSidebar } from "@/components/admin/template-studio-sidebar";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";

export const metadata = {
  title: "UI Lab — Gabarits sticky",
  robots: { index: false, follow: false },
};

/**
 * Lab visuel (dev only via middleware) — reproduit le scroll `<main>` du shell
 * app pour valider sticky header + sidebar sans session.
 */
export default function GabaritsStickyLabPage() {
  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-[#F4F6F9]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center border-b border-msk-ink/8 bg-white px-4 text-sm font-medium text-msk-ink">
          UI Lab — sticky gabarits
        </div>
        <main
          id="lab-scroll"
          className="w-full min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6 lg:px-6 xl:px-8"
        >
          <PageShell>
            <GabaritsStickyChrome
              header={
                <>
                  <PageHeader
                    title="Studio documentaire"
                    description="Bibliothèque centrale des gabarits PDF — dossiers Commercial, RH et Studio."
                    breadcrumbs={[
                      { label: "Administration" },
                      { label: "Gabarits" },
                    ]}
                    actions={
                      <div className="flex items-center gap-2 rounded-xl border border-msk-ink/8 bg-white px-3.5 py-2 shadow-sm">
                        <FileStack
                          className="h-4 w-4 text-msk-blue"
                          aria-hidden
                        />
                        <div className="text-right leading-tight">
                          <p className="text-lg font-semibold tabular-nums text-msk-ink">
                            11
                          </p>
                          <p className="text-[11px] text-msk-ink/45">
                            documents
                          </p>
                        </div>
                      </div>
                    }
                  />
                  <div className="h-10 w-full max-w-md rounded-xl border border-msk-ink/10 bg-white px-3 text-sm leading-10 text-msk-ink/40">
                    Rechercher un gabarit (nom, code…)
                  </div>
                </>
              }
            >
              <div className="grid gap-6 lg:grid-cols-12">
                <div
                  id="lab-listing"
                  className="min-w-0 space-y-3 lg:col-span-8 xl:col-span-9"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      data-lab-row={i}
                      className="rounded-xl border border-msk-ink/8 bg-white px-4 py-3 shadow-sm"
                    >
                      <p className="text-sm font-semibold text-msk-ink">
                        Contrat client commercial MSK — ligne {i + 1}
                      </p>
                      <p className="mt-1 text-xs text-msk-ink/45">
                        Contenu de test pour scroll / bleed / sticky.
                      </p>
                    </div>
                  ))}
                </div>
                <div id="lab-sidebar" className="lg:col-span-4 xl:col-span-3">
                  <TemplateStudioSidebar />
                </div>
              </div>
            </GabaritsStickyChrome>
          </PageShell>
        </main>
      </div>
    </div>
  );
}
