import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import type { RhContractStatus } from "@prisma/client";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_TYPE_LABEL,
  contractStatusTone,
} from "@/lib/rh/labels";

export const metadata: Metadata = { title: "Contrats" };

const STATUS_FILTERS: RhContractStatus[] = [
  "DRAFT",
  "ACTIVE",
  "ENDED",
  "CANCELLED",
];

export default async function RhContratsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "rh.contracts.manage")) redirect("/accueil");

  const { status } = await searchParams;
  const statusFilter = STATUS_FILTERS.includes(status as RhContractStatus)
    ? (status as RhContractStatus)
    : undefined;

  const contracts = await prisma.rhContract.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { startDate: "desc" },
    take: 300,
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Contrats"
        description="CDI, CDD, stage, prestation, avenants."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[{ label: "RH", href: "/rh" }, { label: "Contrats" }]}
        actions={
          <Link prefetch={false}
            href="/rh/contrats/nouveau"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
          >
            Nouveau contrat
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link prefetch={false}
          href="/rh/contrats"
          className={`rounded-lg px-3 py-1.5 ${!statusFilter ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
        >
          Tous
        </Link>
        {STATUS_FILTERS.map((s) => (
          <Link prefetch={false}
            key={s}
            href={`/rh/contrats?status=${s}`}
            className={`rounded-lg px-3 py-1.5 ${statusFilter === s ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
          >
            {CONTRACT_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {contracts.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucun contrat trouvé.
        </Surface>
      ) : (
        <Surface className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Intitulé</th>
                <th className="px-4 py-3 font-medium">Collaborateur</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Début</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
                >
                  <td className="px-4 py-3">
                    <Link prefetch={false}
                      href={`/rh/contrats/${c.id}`}
                      className="font-medium text-msk-blue hover:underline"
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-msk-ink/70">
                    {c.employee.firstName} {c.employee.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="muted">{CONTRACT_TYPE_LABEL[c.type]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-msk-ink/70">
                    {c.startDate.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={contractStatusTone(c.status)}>
                      {CONTRACT_STATUS_LABEL[c.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      )}
    </PageShell>
  );
}
