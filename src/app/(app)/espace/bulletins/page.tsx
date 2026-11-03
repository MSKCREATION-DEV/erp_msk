import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/list/search-params";
import { parseListSort, type SortColumnMap, type SortDir } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { KpiGrid } from "@/components/ui/kpi-card";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import { PayslipPdfActions } from "@/components/espace/payslip-pdf-actions";
import { monthLabel, PAYSLIP_STATUS_LABEL } from "@/lib/paie/labels";

export const metadata: Metadata = { title: "Mes bulletins" };

const SLIP_SORT_COLUMNS = {
  period: (dir: SortDir) => [
    { period: { year: dir } },
    { period: { month: dir } },
  ],
  net: (dir: SortDir) => ({ netXof: dir }),
  status: (dir: SortDir) => ({ status: dir }),
} satisfies SortColumnMap<"period" | "net" | "status">;

export default async function EspaceBulletinsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "self.payslip.view") &&
    !hasPermission(user, "self.documents.view")
  ) {
    redirect("/espace");
  }

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
  });
  if (!employee) redirect("/espace");

  const raw = await searchParams;
  const sp: Record<string, string | undefined> = {
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, SLIP_SORT_COLUMNS, {
    key: "period",
    dir: "desc",
  });
  const listParams: Record<string, string | undefined> = {
    sort: sort.key,
    dir: sort.dir,
  };

  const slips = await prisma.rhPayslip.findMany({
    where: {
      employeeId: employee.id,
      status: { in: ["APPROVED", "PAID"] },
    },
    include: { period: true },
    orderBy: sort.orderBy as
      | Prisma.RhPayslipOrderByWithRelationInput
      | Prisma.RhPayslipOrderByWithRelationInput[],
  });

  const docIds = slips
    .map((s) => s.gedDocumentId)
    .filter((id): id is string => Boolean(id));
  const docs = docIds.length
    ? await prisma.document.findMany({
        where: { id: { in: docIds } },
        select: {
          id: true,
          originalName: true,
          mime: true,
          size: true,
        },
      })
    : [];
  const docById = new Map(docs.map((d) => [d.id, d]));

  const withPdf = slips.filter((s) => s.gedDocumentId).length;
  const lastNet = slips[0]?.netXof;

  return (
    <PageShell>
      <PageHeader
        title="Mes bulletins"
        description="Coffre-fort des bulletins approuvés — aperçu et téléchargement."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Mes bulletins" },
        ]}
      />

      <KpiGrid
        items={[
          {
            label: "Bulletins",
            value: String(slips.length),
            hint: "Approuvés / payés",
          },
          {
            label: "PDF disponibles",
            value: String(withPdf),
            hint: "Aperçu + téléchargement",
          },
          {
            label: "Dernier net",
            value:
              lastNet != null
                ? `${lastNet.toLocaleString("fr-FR")} XOF`
                : "—",
            hint: "Période la plus récente",
          },
        ]}
      />

      <Surface className="overflow-x-auto p-0">
        {slips.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-msk-ink/50">
            Aucun bulletin approuvé pour le moment.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/6 text-msk-ink/45">
              <tr>
                <SortableTh
                  label="Période"
                  column="period"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/espace/bulletins"
                  searchParams={listParams}
                  defaultDir="desc"
                />
                <SortableTh
                  label="Net"
                  column="net"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/espace/bulletins"
                  searchParams={listParams}
                  defaultDir="desc"
                />
                <SortableTh
                  label="Statut"
                  column="status"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/espace/bulletins"
                  searchParams={listParams}
                />
                <PlainTh>PDF</PlainTh>
              </tr>
            </thead>
            <tbody>
              {slips.map((s) => {
                const doc = s.gedDocumentId
                  ? docById.get(s.gedDocumentId)
                  : undefined;
                return (
                  <tr key={s.id} className="border-b border-msk-ink/6">
                    <td className="px-4 py-3 capitalize">
                      {monthLabel(s.period.month)} {s.period.year}
                    </td>
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {s.netXof.toLocaleString("fr-FR")} XOF
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="success">
                        {PAYSLIP_STATUS_LABEL[s.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <PayslipPdfActions
                        doc={
                          doc
                            ? {
                                id: doc.id,
                                originalName: doc.originalName,
                                mime: doc.mime,
                                size: doc.size,
                              }
                            : null
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Surface>
    </PageShell>
  );
}
