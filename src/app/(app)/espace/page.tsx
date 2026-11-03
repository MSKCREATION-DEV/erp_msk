import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  Clock,
  FileSignature,
  FileText,
  FolderOpen,
  PenLine,
  Receipt,
  ScrollText,
  UserCog,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import {
  formatLeaveDays,
  formatSeniority,
  greetingFor,
  loadEspaceOverview,
  monthLabelFr,
} from "@/lib/espace/overview";
import {
  CONTRACT_TYPE_LABEL,
  EMPLOYEE_STATUS_LABEL,
  employeeStatusTone,
  REGLEMENT_STATUS_LABEL,
  reglementStatusTone,
} from "@/lib/rh/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { KpiGrid } from "@/components/ui/kpi-card";
import {
  MetricNavCard,
  MetricNavKpi,
} from "@/components/ui/metric-nav-card";
import { ReglementSignButton } from "@/components/rh/reglement-sign-button";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import { listEmployeeRhDocs } from "@/lib/rh/docs-query";
import { RH_DOC } from "@/lib/rh/docs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mon espace" };

export default async function EspaceHubPage() {
  const user = await requireUser();
  const overview = await loadEspaceOverview(user.id);

  const canLeave = hasPermission(user, "self.leave.request");
  const canAbsence = hasPermission(user, "self.absence.submit");
  const canTimesheet = hasPermission(user, "self.timesheet.submit");
  const canDocs = hasPermission(user, "self.documents.view");
  const canPayslip =
    hasPermission(user, "self.payslip.view") || canDocs;
  const canProfile = hasPermission(user, "self.profile.edit");

  if (!overview) {
    return (
      <PageShell>
        <PageHeader
          title="Mon espace"
          description="Votre portail RH personnel."
          breadcrumbs={[
            { label: "Accueil", href: "/accueil" },
            { label: "Mon espace" },
          ]}
        />
        <Surface className="p-6 text-sm text-msk-ink/60">
          Aucune fiche RH n&apos;est encore liée à votre compte — contactez
          l&apos;administration RH.
        </Surface>
      </PageShell>
    );
  }

  const { employee, activeContract, kpis, alerts, timeline } = overview;
  const seniority = formatSeniority(employee.hireDate);
  const greeting = greetingFor();

  const reglementDocs = await listEmployeeRhDocs(
    employee.id,
    activeContract ? [activeContract.id] : [],
  );
  const reglementDoc = reglementDocs.find((d) => d.kind === RH_DOC.REGLEMENT);

  const quickActions = [
    canLeave && {
      href: "/espace/conges",
      label: "Demander un congé",
    },
    canAbsence && {
      href: "/espace/absences",
      label: "Déclarer une absence",
    },
    canTimesheet && {
      href: "/espace/heures",
      label: "Mes heures",
    },
    canDocs && {
      href: "/espace/documents",
      label: "Mes documents",
    },
    canPayslip &&
      kpis.latestPayslip?.gedDocumentId && {
        href: "/espace/bulletins",
        label: "Dernier bulletin",
      },
    canProfile && {
      href: "/espace/profil",
      label: "Mon profil",
    },
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    soon?: boolean;
  }>;

  const modules = [
    canLeave && {
      href: "/espace/conges",
      title: "Mes congés",
      description: "Solde, demandes et historique",
      icon: CalendarDays,
      footer: (
        <MetricNavKpi
          value={formatLeaveDays(kpis.leaveBalance)}
          hint={
            kpis.leavePending > 0
              ? `${kpis.leavePending} en attente`
              : "Solde disponible"
          }
        />
      ),
    },
    canAbsence && {
      href: "/espace/absences",
      title: "Mes absences",
      description: "Déclarations et suivi RH",
      icon: UserCog,
      footer: (
        <MetricNavKpi
          value={String(kpis.absencesDeclared)}
          hint="À qualifier"
        />
      ),
    },
    canTimesheet && {
      href: "/espace/heures",
      title: "Mes heures",
      description: "Feuilles hebdomadaires",
      icon: Clock,
      footer: (
        <MetricNavKpi
          value={String(kpis.timesheetsSubmitted)}
          hint="En validation"
        />
      ),
    },
    {
      href: "/espace/contrats",
      title: "Mes contrats",
      description: "Parcours et avenants",
      icon: ScrollText,
      footer: activeContract ? (
        <MetricNavKpi
          value={CONTRACT_TYPE_LABEL[activeContract.type]}
          hint="Actuel"
        />
      ) : undefined,
    },
    canDocs && {
      href: "/espace/documents",
      title: "Mes documents",
      description: "Vue personnelle GED",
      icon: FolderOpen,
      footer: (
        <MetricNavKpi value={String(kpis.docsCount)} hint="Documents" />
      ),
    },
    canPayslip && {
      href: "/espace/bulletins",
      title: "Mes bulletins",
      description: "Coffre de paie",
      icon: Receipt,
      footer: kpis.latestPayslip ? (
        <MetricNavKpi
          value={`${String(kpis.latestPayslip.month).padStart(2, "0")}/${kpis.latestPayslip.year}`}
          hint="Dernier"
        />
      ) : (
        <MetricNavKpi value="—" hint="Aucun" />
      ),
    },
    canProfile && {
      href: "/espace/profil",
      title: "Mon profil",
      description: "Dossier personnel (lecture)",
      icon: UserRound,
    },
    {
      href: "/profil/signature",
      title: "Ma signature",
      description: "Signature électronique",
      icon: PenLine,
      gated: true,
      gatedHint: "Bientôt — signature électronique (phase dédiée)",
    },
  ].filter(Boolean) as Array<{
    href: string;
    title: string;
    description: string;
    icon: typeof CalendarDays;
    footer?: ReactNode;
    gated?: boolean;
    gatedHint?: string;
  }>;

  return (
    <PageShell>
      <PageHeader
        title="Mon espace"
        description="Votre portail RH personnel — situation, demandes et documents."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Mon espace" },
        ]}
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/8 via-white to-[#00ACEE]/6 px-5 py-6 sm:px-6">
          <p className="text-sm font-medium text-msk-blue">
            {greeting}, {employee.firstName}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-msk-ink sm:text-3xl">
            {employee.firstName}{" "}
            <span className="font-accent text-msk-blue">{employee.lastName}</span>
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-msk-ink/60">
            {employee.jobTitle ? (
              <span className="font-medium text-msk-ink/80">
                {employee.jobTitle}
              </span>
            ) : null}
            {activeContract ? (
              <>
                <span aria-hidden className="text-msk-ink/25">
                  ·
                </span>
                <span>{CONTRACT_TYPE_LABEL[activeContract.type]}</span>
              </>
            ) : null}
            {employee.hireDate ? (
              <>
                <span aria-hidden className="text-msk-ink/25">
                  ·
                </span>
                <span>
                  Arrivée{" "}
                  {employee.hireDate.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {seniority ? ` (${seniority})` : ""}
                </span>
              </>
            ) : null}
            <Badge tone={employeeStatusTone(employee.status)}>
              {EMPLOYEE_STATUS_LABEL[employee.status]}
            </Badge>
          </div>
        </div>

        {alerts.length > 0 ? (
          <ul className="divide-y divide-msk-ink/6 px-5 py-3 sm:px-6">
            {alerts.map((a) => (
              <li key={a.id}>
                <Link
                  prefetch={false}
                  href={a.href}
                  className={cn(
                    "flex items-center gap-2 py-2 text-sm transition hover:text-msk-blue",
                    a.tone === "coral" && "text-msk-coral",
                    a.tone === "blue" && "text-msk-blue",
                    a.tone === "ink" && "text-msk-ink/70",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      a.tone === "coral" && "bg-msk-coral",
                      a.tone === "blue" && "bg-msk-blue",
                      a.tone === "ink" && "bg-msk-ink/40",
                    )}
                    aria-hidden
                  />
                  {a.message}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </Surface>

      <KpiGrid
        items={[
          {
            label: "Solde congés",
            value: formatLeaveDays(kpis.leaveBalance),
            hint:
              kpis.leaveApprovedUpcoming > 0
                ? `${kpis.leaveApprovedUpcoming} congé(s) à venir`
                : "Disponible",
          },
          {
            label: "Demandes en attente",
            value: String(kpis.leavePending),
            hint: "Congés à valider",
          },
          {
            label: "Absences à qualifier",
            value: String(kpis.absencesDeclared),
            hint: "Déclarées",
          },
          {
            label: "Dernier bulletin",
            value: kpis.latestPayslip
              ? monthLabelFr(kpis.latestPayslip.month, kpis.latestPayslip.year)
              : "—",
            hint: kpis.latestPayslip ? "Publié" : "Aucun bulletin",
          },
        ]}
      />

      {quickActions.length > 0 ? (
        <Surface className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-caps text-msk-ink/45">
            Actions rapides
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickActions.map((a) =>
              a.soon ? (
                <span
                  key={a.label}
                  className="inline-flex h-9 cursor-not-allowed items-center rounded-lg border border-msk-ink/10 bg-msk-chalk/80 px-3 text-sm text-msk-ink/40"
                >
                  {a.label} · bientôt
                </span>
              ) : (
                <Link
                  key={a.href + a.label}
                  prefetch={false}
                  href={a.href}
                  className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white transition hover:bg-msk-blue/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40"
                >
                  {a.label}
                </Link>
              ),
            )}
          </div>
        </Surface>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => (
          <MetricNavCard
            key={m.title}
            href={m.href}
            icon={m.icon}
            title={m.title}
            description={m.description}
            footer={m.footer}
            gated={m.gated}
            gatedHint={m.gatedHint}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Surface className="p-5 lg:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-msk-blue" aria-hidden />
            <p className="text-sm font-semibold text-msk-ink">
              Activité récente
            </p>
          </div>
          {timeline.length === 0 ? (
            <p className="text-sm text-msk-ink/50">
              Aucun événement récent pour le moment.
            </p>
          ) : (
            <ol className="relative space-y-0 border-l border-msk-ink/10 pl-4">
              {timeline.map((item) => (
                <li key={item.id} className="relative pb-4 last:pb-0">
                  <span
                    className="absolute -left-[1.15rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-msk-blue"
                    aria-hidden
                  />
                  <Link
                    prefetch={false}
                    href={item.href}
                    className="block rounded-lg py-0.5 transition hover:bg-msk-blue/4"
                  >
                    <p className="text-sm font-medium text-msk-ink">
                      {item.title}
                    </p>
                    <p className="text-xs text-msk-ink/50">{item.detail}</p>
                    <p className="mt-0.5 text-[11px] text-msk-ink/35">
                      {item.at.toLocaleString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Surface>

        <Surface className="flex flex-col p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-msk-blue" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-msk-ink">
                Règlement intérieur
              </p>
              <Badge tone={reglementStatusTone(employee.reglementStatus)}>
                {REGLEMENT_STATUS_LABEL[employee.reglementStatus]}
              </Badge>
            </div>
          </div>
          <p className="mt-3 flex-1 text-xs leading-relaxed text-msk-ink/50">
            Accusez réception du règlement pour finaliser votre dossier
            collaborateur.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {reglementDoc ? (
              <DocDownloadButton
                documentId={reglementDoc.id}
                label="Voir le PDF"
                size="sm"
              />
            ) : null}
            {employee.reglementStatus === "PENDING" ? (
              <ReglementSignButton />
            ) : null}
          </div>
        </Surface>
      </div>
    </PageShell>
  );
}
