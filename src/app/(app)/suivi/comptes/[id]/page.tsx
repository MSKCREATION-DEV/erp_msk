import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import {
  accountBalanceFromMoves,
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
      where: { accountId: id },
      select: { direction: true, amount: true },
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
            Solde
          </p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              balance < 0 ? "text-msk-coral" : "text-msk-ink"
            }`}
          >
            {formatSvXof(balance)}
          </p>
        </Surface>
        <Surface className="p-4 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
            Note
          </p>
          <p className="mt-1 text-sm text-msk-ink/70">
            {account.notes ??
              "Chaque mouvement met à jour le solde et apparaît aussi dans le registre Mouvements."}
          </p>
        </Surface>
      </div>

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <h2 className="text-sm font-semibold text-msk-ink">
            Historique des mouvements
          </h2>
        </div>
        {movements.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/55">
            Aucun mouvement sur ce compte.
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
              <tbody className="divide-y divide-msk-ink/6">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 tabular-nums text-msk-ink/70">
                      {m.movedAt.toLocaleDateString("fr-FR")}
                      {m.transferId ? (
                        <span className="ml-1 text-xs text-msk-blue">
                          transfert
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          m.direction === "IN"
                            ? "font-medium text-emerald-700"
                            : "font-medium text-msk-coral"
                        }
                      >
                        {m.direction === "IN" ? "Crédit" : "Débit"}
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
        )}
      </Surface>
    </PageShell>
  );
}
