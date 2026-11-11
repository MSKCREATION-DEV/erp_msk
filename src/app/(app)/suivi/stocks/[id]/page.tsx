import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { SvStockDetailActions } from "@/components/suivi/stock-detail-actions";

export const metadata: Metadata = { title: "Article stock · Suivi" };

const KIND_LABEL: Record<string, string> = {
  IN: "Entrée",
  OUT: "Sortie",
  ADJUST: "Ajustement",
};

export default async function SuiviStockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.stock.view");
  const canManage = hasPermission(user, "sv.stock.manage");
  const { id } = await params;

  const item = await prisma.svStockItem.findUnique({
    where: { id },
    include: {
      movements: {
        orderBy: { movedAt: "desc" },
        take: 50,
        include: {
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  });
  if (!item) notFound();

  return (
    <PageShell>
      <PageHeader
        title={`${item.code} · ${item.label}`}
        description={[
          item.family,
          item.subFamily,
          item.location,
          item.archivedAt ? "Archivé" : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        backHref="/suivi/stocks"
        actions={
          item.archivedAt ? null : (
            <SvStockDetailActions itemId={item.id} canManage={canManage} />
          )
        }
      />

      {item.archivedAt ? (
        <p className="mb-4 rounded-lg border border-msk-coral/25 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
          Article archivé le{" "}
          {item.archivedAt.toLocaleDateString("fr-FR")} — hors inventaire
          courant.
        </p>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs uppercase tracking-caps text-msk-ink/45">
            Quantité
          </p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              item.quantity === 0 ? "text-msk-coral" : ""
            }`}
          >
            {item.quantity}{" "}
            <span className="text-base font-medium text-msk-ink/55">
              {item.unit}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-caps text-msk-ink/45">
            Détails
          </p>
          <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-msk-ink/45">Code</dt>
              <dd className="font-medium tabular-nums">{item.code}</dd>
            </div>
            <div>
              <dt className="text-msk-ink/45">Famille</dt>
              <dd>{item.family}</dd>
            </div>
            {item.location ? (
              <div>
                <dt className="text-msk-ink/45">Emplacement</dt>
                <dd>{item.location}</dd>
              </div>
            ) : null}
            {item.observations ? (
              <div className="sm:col-span-2">
                <dt className="text-msk-ink/45">Observations</dt>
                <dd>{item.observations}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <h2 className="text-sm font-semibold">Historique des mouvements</h2>
        </div>
        {item.movements.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/55" role="status">
            Aucun mouvement enregistré.
          </p>
        ) : (
          <ul className="divide-y divide-msk-ink/6">
            {item.movements.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p>
                    <span className="font-medium">
                      {KIND_LABEL[m.kind] ?? m.kind}
                    </span>
                    {" · "}
                    {m.movedAt.toLocaleDateString("fr-FR")}
                    {m.note ? (
                      <span className="text-msk-ink/55"> — {m.note}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-msk-ink/40">
                    {m.createdBy.firstName} {m.createdBy.lastName}
                  </p>
                </div>
                <span className="tabular-nums font-medium">
                  {m.kind === "OUT" ? "−" : m.kind === "IN" ? "+" : "→"}
                  {m.quantity} {item.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </PageShell>
  );
}
