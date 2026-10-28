import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/list/search-params";
import { parseListSort, type SortColumnMap, type SortDir } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_TYPE_LABEL,
  contractStatusTone,
} from "@/lib/rh/labels";
import { findLatestLinkedDoc } from "@/lib/rh/docs-query";
import { RH_DOC } from "@/lib/rh/docs";
import { DocDownloadButton } from "@/components/rh/doc-download-button";

export const metadata: Metadata = { title: "Mes contrats" };

const SELF_CONTRACT_SORT = {
  title: (dir: SortDir) => ({ title: dir }),
  type: (dir: SortDir) => ({ type: dir }),
  startDate: (dir: SortDir) => ({ startDate: dir }),
  status: (dir: SortDir) => ({ status: dir }),
} satisfies SortColumnMap<"title" | "type" | "startDate" | "status">;

export default async function EspaceContratsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!employee) redirect("/espace");

  const raw = await searchParams;
  const sp: Record<string, string | undefined> = {
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, SELF_CONTRACT_SORT, {
    key: "startDate",
    dir: "desc",
  });
  const listParams: Record<string, string | undefined> = {
    sort: sort.key,
    dir: sort.dir,
  };

  const contracts = await prisma.rhContract.findMany({
    where: { employeeId: employee.id },
    orderBy: sort.orderBy as Prisma.RhContractOrderByWithRelationInput,
  });

  const withPdf = await Promise.all(
    contracts.map(async (c) => {
      const linked = await findLatestLinkedDoc(RH_DOC.CONTRACT, c.id);
      return {
        ...c,
        documentId: linked?.id ?? c.gedDocumentId,
        generatedAt: linked?.createdAt ?? null,
      };
    }),
  );

  return (
    <PageShell>
      <PageHeader
        title="Mes contrats"
        description="Contrats liés à votre fiche RH et PDF associés."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Mes contrats" },
        ]}
      />

      <Surface className="overflow-x-auto p-0">
        {withPdf.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-msk-ink/50">
            Aucun contrat pour le moment.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <SortableTh
                  label="Intitulé"
                  column="title"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/espace/contrats"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Type"
                  column="type"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/espace/contrats"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Période"
                  column="startDate"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/espace/contrats"
                  searchParams={listParams}
                  defaultDir="desc"
                />
                <SortableTh
                  label="Statut"
                  column="status"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/espace/contrats"
                  searchParams={listParams}
                />
                <PlainTh>Document</PlainTh>
              </tr>
            </thead>
            <tbody>
              {withPdf.map((c) => (
                <tr key={c.id} className="border-b border-msk-ink/5">
                  <td className="px-4 py-3 font-medium text-msk-ink">
                    {c.title}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/70">
                    {CONTRACT_TYPE_LABEL[c.type]}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/70">
                    {c.startDate.toLocaleDateString("fr-FR")}
                    {c.endDate
                      ? ` → ${c.endDate.toLocaleDateString("fr-FR")}`
                      : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={contractStatusTone(c.status)}>
                      {CONTRACT_STATUS_LABEL[c.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {c.documentId ? (
                      <DocDownloadButton
                        documentId={c.documentId}
                        label="Télécharger PDF"
                      />
                    ) : (
                      <span className="text-xs text-msk-ink/40">
                        Pas encore disponible
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>
    </PageShell>
  );
}
