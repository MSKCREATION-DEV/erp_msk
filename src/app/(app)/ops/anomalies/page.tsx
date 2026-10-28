import type { Metadata } from "next";
import Link from "next/link";
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
import { SortableTh } from "@/components/ui/sortable-th";

export const metadata: Metadata = { title: "Anomalies" };

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Basse",
  MEDIUM: "Moyenne",
  HIGH: "Haute",
  CRITICAL: "Critique",
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  DONE: "Fait",
  DEFERRED: "Reporté",
};

const ESCALATION_MS = 48 * 60 * 60 * 1000;

function isEscalated(ticket: {
  priority: string;
  status: string;
  createdAt: Date;
}) {
  if (ticket.priority !== "CRITICAL") return false;
  if (ticket.status === "DONE") return false;
  return Date.now() - ticket.createdAt.getTime() > ESCALATION_MS;
}

const TICKET_SORT_COLUMNS = {
  equipment: (dir: SortDir) => ({ equipment: dir }),
  priority: (dir: SortDir) => ({ priority: dir }),
  status: (dir: SortDir) => ({ status: dir }),
  assigned: (dir: SortDir) => ({ assignedTo: { lastName: dir } }),
  noticedAt: (dir: SortDir) => ({ noticedAt: dir }),
} satisfies SortColumnMap<
  "equipment" | "priority" | "status" | "assigned" | "noticedAt"
>;

export default async function OpsAnomaliesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "ops.access")) redirect("/accueil");

  const canCreate =
    hasPermission(user, "ops.ticket.create") ||
    hasPermission(user, "ops.ticket.manage");

  const raw = await searchParams;
  const sp: Record<string, string | undefined> = {
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, TICKET_SORT_COLUMNS, {
    key: "priority",
    dir: "desc",
  });
  const listParams: Record<string, string | undefined> = {
    sort: sort.key,
    dir: sort.dir,
  };

  const tickets = await prisma.opsTicket.findMany({
    take: 100,
    orderBy: sort.orderBy as Prisma.OpsTicketOrderByWithRelationInput,
    include: {
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });

  const escalatedCount = tickets.filter(isEscalated).length;

  return (
    <PageShell>
      <PageHeader
        title="Anomalies"
        description="Tickets équipement / zone — priorité et suivi d’intervention."
        breadcrumbs={[
          { label: "Ops", href: "/ops/anomalies" },
          { label: "Anomalies" },
        ]}
        actions={
          canCreate ? (
            <Link
              prefetch={false}
              href="/ops/anomalies/nouveau"
              className="inline-flex rounded-lg bg-msk-blue px-3 py-2 text-sm font-semibold text-white"
            >
              Nouvelle anomalie
            </Link>
          ) : null
        }
      />

      {escalatedCount > 0 ? (
        <Surface className="border-msk-coral/25 bg-msk-coral/5 p-4">
          <p className="text-sm font-semibold text-msk-coral">
            {escalatedCount} anomalie(s) critique(s) ouverte(s) depuis plus de
            48 h
          </p>
        </Surface>
      ) : null}

      <Surface className="overflow-x-auto p-0">
        {tickets.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/45">
            Aucun ticket.{" "}
            {canCreate ? (
              <Link
                prefetch={false}
                href="/ops/anomalies/nouveau"
                className="text-msk-blue"
              >
                Signaler la première
              </Link>
            ) : null}
          </p>
        ) : (
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="border-b border-msk-paper bg-msk-chalk/60 text-xs tracking-caps uppercase text-msk-ink/45">
              <tr>
                <SortableTh
                  label="Équipement"
                  column="equipment"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/ops/anomalies"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Priorité"
                  column="priority"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/ops/anomalies"
                  searchParams={listParams}
                  defaultDir="desc"
                />
                <SortableTh
                  label="Statut"
                  column="status"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/ops/anomalies"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Assigné"
                  column="assigned"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/ops/anomalies"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Signalé"
                  column="noticedAt"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/ops/anomalies"
                  searchParams={listParams}
                  defaultDir="desc"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-paper">
              {tickets.map((t) => {
                const escalated = isEscalated(t);
                return (
                  <tr
                    key={t.id}
                    className={
                      escalated
                        ? "bg-msk-coral/10 hover:bg-msk-coral/15"
                        : "hover:bg-msk-chalk/40"
                    }
                  >
                    <td className="px-4 py-3">
                      <Link
                        prefetch={false}
                        href={`/ops/anomalies/${t.id}`}
                        className="font-medium text-msk-blue hover:underline"
                      >
                        {t.equipment}
                      </Link>
                      {escalated ? (
                        <span className="ml-2 rounded bg-msk-coral px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          &gt;48h
                        </span>
                      ) : null}
                      <p className="mt-0.5 line-clamp-1 text-xs text-msk-ink/45">
                        {t.problem}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          t.priority === "CRITICAL"
                            ? "font-semibold text-msk-coral"
                            : ""
                        }
                      >
                        {PRIORITY_LABEL[t.priority] ?? t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {STATUS_LABEL[t.status] ?? t.status}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/55">
                      {t.assignedTo
                        ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/55">
                      {t.noticedAt.toLocaleDateString("fr-FR")}
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
