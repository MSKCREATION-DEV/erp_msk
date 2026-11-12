import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvAccess } from "@/lib/suivi/access";
import {
  buildSvMovementsHref,
  parseSvDashboardFilters,
} from "@/lib/suivi/dashboard-period";
import { loadSvDashboard } from "@/lib/suivi/dashboard-load";
import {
  formatSvBaselineDateFr,
  SV_ACCOUNT_KIND_LABEL,
} from "@/lib/suivi/accounts";
import { formatSvXof } from "@/lib/suivi/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { SvDashboardFilters } from "@/components/suivi/dashboard-filters";
import {
  SvCompareBarChart,
  SvExpenseDonut,
  SvFlowAreaChart,
} from "@/components/suivi/dashboard-charts";

export const metadata: Metadata = { title: "Tableau de bord · Suivi" };

const linkQuiet =
  "text-sm font-medium text-msk-blue hover:underline underline-offset-2";

export default async function SuiviDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const user = await requireUser();
  requireSvAccess(user);

  const canAccounts =
    hasPermission(user, "sv.accounts.view") || user.isSuperAdmin;
  const canMovements =
    hasPermission(user, "sv.movements.view") || user.isSuperAdmin;
  const canInvoices =
    hasPermission(user, "sv.invoices.view") || user.isSuperAdmin;
  const canClients =
    hasPermission(user, "sv.clients.view") || user.isSuperAdmin;

  const raw = await searchParams;
  const scope = parseSvDashboardFilters(raw);
  const data = await loadSvDashboard(scope, {
    canAccounts,
    canMovements,
    canInvoices,
    canClients,
  });

  const outHref = buildSvMovementsHref({
    fromIso: scope.fromIso,
    toIso: scope.toIso,
    direction: "OUT",
    compte: scope.compte,
    categorie: scope.categorie,
  });
  const inHref = buildSvMovementsHref({
    fromIso: scope.fromIso,
    toIso: scope.toIso,
    direction: "IN",
    compte: scope.compte,
    categorie: scope.categorie,
  });

  return (
    <PageShell>
      <PageHeader
        title="Tableau de bord"
        description="Trésorerie, conso et dettes clients — base pour voter des budgets."
        backHref="/suivi"
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Suivi", href: "/suivi" },
        ]}
      />

      <div className="space-y-4">
        <SvDashboardFilters
          mode={scope.mode}
          on={scope.on}
          semaine={scope.semaine}
          mois={scope.mois}
          annee={scope.annee}
          compte={scope.compte}
          categorie={scope.categorie}
          periodLabel={scope.label}
        />

        {canAccounts ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.accounts.map((acc) => (
              <Link
                key={acc.id}
                href={`/suivi/comptes/${acc.id}`}
                prefetch={false}
                className="rounded-xl border border-msk-ink/8 bg-white p-4 transition hover:border-msk-blue/30 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-msk-blue/8 text-msk-blue">
                    {acc.kind === "BANK" ? (
                      <Landmark className="size-5" aria-hidden />
                    ) : (
                      <Wallet className="size-5" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
                      {SV_ACCOUNT_KIND_LABEL[acc.kind]}
                    </p>
                    <p
                      className={`mt-1 text-2xl font-semibold tabular-nums ${
                        acc.balance < 0 ? "text-msk-coral" : "text-msk-ink"
                      }`}
                    >
                      {formatSvXof(acc.balance)}
                    </p>
                    <p className="mt-1 text-xs text-msk-ink/40">
                      Solde courant (post-bascule {formatSvBaselineDateFr()}) ·
                      voir le compte
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            {data.accounts.length === 0 ? (
              <Surface className="p-4 sm:col-span-2">
                <p className="text-sm text-msk-ink/55">
                  Aucun compte — ouvrez{" "}
                  <Link href="/suivi/comptes" className={linkQuiet}>
                    Comptes
                  </Link>{" "}
                  après migration / seed.
                </p>
              </Surface>
            ) : null}
          </div>
        ) : null}

        {canMovements ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                href={outHref}
                icon={ArrowDownRight}
                tone="coral"
                label="Sorties (ops)"
                value={formatSvXof(data.current.outOps)}
                hint={`${scope.label} · hors transferts`}
              />
              <KpiCard
                href={inHref}
                icon={ArrowUpRight}
                tone="blue"
                label="Entrées (ops)"
                value={formatSvXof(data.current.inOps)}
                hint={`${scope.label} · hors ouverture`}
              />
              <KpiCard
                href={outHref}
                icon={ArrowDownRight}
                tone="ink"
                label="Conso / jour"
                value={formatSvXof(data.runRate.dailyAvgOut)}
                hint="Moyenne sur la période"
              />
              <Surface className="p-4">
                <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
                  Estimation run-rate
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-msk-ink">
                  {formatSvXof(data.runRate.monthEstimate)}
                  <span className="ml-1 text-xs font-medium text-msk-ink/45">
                    / mois
                  </span>
                </p>
                <p className="mt-0.5 text-sm tabular-nums text-msk-ink/70">
                  {formatSvXof(data.runRate.yearEstimate)}
                  <span className="ml-1 text-xs text-msk-ink/45">/ an</span>
                </p>
                <p className="mt-2 text-[11px] leading-snug text-msk-ink/40">
                  Estimation linéaire (conso période × jours) — pas un budget
                  voté.
                </p>
              </Surface>
            </div>

            <div className="grid gap-3 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <SvFlowAreaChart
                  data={data.series}
                  subtitle={`${data.movementCount} mouvement${data.movementCount === 1 ? "" : "s"} · ${scope.label}`}
                />
              </div>
              <div className="lg:col-span-2">
                <SvExpenseDonut
                  data={data.categories}
                  hrefParams={{
                    fromIso: scope.fromIso,
                    toIso: scope.toIso,
                    compte: scope.compte,
                  }}
                />
              </div>
            </div>

            <SvCompareBarChart
              data={data.compare}
              subtitle={`${scope.label} vs ${scope.prevLabel}`}
            />
          </>
        ) : (
          <Surface className="p-6">
            <p className="text-sm text-msk-ink/55">
              Permission `sv.movements.view` requise pour les flux trésorerie.
            </p>
          </Surface>
        )}

        {(canInvoices || canClients) && (
          <div className="grid gap-3 lg:grid-cols-2">
            {canInvoices ? (
              <Surface className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
                      Factures & dettes
                    </p>
                    <p className="mt-1 text-sm text-msk-ink/50">
                      Encours clients (reste dû)
                    </p>
                  </div>
                  <Receipt className="size-5 text-msk-blue/70" aria-hidden />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs text-msk-ink/45">Reste dû</dt>
                    <dd className="text-xl font-semibold tabular-nums text-msk-coral">
                      {formatSvXof(data.invoices.resteDue)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-msk-ink/45">Factures ouvertes</dt>
                    <dd className="text-xl font-semibold tabular-nums">
                      {data.invoices.unpaidCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-msk-ink/45">
                      Encaissé (période)
                    </dt>
                    <dd className="text-lg font-semibold tabular-nums text-msk-ink">
                      {formatSvXof(data.invoices.amountPaidPeriod)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-msk-ink/45">Payées (stock)</dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {data.invoices.paidCount}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/suivi/factures?reste=1"
                    prefetch={false}
                    className={linkQuiet}
                  >
                    Voir factures à encaisser
                  </Link>
                  <Link
                    href={inHref}
                    prefetch={false}
                    className={linkQuiet}
                  >
                    Entrées période
                  </Link>
                </div>
              </Surface>
            ) : null}

            {canClients ? (
              <Surface className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
                      Top débiteurs
                    </p>
                    <p className="mt-1 text-sm text-msk-ink/50">
                      Clients avec reste &gt; 0
                    </p>
                  </div>
                  <Users className="size-5 text-msk-blue/70" aria-hidden />
                </div>
                {data.debtors.length === 0 ? (
                  <p className="mt-6 text-center text-sm text-msk-ink/45">
                    Aucune dette client.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-msk-ink/6">
                    {data.debtors.map((d) => (
                      <li key={d.id}>
                        <Link
                          href={`/suivi/clients/${d.id}`}
                          prefetch={false}
                          className="flex items-center justify-between gap-3 py-2.5 transition hover:text-msk-blue"
                        >
                          <span className="min-w-0 truncate font-medium">
                            {d.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-msk-coral">
                            {formatSvXof(d.restant)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/suivi/clients"
                  prefetch={false}
                  className={`mt-3 inline-block ${linkQuiet}`}
                >
                  Tous les clients
                </Link>
              </Surface>
            ) : null}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function KpiCard({
  href,
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  href: string;
  icon: typeof Wallet;
  tone: "blue" | "coral" | "ink";
  label: string;
  value: string;
  hint: string;
}) {
  const iconBg =
    tone === "coral"
      ? "bg-msk-coral/10 text-msk-coral"
      : tone === "ink"
        ? "bg-msk-ink/6 text-msk-ink/70"
        : "bg-msk-blue/8 text-msk-blue";
  return (
    <Link
      href={href}
      prefetch={false}
      className="rounded-xl border border-msk-ink/8 bg-white p-4 transition hover:border-msk-blue/30 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex size-9 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-msk-ink">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-msk-ink/40">{hint}</p>
        </div>
      </div>
    </Link>
  );
}
