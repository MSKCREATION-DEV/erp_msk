import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_TYPE_LABEL,
  contractStatusTone,
} from "@/lib/rh/labels";
import { ContractStatusButtons } from "@/components/rh/contract-status-buttons";

export const metadata: Metadata = { title: "Contrat" };

export default async function RhContratDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "rh.contracts.manage")) redirect("/accueil");
  const { id } = await params;

  const contract = await prisma.rhContract.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!contract) notFound();

  return (
    <PageShell>
      <PageHeader
        title={contract.title}
        description={`${contract.employee.firstName} ${contract.employee.lastName}`}
        backHref="/rh/contrats"
        backLabel="Retour aux contrats"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "Contrats", href: "/rh/contrats" },
          { label: contract.title },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={contractStatusTone(contract.status)}>
          {CONTRACT_STATUS_LABEL[contract.status]}
        </Badge>
        <Badge tone="muted">{CONTRACT_TYPE_LABEL[contract.type]}</Badge>
      </div>

      <Surface className="space-y-2 p-5 text-sm">
        <p>
          <span className="text-msk-ink/45">Collaborateur </span>
          <Link
            href={`/rh/collaborateurs/${contract.employee.id}`}
            className="text-msk-blue hover:underline"
          >
            {contract.employee.firstName} {contract.employee.lastName}
          </Link>
        </p>
        <p>
          <span className="text-msk-ink/45">Début </span>
          {contract.startDate.toLocaleDateString("fr-FR")}
        </p>
        <p>
          <span className="text-msk-ink/45">Fin </span>
          {contract.endDate
            ? contract.endDate.toLocaleDateString("fr-FR")
            : "—"}
        </p>
        <p>
          <span className="text-msk-ink/45">Salaire </span>
          {contract.salaryXof
            ? `${contract.salaryXof.toLocaleString("fr-FR")} XOF`
            : "—"}
        </p>
        {contract.notes ? (
          <p>
            <span className="text-msk-ink/45">Notes </span>
            {contract.notes}
          </p>
        ) : null}
      </Surface>

      <Surface className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-msk-ink">Statut</h2>
        <ContractStatusButtons
          contractId={contract.id}
          status={contract.status}
        />
      </Surface>
    </PageShell>
  );
}
