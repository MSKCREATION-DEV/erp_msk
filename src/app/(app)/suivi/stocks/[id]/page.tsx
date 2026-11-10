import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Article stock · Suivi" };

export default async function SuiviStockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.stock.view");
  const { id } = await params;

  const item = await prisma.svStockItem.findUnique({
    where: { id },
    include: {
      movements: { orderBy: { movedAt: "desc" }, take: 50 },
    },
  });
  if (!item) notFound();

  return (
    <PageShell>
      <PageHeader
        title={`${item.code} · ${item.label}`}
        description={`${item.family}${item.location ? ` · ${item.location}` : ""}`}
        backHref="/suivi/stocks"
        actions={
          <Link
            href="/suivi/stocks/mouvements/nouveau"
            className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
          >
            Mouvement
          </Link>
        }
      />
      <div className="mb-4 rounded-xl border border-msk-ink/8 bg-white p-4">
        <p className="text-xs uppercase tracking-caps text-msk-ink/45">
          Quantité
        </p>
        <p
          className={`mt-1 text-2xl font-semibold tabular-nums ${
            item.quantity === 0 ? "text-msk-coral" : ""
          }`}
        >
          {item.quantity} {item.unit}
        </p>
      </div>
      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <h2 className="text-sm font-semibold">Historique</h2>
        </div>
        {item.movements.length === 0 ? (
          <p className="p-4 text-sm text-msk-ink/55">
            Aucun mouvement (snapshot seed uniquement).
          </p>
        ) : (
          <ul className="divide-y divide-msk-ink/6">
            {item.movements.map((m) => (
              <li
                key={m.id}
                className="flex justify-between px-4 py-3 text-sm"
              >
                <span>
                  {m.movedAt.toLocaleDateString("fr-FR")} · {m.kind}
                  {m.note ? ` — ${m.note}` : ""}
                </span>
                <span className="tabular-nums font-medium">{m.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </PageShell>
  );
}
