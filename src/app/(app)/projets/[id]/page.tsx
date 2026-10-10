import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ExpenseForm } from "@/components/projets/expense-form";
import { ExpenseReviewButtons } from "@/components/projets/expense-review-buttons";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Fiche projet" };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  ON_HOLD: "En pause",
  DONE: "Terminé",
  CANCELLED: "Annulé",
};

const EXPENSE_STATUS: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumise",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  REIMBURSED: "Remboursée",
};

function xof(n: number) {
  return n.toLocaleString("fr-FR") + " XOF";
}

export default async function ProjetDetailPage({ params }: Props) {
  const user = await requireUser();
  if (!hasPermission(user, "prj.access")) redirect("/accueil");
  const { id } = await params;
  const canManage = hasPermission(user, "prj.manage");

  const project = await prisma.prjProject.findUnique({
    where: { id },
    include: {
      owner: { select: { firstName: true, lastName: true } },
      expenses: {
        orderBy: { expenseDate: "desc" },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!project) notFound();

  const approvedSum = project.expenses
    .filter((e) => e.status === "APPROVED" || e.status === "REIMBURSED")
    .reduce((s, e) => s + e.spentXof, 0);
  const ecart = project.budgetXof - approvedSum;

  return (
    <PageShell>
      <PageHeader
        title={project.name}
        description={`${project.code} · ${STATUS_LABEL[project.status] ?? project.status}`}
        backHref="/projets"
        backLabel="Retour projets"
        breadcrumbs={[
          { label: "Projets", href: "/projets" },
          { label: project.code },
        ]}
      />

      <Surface className="p-5">
        {project.description ? (
          <p className="mb-4 text-sm text-msk-ink/70">{project.description}</p>
        ) : null}
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-msk-ink/45">Budget</dt>
            <dd className="font-semibold tabular-nums">{xof(project.budgetXof)}</dd>
          </div>
          <div>
            <dt className="text-msk-ink/45">Dépenses validées</dt>
            <dd className="font-semibold tabular-nums">{xof(approvedSum)}</dd>
          </div>
          <div>
            <dt className="text-msk-ink/45">Écart</dt>
            <dd
              className={`font-semibold tabular-nums ${ecart < 0 ? "text-msk-coral" : "text-msk-ink"}`}
            >
              {xof(ecart)}
            </dd>
          </div>
          <div>
            <dt className="text-msk-ink/45">Responsable</dt>
            <dd>
              {project.owner.firstName} {project.owner.lastName}
            </dd>
          </div>
        </dl>
      </Surface>

      <Surface className="overflow-x-auto p-0">
        <div className="border-b border-msk-paper px-4 py-3">
          <h2 className="text-sm font-semibold text-msk-ink">Dépenses</h2>
        </div>
        {project.expenses.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/45">Aucune dépense.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-msk-paper bg-msk-chalk/60 text-xs tracking-caps uppercase text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Nature</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Montant</th>
                <th className="px-4 py-3 font-semibold">Par</th>
                {canManage ? (
                  <th className="px-4 py-3 font-semibold">Validation</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-paper">
              {project.expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {e.expenseDate.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{e.nature}</span>
                    {e.justificatifNote ? (
                      <span className="mt-0.5 block text-xs text-msk-ink/45">
                        {e.justificatifNote}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {EXPENSE_STATUS[e.status] ?? e.status}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{xof(e.spentXof)}</td>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {e.createdBy.firstName} {e.createdBy.lastName}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <ExpenseReviewButtons expenseId={e.id} status={e.status} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>

      <Surface className="max-w-xl p-5">
        <h2 className="mb-4 text-sm font-semibold text-msk-ink">Nouvelle dépense</h2>
        <ExpenseForm projectId={project.id} />
      </Surface>
    </PageShell>
  );
}
