import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import {
  formatLeaveDays,
  formatSeniority,
  greetingFor,
  loadEspaceOverview,
  monthLabelFr,
} from "@/lib/espace/overview";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { KpiGrid } from "@/components/ui/kpi-card";
import { EspaceIdentityHero } from "@/components/espace/espace-identity-hero";
import { prisma } from "@/lib/prisma";
import { signedGedUrl } from "@/lib/ged/storage";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mon espace" };

export default async function EspaceHubPage() {
  const user = await requireUser();
  const overview = await loadEspaceOverview(user.id);

  const canLeave = hasPermission(user, "self.leave.request");
  const canAbsence = hasPermission(user, "self.absence.submit");
  const canTimesheet = hasPermission(user, "self.timesheet.submit");
  const canDocs =
    hasPermission(user, "self.documents.view") ||
    hasPermission(user, "self.payslip.view");

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

  const empFull = await prisma.rhEmployee.findUnique({
    where: { id: employee.id },
    select: {
      department: true,
      employeeCode: true,
      avatarDocumentId: true,
    },
  });

  let avatarUrl: string | null = null;
  if (empFull?.avatarDocumentId) {
    const doc = await prisma.document.findUnique({
      where: { id: empFull.avatarDocumentId },
      select: { storagePath: true },
    });
    if (doc?.storagePath) {
      try {
        avatarUrl = await signedGedUrl(doc.storagePath, 3600);
      } catch {
        avatarUrl = null;
      }
    }
  }

  const hireLabel = employee.hireDate
    ? `Arrivée ${employee.hireDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    : null;

  const quickActions = [
    canLeave && {
      href: "/espace/conges/nouveau",
      label: "Demander un congé",
    },
    canAbsence && {
      href: "/espace/absences/nouveau",
      label: "Déclarer une absence",
    },
    canTimesheet && {
      href: "/espace/heures/nouvelle-semaine",
      label: "Saisir mes heures",
    },
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <PageShell>
      <PageHeader
        title="Mon espace"
        description="Votre situation RH — heures, congés, absences et documents."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Mon espace" },
        ]}
      />

      <EspaceIdentityHero
        greeting={greeting}
        firstName={employee.firstName}
        lastName={employee.lastName}
        jobTitle={employee.jobTitle}
        department={empFull?.department}
        employeeCode={empFull?.employeeCode}
        status={employee.status}
        hireLabel={hireLabel}
        seniority={seniority}
        contractType={activeContract?.type ?? null}
        avatarUrl={avatarUrl}
      />

      {alerts.length > 0 ? (
        <Surface className="p-0">
          <ul className="divide-y divide-msk-ink/6 px-5 py-1 sm:px-6">
            {alerts.map((a) => (
              <li key={a.id}>
                <Link
                  prefetch={false}
                  href={a.href}
                  className={cn(
                    "flex items-center gap-2 py-2.5 text-sm transition hover:text-msk-blue",
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
        </Surface>
      ) : null}

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
            hint: "Congés",
          },
          {
            label: "Absences en attente",
            value: String(kpis.absencesDeclared),
            hint: "Traitement RH",
          },
          {
            label: "Dernier bulletin",
            value: kpis.latestPayslip
              ? monthLabelFr(kpis.latestPayslip.month, kpis.latestPayslip.year)
              : "—",
            hint: canDocs ? "Dans Mes documents" : "Aucun",
          },
        ]}
      />

      {quickActions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              prefetch={false}
              href={a.href}
              className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white transition hover:bg-msk-blue/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40"
            >
              {a.label}
            </Link>
          ))}
        </div>
      ) : null}

      <Surface className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-msk-blue" aria-hidden />
          <p className="text-sm font-semibold text-msk-ink">Activité récente</p>
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
    </PageShell>
  );
}
