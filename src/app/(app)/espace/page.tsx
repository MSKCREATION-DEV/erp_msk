import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock, FileSignature, UserCog } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { REGLEMENT_STATUS_LABEL, reglementStatusTone } from "@/lib/rh/labels";
import { ReglementSignButton } from "@/components/rh/reglement-sign-button";

export const metadata: Metadata = { title: "Mon espace" };

export default async function EspaceHubPage() {
  const user = await requireUser();

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
  });

  const [pendingLeaves, declaredAbsences] = employee
    ? await Promise.all([
        prisma.rhLeaveRequest.count({
          where: { employeeId: employee.id, status: "PENDING" },
        }),
        prisma.rhAbsence.count({
          where: { employeeId: employee.id, status: "DECLARED" },
        }),
      ])
    : [0, 0];

  const navItems = [
    {
      href: "/espace/conges",
      label: "Mes congés",
      icon: CalendarDays,
      desc:
        pendingLeaves > 0
          ? `${pendingLeaves} demande(s) en attente`
          : "Demander un congé, suivre mes demandes",
    },
    {
      href: "/espace/absences",
      label: "Mes absences",
      icon: UserCog,
      desc:
        declaredAbsences > 0
          ? `${declaredAbsences} déclaration(s) en cours`
          : "Déclarer une absence",
    },
    {
      href: "/espace/heures",
      label: "Mes heures",
      icon: Clock,
      desc: "Saisir et suivre mes feuilles hebdomadaires",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Mon espace"
        description="Congés, absences, heures et règlement intérieur."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Mon espace" },
        ]}
      />

      {!employee ? (
        <Surface className="p-6 text-sm text-msk-ink/60">
          Aucune fiche RH n&apos;est encore liée à votre compte — contactez
          l&apos;administration RH.
        </Surface>
      ) : (
        <>
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

          <Surface className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
              {employee.reglementStatus === "PENDING" ? (
                <ReglementSignButton />
              ) : null}
            </div>
          </Surface>
        </>
      )}
    </PageShell>
  );
}
