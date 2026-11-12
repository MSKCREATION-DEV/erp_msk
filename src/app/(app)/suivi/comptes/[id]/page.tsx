import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import {
  accountBalanceFromMoves,
  formatSvBaselineDateFr,
  SV_ACCOUNT_KIND_HINT,
  SV_ACCOUNT_KIND_LABEL,
} from "@/lib/suivi/accounts";
import { formatSvXof } from "@/lib/suivi/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { ActionLink } from "@/components/ui/action-link";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Compte · Suivi" };

export default async function SuiviCompteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.accounts.view");
  const { id } = await params;

  const account = await prisma.svAccount.findUnique({ where: { id } });
  if (!account) notFound();

  const [balanceMoves, movements] = await Promise.all([
    prisma.svCashMovement.findMany({
      where: { accountId: id, countsTowardBalance: true },
      select: {
        direction: true,
        amount: true,
        countsTowardBalance: true,
      },
    }),
    prisma.svCashMovement.findMany({
      where: { accountId: id },
      orderBy: [{ movedAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
  ]);

  const balance = accountBalanceFromMoves(balanceMoves);
  const canManage =
    hasPermission(user, "sv.accounts.manage") || user.isSuperAdmin;
  const baselineLabel = account.baselineAt
    ? formatSvBaselineDateFr(account.baselineAt)
    : null;
  const currentMoves = movements.filter((m) => m.countsTowardBalance);
  const archivedMoves = movements.filter((m) => !m.countsTowardBalance);

  return (
    <PageShell>
      <PageHeader
        title={SV_ACCOUNT_KIND_LABEL[account.kind]}
        description={SV_ACCOUNT_KIND_HINT[account.kind]}
        backHref="/suivi/comptes"
        actions={
          canManage ? (
            <ActionLink
              href={`/suivi/comptes/${account.id}/mouvement`}
              icon={Plus}
            >
              Créditer / débiter
            </ActionLink>
          ) : null
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Surface className="p-4 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
            Solde courant
          </p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              balance < 0 ? "text-msk-coral" : "text-msk-ink"
            }`}
          >
            {formatSvXof(balance)}
          </p>
          {baselineLabel && account.baselineBalance != null ? (
            <p className="mt-2 text-xs text-msk-ink/50">
              Solde au {baselineLabel} :{" "}
              <span className="tabular-nums font-medium text-msk-ink/70">
                {formatSvXof(account.baselineBalance)}
              </span>
              <span className="block mt-0.5 text-msk-ink/40">
                Ouverture Direction — début de journée
              </span>
            </p>
          ) : null}
        </Surface>
        <Surface className="p-4 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
            Note
          </p>
          <p className="mt-1 text-sm text-msk-ink/70">
            {account.notes ??
              "Chaque mouvement post-bascule met à jour le solde courant. L’historique antérieur reste visible en archive."}
          </p>
        </Surface>
      </div>

      <Surface className="mb-5 overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <h2 className="text-sm font-semibold text-msk-ink">
            Mouvements courants
          </h2>
          <p className="mt-0.5 text-xs text-msk-ink/45">
            Ouverture + opérations depuis la bascule — impactent le solde.
          </p>
        </div>
        {currentMoves.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/55">
            Aucun mouvement courant sur ce compte.
            {canManage ? (
              <>
                {" "}
                <Link
                  href={`/suivi/comptes/${account.id}/mouvement`}
                  className="font-medium text-msk-blue hover:underline"
                >
                  Saisir une opération
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <MovementsTable rows={currentMoves} />
        )}
      </Surface>

      {archivedMoves.length > 0 ? (
        <Surface className="overflow-hidden p-0">
          <div className="border-b border-msk-ink/6 px-4 py-3">
            <h2 className="text-sm font-semibold text-msk-ink">
              Historique archivé
            </h2>
            <p className="mt-0.5 text-xs text-msk-ink/45">
              Avant le {baselineLabel ?? "12/11/2026"} — visible pour traçabilité,
              exclu du solde courant.
            </p>
          </div>
          <MovementsTable rows={archivedMoves} archived />
        </Surface>
      ) : null}
    </PageShell>
  );
}

function MovementsTable({
  rows,
  archived = false,
}: {
  rows: {
    id: string;
    movedAt: Date;
    direction: "IN" | "OUT";
    category: string;
    description: string | null;
    reference: string | null;
    amount: number;
    transferId: string | null;
  }[];
  archived?: boolean;
}) {
  return (
    <ListTableScroll>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-msk-ink/6 bg-msk-chalk/60 text-xs uppercase tracking-caps text-msk-ink/45">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Sens</th>
            <th className="px-4 py-3 font-medium">Catégorie</th>
            <th className="px-4 py-3 font-medium">Motif</th>
            <th className="px-4 py-3 font-medium text-right">Montant</th>
          </tr>
        </thead>
        <tbody
          className={`divide-y divide-msk-ink/6 ${archived ? "bg-msk-chalk/30" : ""}`}
        >
          {rows.map((m) => (
            <tr key={m.id} className={archived ? "text-msk-ink/55" : undefined}>
              <td className="px-4 py-3 tabular-nums text-msk-ink/70">
                {m.movedAt.toLocaleDateString("fr-FR")}
                {m.transferId ? (
                  <span className="ml-1 text-xs text-msk-blue">transfert</span>
                ) : null}
                {archived ? (
                  <span className="ml-1 text-xs text-msk-ink/35">archive</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    archived
                      ? "font-medium text-msk-ink/50"
                      : m.direction === "IN"
                        ? "font-medium text-emerald-700"
                        : "font-medium text-msk-coral"
                  }
                >
                  {m.direction === "IN" ? "Entrée" : "Sortie"}
                </span>
              </td>
              <td className="px-4 py-3 text-msk-ink/70">{m.category}</td>
              <td className="px-4 py-3 text-msk-ink/60">
                {m.description ?? "—"}
                {m.reference ? (
                  <span className="block text-xs text-msk-ink/40">
                    {m.reference}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                {m.direction === "OUT" ? "−" : "+"}
                {formatSvXof(m.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ListTableScroll>
  );
}
