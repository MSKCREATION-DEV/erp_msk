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
import { ContractPdfButton } from "@/components/rh/contract-pdf-button";
import { findLatestLinkedDoc } from "@/lib/rh/docs-query";
import { RH_DOC } from "@/lib/rh/docs";

export const metadata: Metadata = { title: "Contrat" };

export default async function RhContratDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; employeeId?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "rh.contracts.manage")) redirect("/accueil");
  const { id } = await params;
  const sp = await searchParams;

  const contract = await prisma.rhContract.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!contract) notFound();

  const linked = await findLatestLinkedDoc(RH_DOC.CONTRACT, contract.id);
  const documentId = linked?.id ?? contract.gedDocumentId;

  const fromCollab =
    sp.from === "collab" &&
    (sp.employeeId === contract.employee.id || !sp.employeeId);
  const backHref = fromCollab
    ? `/rh/collaborateurs/${contract.employee.id}`
    : "/rh/contrats";
  const backLabel = fromCollab
    ? `Retour à ${contract.employee.firstName} ${contract.employee.lastName}`
    : "Retour aux contrats";

  const titleLooksStage = /stage/i.test(contract.title);
  const typeMismatch =
    (titleLooksStage && contract.type !== "STAGE") ||
    (!titleLooksStage &&
      contract.type === "STAGE" &&
      /cdi|cdd/i.test(contract.title));

  return (
    <PageShell>
      <PageHeader
        title={contract.title}
        description={`${contract.employee.firstName} ${contract.employee.lastName}`}
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          ...(fromCollab
            ? [
                {
                  label: "Collaborateurs",
                  href: "/rh/collaborateurs",
                },
                {
                  label: `${contract.employee.firstName} ${contract.employee.lastName}`,
                  href: `/rh/collaborateurs/${contract.employee.id}`,
                },
              ]
            : [{ label: "Contrats", href: "/rh/contrats" }]),
          { label: contract.title },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={contractStatusTone(contract.status)}>
          {CONTRACT_STATUS_LABEL[contract.status]}
        </Badge>
        <Badge tone="muted">{CONTRACT_TYPE_LABEL[contract.type]}</Badge>
        {typeMismatch ? (
          <Badge tone="coral">Intitulé / type incohérents</Badge>
        ) : null}
      </div>

      <Surface className="space-y-2 p-5 text-sm">
        <h2 className="text-sm font-semibold text-msk-ink">Détail</h2>
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
        <h2 className="mb-3 text-sm font-semibold text-msk-ink">Document PDF</h2>
        <ContractPdfButton
          contractId={contract.id}
          documentId={documentId}
          generatedAt={linked?.createdAt}
        />
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
