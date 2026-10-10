import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  FileSignature,
  FileText,
  FolderOpen,
  ScrollText,
  UserCog,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { REGLEMENT_STATUS_LABEL, reglementStatusTone } from "@/lib/rh/labels";
import { ReglementSignButton } from "@/components/rh/reglement-sign-button";
import { listEmployeeRhDocs } from "@/lib/rh/docs-query";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import { RH_DOC } from "@/lib/rh/docs";

export const metadata: Metadata = { title: "Mon espace" };

export default async function EspaceHubPage() {
  const user = await requireUser();

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
    include: {
      contracts: {
        where: { status: { in: ["ACTIVE", "DRAFT"] } },
        orderBy: { startDate: "desc" },
        take: 3,
      },
    },
  });

  const [pendingLeaves, declaredAbsences, docs] = employee
    ? await Promise.all([
        prisma.rhLeaveRequest.count({
          where: { employeeId: employee.id, status: "PENDING" },
        }),
        prisma.rhAbsence.count({
          where: { employeeId: employee.id, status: "DECLARED" },
        }),
        listEmployeeRhDocs(
          employee.id,
          employee.contracts.map((c) => c.id),
        ),
      ])
    : [0, 0, []];

  const reglementDoc = docs.find((d) => d.kind === RH_DOC.REGLEMENT);

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
    {
      href: "/espace/contrats",
      label: "Mes contrats",
      icon: ScrollText,
      desc:
        employee && employee.contracts.length > 0
          ? `${employee.contracts.length} contrat(s) récent(s)`
          : "Voir mes contrats et PDF",
    },
    {
      href: "/espace/documents",
      label: "Mes documents",
      icon: FolderOpen,
      desc:
        docs.length > 0
          ? `${docs.length} document(s) RH`
          : "Attestations, règlement, solde, paie…",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Mon espace"
        description="Tout ce qui vous concerne — congés, contrats, documents — sans passer par la GED."
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
              <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </Surface>

          {docs.length > 0 ? (
            <Surface className="p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-msk-blue" aria-hidden />
                  <p className="text-sm font-semibold text-msk-ink">
                    Documents récents
                  </p>
                </div>
                <Link
                  href="/espace/documents"
                  className="text-xs font-medium text-msk-blue hover:underline"
                >
                  Tout voir
                </Link>
              </div>
              <ul className="divide-y divide-msk-ink/5">
                {docs.slice(0, 4).map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <p className="text-sm text-msk-ink">{d.label}</p>
                      <p className="text-xs text-msk-ink/45">
                        {d.createdAt.toLocaleDateString("fr-FR")} ·{" "}
                        {d.originalName}
                      </p>
                    </div>
                    <DocDownloadButton documentId={d.id} label="Télécharger" />
                  </li>
                ))}
              </ul>
            </Surface>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
