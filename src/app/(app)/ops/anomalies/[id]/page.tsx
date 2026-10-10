import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { TicketUpdateForm } from "@/components/ops/ticket-update-form";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Fiche anomalie" };

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

export default async function OpsAnomalieDetailPage({ params }: Props) {
  const user = await requireUser();
  if (!hasPermission(user, "ops.access")) redirect("/accueil");
  const { id } = await params;
  const canManage = hasPermission(user, "ops.ticket.manage");

  const [ticket, users] = await Promise.all([
    prisma.opsTicket.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    }),
    canManage
      ? prisma.user.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { lastName: "asc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);
  if (!ticket) notFound();

  const escalated =
    ticket.priority === "CRITICAL" &&
    ticket.status !== "DONE" &&
    Date.now() - ticket.createdAt.getTime() > ESCALATION_MS;

  return (
    <PageShell>
      <PageHeader
        title={ticket.equipment}
        description={`${PRIORITY_LABEL[ticket.priority] ?? ticket.priority} · ${STATUS_LABEL[ticket.status] ?? ticket.status}`}
        backHref="/ops/anomalies"
        backLabel="Retour anomalies"
        breadcrumbs={[
          { label: "Anomalies", href: "/ops/anomalies" },
          { label: ticket.equipment },
        ]}
      />

      {escalated ? (
        <Surface className="border-msk-coral/25 bg-msk-coral/5 p-4">
          <p className="text-sm font-semibold text-msk-coral">
            Anomalie critique ouverte depuis plus de 48 h — escalade Direction
          </p>
        </Surface>
      ) : null}

      <Surface className="p-5">
        <p className="whitespace-pre-wrap text-sm text-msk-ink">{ticket.problem}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-msk-ink/45">Signalé le</dt>
            <dd>{ticket.noticedAt.toLocaleString("fr-FR")}</dd>
          </div>
          <div>
            <dt className="text-msk-ink/45">Créé par</dt>
            <dd>
              {ticket.createdBy.firstName} {ticket.createdBy.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-msk-ink/45">Assigné</dt>
            <dd>
              {ticket.assignedTo
                ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                : "—"}
            </dd>
          </div>
          {ticket.actionPlan ? (
            <div className="sm:col-span-2">
              <dt className="text-msk-ink/45">Plan d’action</dt>
              <dd>{ticket.actionPlan}</dd>
            </div>
          ) : null}
          {ticket.observations ? (
            <div className="sm:col-span-2">
              <dt className="text-msk-ink/45">Observations</dt>
              <dd>{ticket.observations}</dd>
            </div>
          ) : null}
        </dl>
      </Surface>

      {canManage ? (
        <Surface className="max-w-lg p-5">
          <h2 className="mb-4 text-sm font-semibold text-msk-ink">Mettre à jour</h2>
          <TicketUpdateForm
            users={users}
            initial={{
              ticketId: ticket.id,
              status: ticket.status,
              priority: ticket.priority,
              assignedToId: ticket.assignedToId,
              actionPlan: ticket.actionPlan,
              observations: ticket.observations,
            }}
          />
        </Surface>
      ) : null}
    </PageShell>
  );
}
