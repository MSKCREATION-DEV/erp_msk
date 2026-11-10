import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import {
  accountBalanceFromMoves,
  ensureSvAccounts,
  SV_ACCOUNT_KIND_HINT,
  SV_ACCOUNT_KIND_LABEL,
} from "@/lib/suivi/accounts";
import { formatSvXof } from "@/lib/suivi/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
export const metadata: Metadata = { title: "Comptes · Suivi" };

export default async function SuiviComptesPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.accounts.view");
  await ensureSvAccounts(prisma);

  const accounts = await prisma.svAccount.findMany({
    orderBy: { kind: "asc" },
    include: {
      movements: { select: { direction: true, amount: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Comptes"
        description="Caisse physique et compte banque — soldes recalculés depuis les mouvements."
        backHref="/suivi"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((acc) => {
          const balance = accountBalanceFromMoves(acc.movements);
          return (
            <Link
              key={acc.id}
              href={`/suivi/comptes/${acc.id}`}
              className="group block rounded-xl border border-msk-ink/8 bg-white p-5 transition hover:border-msk-blue/30 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-msk-blue/8 text-msk-blue">
                  <Wallet className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-msk-ink group-hover:text-msk-blue">
                    {SV_ACCOUNT_KIND_LABEL[acc.kind]}
                  </p>
                  <p className="mt-0.5 text-xs text-msk-ink/50">
                    {SV_ACCOUNT_KIND_HINT[acc.kind]}
                  </p>
                  <p
                    className={`mt-3 text-2xl font-semibold tabular-nums ${
                      balance < 0 ? "text-msk-coral" : "text-msk-ink"
                    }`}
                  >
                    {formatSvXof(balance)}
                  </p>
                  <p className="mt-1 text-xs text-msk-ink/40">
                    {acc.movements.length} mouvement
                    {acc.movements.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {accounts.length === 0 ? (
        <Surface className="p-6">
          <p className="text-sm text-msk-ink/55">
            Aucun compte. Relancez le seed Suivi ou ouvrez cette page après
            migration.
          </p>
        </Surface>
      ) : null}
    </PageShell>
  );
}
