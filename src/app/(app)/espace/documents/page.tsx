import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { listEmployeeRhDocs } from "@/lib/rh/docs-query";
import { DocDownloadButton } from "@/components/rh/doc-download-button";

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
        description="Attestations, contrats, règlement, solde, fiches de paie — téléchargement direct."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Mes documents" },
        ]}
      />

      <Surface className="p-0">
        {docs.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-msk-ink/50">
            Aucun document RH pour le moment. L&apos;administration RH les
            dépose ici après génération.
          </p>
        ) : (
          <ul className="divide-y divide-msk-ink/5">
            {docs.map((d) => (
              <li
                key={`${d.kind}-${d.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-msk-ink">{d.label}</p>
                  <p className="truncate text-xs text-msk-ink/45">
                    {d.originalName} ·{" "}
                    {d.createdAt.toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <DocDownloadButton
                  documentId={d.id}
                  label="Télécharger"
                  variant="primary"
                />
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </PageShell>
  );
}
