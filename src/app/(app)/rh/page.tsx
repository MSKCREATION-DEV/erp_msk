import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Clock,
  FileSignature,
  UserCog,
  UsersRound,
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

  const [activeEmployees, pendingLeaves, declaredAbsences, submittedSheets] =
    await Promise.all([
      prisma.rhEmployee.count({ where: { status: "ACTIVE" } }),
      prisma.rhLeaveRequest.count({ where: { status: "PENDING" } }),
      prisma.rhAbsence.count({ where: { status: "DECLARED" } }),
      prisma.rhTimesheet.count({ where: { status: "SUBMITTED" } }),
    ]);

  const canEmployees = hasAnyPermission(user, [
    "rh.employees.view",
    "rh.employees.manage",
  ]);
  const canContracts = hasPermission(user, "rh.contracts.manage");
  const canLeave = hasAnyPermission(user, [
    "rh.leave.validate",
    "rh.leave.view_team",
  ]);
  const canAbsence = hasPermission(user, "rh.absence.manage");
  const canTimesheet = hasPermission(user, "rh.timesheet.validate");

  const navItems = [
    canEmployees && {
      href: "/rh/collaborateurs",
      label: "Collaborateurs",
      icon: UsersRound,
      desc: "Fiches, statuts, règlement intérieur",
    },
    canContracts && {
      href: "/rh/contrats",
      label: "Contrats",
      icon: FileSignature,
      desc: "CDI, CDD, stage, prestation, avenants",
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
        description="Collaborateurs, contrats, congés, absences et heures."
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
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
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
