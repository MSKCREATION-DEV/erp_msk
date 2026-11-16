import { GabaritsStickyChrome } from "@/components/admin/gabarits-sticky-chrome";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "UI Lab — Gabarit détail sticky",
  robots: { index: false, follow: false },
};

/**
 * Lab fiche gabarit — sticky bandeau + colonne droite (exemplaire / meta)
 * sans session auth. Miroir de `/administration/gabarits/[id]`.
 */
export default function GabaritDetailStickyLabPage() {
  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-[#F4F6F9]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center border-b border-msk-ink/8 bg-white px-4 text-sm font-medium text-msk-ink">
          UI Lab — sticky fiche gabarit
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
                    title="Devis standard MSK"
                    description="PDF devis client — lignes catalogue, totaux, mentions légales."
                    backHref="/ui-lab/gabarits-sticky"
                    backLabel="Retour aux gabarits"
                    breadcrumbs={[
                      { label: "Administration" },
                      { label: "Gabarits" },
                      { label: "Devis standard MSK" },
                    ]}
                  />
                  <Surface className="overflow-hidden p-0">
                    <div className="bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold tracking-tight text-msk-ink">
                          Devis standard MSK
                        </p>
                        <Badge tone="blue">Devis</Badge>
                        <Badge tone="success">Actif</Badge>
                        <span className="text-xs tabular-nums text-msk-ink/45">
                          v1
                        </span>
                      </div>
                      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-caps text-msk-ink/40">
                            Code
                          </dt>
                          <dd className="mt-1 font-mono text-sm text-msk-ink">
                            devis_standard_msk
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-caps text-msk-ink/40">
                            Variables
                          </dt>
                          <dd className="mt-1 text-sm text-msk-ink">8</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-caps text-msk-ink/40">
                            Versions
                          </dt>
                          <dd className="mt-1 text-sm text-msk-ink">2</dd>
                        </div>
                      </dl>
                    </div>
                  </Surface>
                </>
              }
            >
              <div className="grid gap-6 lg:grid-cols-12">
                <div
                  id="lab-listing"
                  className="min-w-0 space-y-4 lg:col-span-8 xl:col-span-9"
                >
                  {Array.from({ length: 16 }).map((_, i) => (
                    <Surface
                      key={i}
                      data-lab-row={i}
                      className="space-y-2 p-5"
                    >
                      <p className="text-sm font-semibold text-msk-ink">
                        Bloc contenu publié — section {i + 1}
                      </p>
                      <p className="text-xs leading-relaxed text-msk-ink/45">
                        Contenu de test pour scroll / sticky colonne droite fiche
                        gabarit (slots, historique, démos).
                      </p>
                    </Surface>
                  ))}
                </div>
                <div id="lab-sidebar" className="lg:col-span-4 xl:col-span-3">
                  <aside
                    id="gabarit-detail-sidebar"
                    className="flex flex-col gap-4 lg:sticky lg:top-[var(--gabarits-sticky-top,13.75rem)] lg:z-10 lg:self-start"
                  >
                    <Surface className="overflow-hidden p-0">
                      <div className="space-y-1 border-b border-msk-ink/6 px-4 py-3">
                        <h2 className="text-sm font-semibold text-msk-ink">
                          Exemplaire
                        </h2>
                        <p className="text-[11px] text-msk-ink/45">
                          Miniature lab (pas de PDF réel).
                        </p>
                      </div>
                      <div className="p-4">
                        <div
                          id="lab-exemplaire-thumb"
                          className="flex h-52 w-full items-center justify-center rounded-xl border border-msk-ink/8 bg-msk-chalk text-xs font-medium text-msk-ink/40"
                        >
                          Miniature PDF
                        </div>
                      </div>
                    </Surface>
                    <Surface className="space-y-2 p-4">
                      <h2 className="text-sm font-semibold text-msk-ink">
                        Règles gabarit
                      </h2>
                      <p className="font-mono text-[11px] text-msk-blue">
                        {"{{client.nom}}"}
                      </p>
                      <p className="font-mono text-[11px] text-msk-ink/60">
                        # Titre
                      </p>
                    </Surface>
                    <Surface className="p-4">
                      <p className="text-xs text-msk-ink/45">
                        Actions Télécharger / Playground (lab).
                      </p>
                    </Surface>
                  </aside>
                </div>
              </div>
            </GabaritsStickyChrome>
          </PageShell>
        </main>
      </div>
    </div>
  );
}
