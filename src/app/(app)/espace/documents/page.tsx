import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { listEmployeeRhDocs } from "@/lib/rh/docs-query";
import { EspaceDocsList } from "@/components/espace/espace-docs-list";

export const metadata: Metadata = { title: "Mes documents" };

export default async function EspaceDocumentsPage() {
  const user = await requireUser();
  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
    include: {
      contracts: { select: { id: true } },
    },
  });
  if (!employee) redirect("/espace");

  const docs = await listEmployeeRhDocs(
    employee.id,
    employee.contracts.map((c) => c.id),
  );

  return (
    <PageShell>
      <PageHeader
        title="Mes documents"
        description="Attestations, contrats, règlement, solde, fiches de paie — aperçu et téléchargement."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Mes documents" },
        ]}
      />

      <p className="text-sm text-msk-ink/55">
        Fichiers issus de la GED (pas de copie). Voir aussi{" "}
        <Link
          prefetch={false}
          href="/espace/contrats"
          className="font-medium text-msk-blue hover:underline"
        >
          Mes contrats
        </Link>{" "}
        pour le parcours carrière.
      </p>

      <Surface className="p-0">
        <EspaceDocsList docs={docs} />
      </Surface>
    </PageShell>
  );
}
