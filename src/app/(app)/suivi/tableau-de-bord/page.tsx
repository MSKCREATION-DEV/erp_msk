import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Clock,
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
import type { SvDashboardAlert } from "@/lib/suivi/dashboard-stats";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { SvDashboardFilters } from "@/components/suivi/dashboard-filters";
import {
  SvCompareBarChart,
  SvExpenseDonut,
  SvFlowAreaChart,
} from "@/components/suivi/dashboard-charts";
import { gridKpi2, gridKpi4 } from "@/lib/ui/layout-grids";

export const metadata: Metadata = { title: "Tableau de bord · Suivi" };

const linkQuiet =
  "text-sm font-medium text-msk-blue hover:underline underline-offset-2";

const sectionTitle =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/40";

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
  const canExpenses =
    hasPermission(user, "sv.expenses.view") || user.isSuperAdmin;

  const raw = await searchParams;
  const scope = parseSvDashboardFilters(raw);
  const data = await loadSvDashboard(scope, {
    canAccounts,
    canMovements,
    canInvoices,
    canClients,
    canExpenses,
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

  const chargeAlerts = data.alerts.filter(
    (a) => a.kind === "charge_retard" || a.kind === "charge_bientot",
  );
  const clientAlerts = data.alerts.filter((a) => a.kind === "dette_client");

  return (
    <PageShell>
      <PageHeader
        title="Tableau de bord"
        description="Trésorerie, charges fournisseurs, factures clients et alertes — base pour voter des budgets."
        backHref="/suivi"
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Suivi", href: "/suivi" },
        ]}
      />

      <div className="space-y-8">
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

        {(chargeAlerts.length > 0 || clientAlerts.length > 0) && (
          <div className="space-y-4">
            {chargeAlerts.length > 0 && canExpenses ? (
              <AlertsPanel
                title="Charges à traiter"
                subtitle="Fournisseurs — en retard ou bientôt dues"
                alerts={chargeAlerts}
                seeAllHref="/suivi/charges?impaye=1"
                seeAllLabel="Toutes les non payées"
              />
            ) : null}
            {clientAlerts.length > 0 && canClients ? (
              <AlertsPanel
                title="Dettes clients à traiter"
                subtitle="Encours clients importants — à encaisser"
                alerts={clientAlerts}
                seeAllHref="/suivi/clients"
                seeAllLabel="Tous les clients"
              />
            ) : null}
          </div>
        )}

        {canAccounts ? (
          <section aria-labelledby="sv-tb-comptes" className="space-y-3">
            <h2 id="sv-tb-comptes" className={sectionTitle}>
              Comptes · soldes courants
            </h2>
            <div className={gridKpi2}>
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
          </section>
        ) : null}

        {canMovements ? (
          <section aria-labelledby="sv-tb-flux" className="space-y-3">
            <h2 id="sv-tb-flux" className={sectionTitle}>
              Trésorerie · {scope.label}
            </h2>
            <div className={gridKpi4}>
              <KpiCard
                href={outHref}
                icon={ArrowDownRight}
                tone="coral"
                label="Sorties"
                value={formatSvXof(data.current.outOps)}
                hint={`${scope.label} · hors transferts`}
              />
              <KpiCard
                href={inHref}
                icon={ArrowUpRight}
                tone="blue"
                label="Entrées"
                value={formatSvXof(data.current.inOps)}
                hint={`${scope.label} · hors ouverture`}
              />
              <KpiCard
                href={outHref}
                icon={ArrowDownRight}
                tone="ink"
                label="Dépense / jour"
                value={formatSvXof(data.runRate.dailyAvgOut)}
                hint="Moyenne sur la période"
              />
              <Surface className="p-4">
                <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
                  Estimation mensuelle
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
                  Si on continue au même rythme : projection sur 30 et 365 jours
                  — ce n’est pas un budget voté.
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
          </section>
        ) : (
          <Surface className="p-6">
            <p className="text-sm text-msk-ink/55">
              Droit « voir les mouvements » requis pour les flux de trésorerie.
            </p>
          </Surface>
        )}

        {canInvoices ? (
          <section aria-labelledby="sv-tb-factures" className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id="sv-tb-factures" className={sectionTitle}>
                Factures clients
              </h2>
              <p className="text-sm text-msk-ink/45">
                Encours à encaisser — distinct des charges fournisseurs
              </p>
            </div>
            <div className={gridKpi4}>
              <KpiCard
                href="/suivi/factures?reste=1"
                icon={Receipt}
                tone="coral"
                label="Reste dû"
                value={formatSvXof(data.invoices.resteDue)}
                hint="Total à encaisser"
              />
              <KpiCard
                href="/suivi/factures?reste=1"
                icon={Receipt}
                tone="blue"
                label="Factures ouvertes"
                value={String(data.invoices.unpaidCount)}
                hint="Émises ou partielles"
              />
              <KpiCard
                href={inHref}
                icon={ArrowUpRight}
                tone="cyan"
                label="Encaissé (période)"
                value={formatSvXof(data.invoices.amountPaidPeriod)}
                hint={scope.label}
              />
              <KpiCard
                href="/suivi/factures"
                icon={Receipt}
                tone="ink"
                label="Déjà payées"
                value={String(data.invoices.paidCount)}
                hint="Soldées"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/suivi/factures?reste=1"
                prefetch={false}
                className={linkQuiet}
              >
                Factures à encaisser
              </Link>
              <Link href={inHref} prefetch={false} className={linkQuiet}>
                Entrées période
              </Link>
            </div>

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
          </section>
        ) : null}

        {canExpenses ? (
          <section aria-labelledby="sv-tb-charges" className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id="sv-tb-charges" className={sectionTitle}>
                Charges fournisseurs
              </h2>
              <p className="text-sm text-msk-ink/45">
                Orange, EDM, loyer — à payer à l’extérieur
              </p>
            </div>
            <div className={gridKpi4}>
              <KpiCard
                href="/suivi/charges?impaye=1"
                icon={Building2}
                tone="coral"
                label="Reste à payer"
                value={formatSvXof(data.expenses.resteAPayer)}
                hint="Total ouvert"
              />
              <KpiCard
                href="/suivi/charges?impaye=1"
                icon={Building2}
                tone="ink"
                label="Non payées"
                value={String(data.expenses.unpaidCount)}
                hint="Émises ou partielles"
              />
              <KpiCard
                href="/suivi/charges"
                icon={ArrowDownRight}
                tone="blue"
                label="Payé (période)"
                value={formatSvXof(data.expenses.amountPaidPeriod)}
                hint={scope.label}
              />
              <KpiCard
                href="/suivi/charges"
                icon={Building2}
                tone="cyan"
                label="Déjà payées"
                value={String(data.expenses.paidCount)}
                hint="Soldées"
              />
            </div>

            {(data.expenses.overdueCount > 0 ||
              data.expenses.dueSoonCount > 0) && (
              <div className={gridKpi2}>
                <Link
                  href="/suivi/charges?echeance=retard"
                  prefetch={false}
                  className="rounded-lg border border-msk-coral/25 bg-msk-coral/5 px-4 py-3 transition hover:border-msk-coral/40"
                >
                  <p className="text-[11px] font-medium uppercase tracking-caps text-msk-coral/80">
                    En retard
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-msk-coral">
                    {data.expenses.overdueCount} ·{" "}
                    {formatSvXof(data.expenses.overdueAmount)}
                  </p>
                </Link>
                <Link
                  href="/suivi/charges?echeance=bientot"
                  prefetch={false}
                  className="rounded-lg border border-msk-blue/20 bg-msk-blue/4 px-4 py-3 transition hover:border-msk-blue/35"
                >
                  <p className="text-[11px] font-medium uppercase tracking-caps text-msk-blue/80">
                    Bientôt dues
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-msk-ink">
                    {data.expenses.dueSoonCount} ·{" "}
                    {formatSvXof(data.expenses.dueSoonAmount)}
                  </p>
                </Link>
              </div>
            )}

            <Surface className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
                Répartition par type
              </p>
              {data.expenses.byCategory.length > 0 ? (
                <ul className="mt-3 divide-y divide-msk-ink/6">
                  {data.expenses.byCategory.map((c) => (
                    <li key={c.category}>
                      <Link
                        href={`/suivi/charges?impaye=1&type=${c.category}`}
                        prefetch={false}
                        className="flex items-center justify-between gap-3 py-2 transition hover:text-msk-blue"
                      >
                        <span className="text-sm font-medium">
                          {c.label}
                          <span className="ml-1.5 text-xs font-normal text-msk-ink/40">
                            ({c.count})
                          </span>
                        </span>
                        <span className="tabular-nums text-sm text-msk-coral">
                          {formatSvXof(c.amountDue)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-msk-ink/45">
                  Aucune charge à payer.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/suivi/charges?echeance=retard"
                  prefetch={false}
                  className={linkQuiet}
                >
                  Voir les retards
                </Link>
                <Link
                  href="/suivi/charges?impaye=1"
                  prefetch={false}
                  className={linkQuiet}
                >
                  Charges non payées
                </Link>
                <Link
                  href="/suivi/charges"
                  prefetch={false}
                  className={linkQuiet}
                >
                  Toutes les charges
                </Link>
              </div>
            </Surface>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}

function AlertsPanel({
  title,
  subtitle,
  alerts,
  seeAllHref,
  seeAllLabel,
}: {
  title: string;
  subtitle: string;
  alerts: SvDashboardAlert[];
  seeAllHref?: string;
  seeAllLabel?: string;
}) {
  const shown = alerts.slice(0, 6);
  const urgentCount = alerts.filter((a) => a.severity === "urgent").length;
  const isCharges = alerts.some(
    (a) => a.kind === "charge_retard" || a.kind === "charge_bientot",
  );

  return (
    <Surface className="overflow-hidden p-0">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b border-msk-ink/6 px-4 py-3.5 sm:px-5 ${
          isCharges ? "bg-msk-coral/4" : "bg-msk-blue/4"
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
              isCharges
                ? "bg-msk-coral/10 text-msk-coral"
                : "bg-msk-blue/10 text-msk-blue"
            }`}
          >
            {isCharges ? (
              <Building2 className="size-4" aria-hidden />
            ) : (
              <Users className="size-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-msk-ink">{title}</p>
              <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-msk-ink/55 ring-1 ring-msk-ink/8">
                {alerts.length}
              </span>
              {urgentCount > 0 ? (
                <span className="rounded-md bg-msk-coral/10 px-1.5 py-0.5 text-[11px] font-semibold text-msk-coral">
                  {urgentCount} urgent{urgentCount > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-msk-ink/45">{subtitle}</p>
          </div>
        </div>
        {seeAllHref && seeAllLabel ? (
          <Link
            href={seeAllHref}
            prefetch={false}
            className="shrink-0 text-sm font-medium text-msk-blue hover:underline underline-offset-2"
          >
            {seeAllLabel}
          </Link>
        ) : null}
      </div>

      <ul className="divide-y divide-msk-ink/6">
        {shown.map((a, i) => {
          const dueMatch = a.detail.match(/Échéance le ([^·]+)(?:·\s*(.+))?/);
          const dueDate = dueMatch?.[1]?.trim();
          const dueExtra = dueMatch?.[2]?.trim();
          return (
            <li key={`${a.kind}-${a.href}-${i}`}>
              <Link
                href={a.href}
                prefetch={false}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 transition hover:bg-msk-chalk/50 sm:gap-4 sm:px-5"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    a.severity === "urgent"
                      ? "bg-msk-coral/10 text-msk-coral"
                      : "bg-msk-ink/5 text-msk-ink/55"
                  }`}
                  aria-hidden
                >
                  {a.kind === "charge_bientot" ? (
                    <Clock className="size-4" />
                  ) : a.kind === "dette_client" ? (
                    <Users className="size-4" />
                  ) : (
                    <AlertTriangle className="size-4" />
                  )}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-msk-ink group-hover:text-msk-blue">
                    {a.title}
                  </p>
                  {dueDate ? (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span
                        className={`tabular-nums ${
                          a.severity === "urgent"
                            ? "font-medium text-msk-coral"
                            : "text-msk-ink/55"
                        }`}
                      >
                        {dueDate}
                      </span>
                      {dueExtra ? (
                        <span
                          className={
                            a.severity === "urgent"
                              ? "text-msk-coral/80"
                              : "text-msk-ink/40"
                          }
                        >
                          {dueExtra}
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-msk-ink/45">{a.detail}</p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={`tabular-nums text-sm font-semibold ${
                      a.severity === "urgent" ? "text-msk-coral" : "text-msk-ink"
                    }`}
                  >
                    {formatSvXof(a.amount)}
                  </p>
                  <p className="text-[10px] uppercase tracking-caps text-msk-ink/35">
                    {a.kind === "dette_client" ? "À encaisser" : "À payer"}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {alerts.length > shown.length ? (
        <div className="border-t border-msk-ink/6 px-4 py-2.5 text-center text-xs text-msk-ink/40 sm:px-5">
          + {alerts.length - shown.length} autre
          {alerts.length - shown.length > 1 ? "s" : ""}
          {seeAllHref ? (
            <>
              {" · "}
              <Link
                href={seeAllHref}
                prefetch={false}
                className="font-medium text-msk-blue hover:underline"
              >
                tout voir
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
    </Surface>
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
  tone: "blue" | "coral" | "ink" | "cyan";
  label: string;
  value: string;
  hint: string;
}) {
  const iconBg =
    tone === "coral"
      ? "bg-msk-coral/10 text-msk-coral"
      : tone === "ink"
        ? "bg-msk-ink/6 text-msk-ink/70"
        : tone === "cyan"
          ? "bg-[#00ACEE]/12 text-[#1384CB]"
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
