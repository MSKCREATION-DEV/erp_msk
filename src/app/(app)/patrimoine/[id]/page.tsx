import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { AssetDisposeButton, AssetForm } from "@/components/patrimoine/asset-form";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Fiche patrimoine" };

const STATUS_LABEL: Record<string, string> = {
  IN_SERVICE: "En service",
  MAINTENANCE: "Maintenance",
  DISPOSED: "Sorti",
};

function xof(n: number) {
  return n.toLocaleString("fr-FR") + " XOF";
}

export default async function PatrimoineDetailPage({ params }: Props) {
  const user = await requireUser();
  if (!hasPermission(user, "pat.access")) redirect("/accueil");
  const { id } = await params;
  const canManage = hasPermission(user, "pat.manage");

  const [asset, users] = await Promise.all([
    prisma.patAsset.findUnique({
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
  if (!asset) notFound();

  const acquired =
    asset.acquiredAt instanceof Date
      ? asset.acquiredAt.toISOString().slice(0, 10)
      : String(asset.acquiredAt).slice(0, 10);

  return (
    <PageShell>
      <PageHeader
        title={asset.designation}
        description={`${asset.code} · ${STATUS_LABEL[asset.status] ?? asset.status}`}
        backHref="/patrimoine"
        backLabel="Retour patrimoine"
        breadcrumbs={[
          { label: "Patrimoine", href: "/patrimoine" },
          { label: asset.code },
        ]}
      />

      <Surface className="p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-msk-ink/45">Valeur</dt>
            <dd className="font-semibold tabular-nums">{xof(asset.valueXof)}</dd>
          </div>
          <div>
            <dt className="text-msk-ink/45">Acquisition</dt>
            <dd>{new Date(asset.acquiredAt).toLocaleDateString("fr-FR")}</dd>
          </div>
          <div>
            <dt className="text-msk-ink/45">Localisation</dt>
            <dd>{asset.location ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-msk-ink/45">Assigné</dt>
            <dd>
              {asset.assignedTo
                ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-msk-ink/45">Amortissement</dt>
            <dd>{asset.amortYears} ans (linéaire simplifié)</dd>
          </div>
          <div>
            <dt className="text-msk-ink/45">Créé par</dt>
            <dd>
              {asset.createdBy.firstName} {asset.createdBy.lastName}
            </dd>
          </div>
          {asset.status === "DISPOSED" && asset.disposedAt ? (
            <>
              <div>
                <dt className="text-msk-ink/45">Sortie le</dt>
                <dd>{asset.disposedAt.toLocaleDateString("fr-FR")}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-msk-ink/45">Note</dt>
                <dd>{asset.disposeNote ?? "—"}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </Surface>

      {canManage && asset.status !== "DISPOSED" ? (
        <>
          <Surface className="max-w-lg p-5">
            <h2 className="mb-4 text-sm font-semibold text-msk-ink">Modifier</h2>
            <AssetForm
              users={users}
              initial={{
                id: asset.id,
                code: asset.code,
                designation: asset.designation,
                category: asset.category,
                acquiredAt: acquired,
                valueXof: asset.valueXof,
                location: asset.location,
                assignedToId: asset.assignedToId,
                amortYears: asset.amortYears,
              }}
            />
          </Surface>
          <Surface className="max-w-lg border-msk-coral/20 p-5">
            <h2 className="mb-4 text-sm font-semibold text-msk-coral">Sortie d’actif</h2>
            <AssetDisposeButton assetId={asset.id} />
          </Surface>
        </>
      ) : null}
    </PageShell>
  );
}
