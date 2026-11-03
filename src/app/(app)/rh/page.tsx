import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Clock,
  FileSignature,
  Landmark,
  UserCog,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { KpiGrid } from "@/components/ui/kpi-card";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "RH" };

export default async function RhHubPage() {
  const user = await requireUser();
  if (!hasPermission(user, "rh.access")) redirect("/accueil");

  const [
    activeEmployees,
    pendingLeaves,
    declaredAbsences,
    submittedSheets,
    pendingProfileChanges,
  ] = await Promise.all([
    prisma.rhEmployee.count({ where: { status: "ACTIVE" } }),
    prisma.rhLeaveRequest.count({ where: { status: "PENDING" } }),
    prisma.rhAbsence.count({ where: { status: "DECLARED" } }),
    prisma.rhTimesheet.count({ where: { status: "SUBMITTED" } }),
    prisma.rhProfileChangeRequest.count({ where: { status: "PENDING" } }),
  ]);

  const canEmployees = hasAnyPermission(user, [
    "rh.employees.view",
    "rh.employees.manage",
  ]);
  const canProfileReview = hasPermission(user, "rh.employees.manage");
  const canContracts = hasPermission(user, "rh.contracts.manage");
  const canLeave = hasAnyPermission(user, [
    "rh.leave.validate",
    "rh.leave.view_team",
  ]);
  const canAbsence = hasPermission(user, "rh.absence.manage");
  const canTimesheet = hasPermission(user, "rh.timesheet.validate");
  const canPaie = hasAnyPermission(user, [
    "rh.payroll.view",
    "rh.payroll.run",
    "rh.payroll.approve",
  ]);
  const canInps = hasAnyPermission(user, [
    "rh.inps.manage",
    "rh.payroll.view",
  ]);

  const navItems = [
    canEmployees && {
      href: "/rh/collaborateurs",
      label: "Collaborateurs",
      icon: UsersRound,
      desc: "Fiches, statuts, règlement intérieur",
    },
    canProfileReview && {
      href: "/rh/profil-demandes",
      label: "Demandes profil",
      icon: UserRound,
      desc:
        pendingProfileChanges > 0
          ? `${pendingProfileChanges} en attente`
          : "Modifications personnelles à valider",
    },
    canContracts && {
      href: "/rh/contrats",
      label: "Contrats",
      icon: FileSignature,
      desc: "CDI, CDD, stage, prestation, avenants",
    },
    canPaie && {
      href: "/rh/paie",
      label: "Paie",
      icon: Wallet,
      desc: "Périodes, bulletins, écritures PA",
    },
    canInps && {
      href: "/rh/inps",
      label: "INPS",
      icon: Landmark,
      desc: "Cotisations et récap mensuel",
    },
    canLeave && {
      href: "/rh/conges",
      label: "Congés",
      icon: CalendarDays,
      desc: "Demandes en attente et validation",
    },
    canAbsence && {
      href: "/rh/absences",
      label: "Absences",
      icon: UserCog,
      desc: "Déclarations à justifier",
    },
    canTimesheet && {
      href: "/rh/heures",
      label: "Heures",
      icon: Clock,
      desc: "Feuilles hebdomadaires soumises",
    },
    (canTimesheet || canEmployees) && {
      href: "/rh/horaires",
      label: "Horaires",
      icon: Clock,
      desc: "Horaires collectifs et jours fériés",
    },
    canLeave && {
      href: "/rh/conges/types",
      label: "Types de congés",
      icon: CalendarDays,
      desc: "Catalogue réglementaire",
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    icon: typeof UsersRound;
    desc: string;
  }[];

  return (
    <PageShell>
      <PageHeader
        title="Ressources humaines"
        description="Collaborateurs, contrats, paie, INPS, congés, absences et heures."
        breadcrumbs={[{ label: "Accueil", href: "/accueil" }, { label: "RH" }]}
      />

      <KpiGrid
        items={[
          {
            label: "Collaborateurs actifs",
            value: String(activeEmployees),
            hint: "Statut actif",
          },
          {
            label: "Congés en attente",
            value: String(pendingLeaves),
            hint: "À valider",
          },
          {
            label: "Absences déclarées",
            value: String(declaredAbsences),
            hint: "À justifier",
          },
          {
            label: "Heures soumises",
            value: String(submittedSheets),
            hint: "À valider",
          },
          {
            label: "Profils à valider",
            value: String(pendingProfileChanges),
            hint: "Demandes collab",
          },
        ]}
      />

      {(pendingLeaves > 0 ||
        declaredAbsences > 0 ||
        submittedSheets > 0 ||
        pendingProfileChanges > 0) && (
        <Surface className="flex flex-wrap gap-2 p-4 text-sm">
          <span className="w-full text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
            Files à traiter
          </span>
          {canLeave && pendingLeaves > 0 ? (
            <Link
              prefetch={false}
              href="/rh/conges?status=PENDING"
              className="rounded-lg bg-msk-blue/10 px-3 py-1.5 font-medium text-msk-blue hover:bg-msk-blue/15"
            >
              {pendingLeaves} congé(s)
            </Link>
          ) : null}
          {canAbsence && declaredAbsences > 0 ? (
            <Link
              prefetch={false}
              href="/rh/absences"
              className="rounded-lg bg-msk-coral/10 px-3 py-1.5 font-medium text-msk-coral hover:bg-msk-coral/15"
            >
              {declaredAbsences} absence(s)
            </Link>
          ) : null}
          {canTimesheet && submittedSheets > 0 ? (
            <Link
              prefetch={false}
              href="/rh/heures"
              className="rounded-lg bg-msk-ink/6 px-3 py-1.5 font-medium text-msk-ink hover:bg-msk-ink/10"
            >
              {submittedSheets} feuille(s) d’heures
            </Link>
          ) : null}
          {canProfileReview && pendingProfileChanges > 0 ? (
            <Link
              prefetch={false}
              href="/rh/profil-demandes"
              className="rounded-lg bg-msk-blue/10 px-3 py-1.5 font-medium text-msk-blue hover:bg-msk-blue/15"
            >
              {pendingProfileChanges} profil(s)
            </Link>
          ) : null}
        </Surface>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link prefetch={false} key={item.href} href={item.href}>
              <Surface className="h-full p-5 transition hover:border-msk-blue/30 hover:shadow-md">
                <Icon className="h-5 w-5 text-msk-blue" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-msk-ink">
                  {item.label}
                </p>
                <p className="mt-1 text-xs text-msk-ink/50">{item.desc}</p>
              </Surface>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
