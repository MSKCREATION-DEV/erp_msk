import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { fetchTvaAssistee } from "@/lib/comptabilite/reports";
import { getEurXofRate } from "@/lib/comptabilite/fx";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { KpiGrid } from "@/components/ui/kpi-card";
import { formatXof } from "@/lib/comptabilite/money";
import { PatenteForm } from "@/components/comptabilite/patente-form";
import { FxRateForm } from "@/components/comptabilite/fx-rate-form";

export const metadata: Metadata = { title: "Fiscalité assistée" };

const PATENTE_STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payée",
  OVERDUE: "En retard",
};

export default async function ComptabiliteFiscalitePage() {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.access")) redirect("/accueil");

  const year = new Date().getFullYear();
  const canManage = hasPermission(user, "cpt.fiscalite.manage");

  const [tva, patentes, currentRate] = await Promise.all([
    fetchTvaAssistee({ year }),
    prisma.budPatenteDue.findMany({
      where: { exercise: { year } },
      orderBy: { dueDate: "asc" },
    }),
    getEurXofRate(),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Fiscalité assistée"
        description="TVA collectée/récupérable, patente, taux de change."
        backHref="/comptabilite"
        backLabel="Retour Comptabilité"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Fiscalité" },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-msk-ink">
          TVA assistée — {year}
        </h2>
        <KpiGrid
          items={[
            { label: "TVA collectée", value: formatXof(tva.collectee) },
            { label: "TVA récupérable", value: formatXof(tva.deductible) },
            { label: "TVA nette due", value: formatXof(tva.nette) },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-msk-ink">Patente</h2>
        {patentes.length === 0 ? (
          <Surface className="p-8 text-center text-sm text-msk-ink/50">
            Aucune échéance de patente pour {year}.
          </Surface>
        ) : (
          <div className="space-y-3">
            {patentes.map((p) => (
              <Surface key={p.id} className="p-5">
                {canManage ? (
                  <PatenteForm
                    patente={{
                      id: p.id,
                      label: p.label,
                      dueDate: p.dueDate,
                      amount: p.amount,
                      status: p.status,
                      note: p.note,
                    }}
                  />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-msk-ink">
                        {p.label}
                      </p>
                      <p className="text-xs text-msk-ink/45">
                        Échéance {p.dueDate.toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{formatXof(p.amount)}</span>
                      <Badge
                        tone={
                          p.status === "PAID"
                            ? "success"
                            : p.status === "OVERDUE"
                              ? "coral"
                              : "muted"
                        }
                      >
                        {PATENTE_STATUS_LABEL[p.status]}
                      </Badge>
                    </div>
                  </div>
                )}
              </Surface>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-msk-ink">
          Taux de change EUR → XOF
        </h2>
        <Surface className="p-5">
          {canManage ? (
            <FxRateForm currentRate={currentRate} />
          ) : (
            <p className="text-sm text-msk-ink/70">
              1 EUR ={" "}
              <span className="font-medium text-msk-ink">
                {currentRate.toLocaleString("fr-FR")} XOF
              </span>
            </p>
          )}
        </Surface>
      </section>
    </PageShell>
  );
}
