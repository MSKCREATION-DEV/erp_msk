import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/list/search-params";
import { parseListSort, type SortColumnMap, type SortDir } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh } from "@/components/ui/sortable-th";
import { classLabel } from "@/lib/comptabilite/labels";

const PLAN_SORT_COLUMNS = {
  code: (dir: SortDir) => ({ code: dir }),
  label: (dir: SortDir) => ({ label: dir }),
  classNum: (dir: SortDir) => ({ classNum: dir }),
  nature: (dir: SortDir) => ({ nature: dir }),
  postable: (dir: SortDir) => ({ isPostable: dir }),
} satisfies SortColumnMap<
  "code" | "label" | "classNum" | "nature" | "postable"
>;

export const metadata: Metadata = { title: "Plan de comptes" };

const NATURE_LABEL: Record<string, string> = {
  ASSET: "Actif",
  LIABILITY: "Passif",
  EQUITY: "Capitaux propres",
  EXPENSE: "Charge",
  INCOME: "Produit",
};

export default async function ComptabilitePlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.access")) redirect("/accueil");

  return (
    <PageShell>
      <PageHeader
        title="Plan de comptes"
        description="Comptes SYSCOHADA, classes 1 à 8."
        backHref="/comptabilite"
        backLabel="Retour Comptabilité"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Plan de comptes" },
        ]}
        actions={
          hasPermission(user, "cpt.plan.configure") ? (
            <Link
              prefetch={false}
              href="/comptabilite/plan/nouveau"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Nouveau compte
            </Link>
          ) : null
        }
      />

      <div className="mb-2">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Rechercher code ou libellé…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      <Suspense fallback={<ListTableSkeleton rows={10} cols={5} />}>
        <PlanResults searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function PlanResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const raw = await searchParams;
  const query = (firstParam(raw.q) ?? "").trim();
  const sp: Record<string, string | undefined> = {
    q: query || undefined,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, PLAN_SORT_COLUMNS, {
    key: "code",
    dir: "asc",
  });
  const listParams: Record<string, string | undefined> = {
    ...sp,
    sort: sort.key,
    dir: sort.dir,
  };

  const accounts = await prisma.cptAccount.findMany({
    where: query
      ? {
          OR: [
            { code: { contains: query, mode: "insensitive" } },
            { label: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: sort.orderBy as Prisma.CptAccountOrderByWithRelationInput,
    take: 300,
  });

  if (accounts.length === 0) {
    return (
      <Surface className="p-8 text-center text-sm text-msk-ink/50">
        Aucun compte trouvé.
      </Surface>
    );
  }

  return (
    <Surface className="overflow-x-auto">
      <table className="w-full min-w-160 text-left text-sm">
        <thead className="border-b border-msk-ink/10 text-msk-ink/45">
          <tr>
            <SortableTh
              label="Code"
              column="code"
              sort={sort.key}
              dir={sort.dir}
              pathname="/comptabilite/plan"
              searchParams={listParams}
            />
            <SortableTh
              label="Libellé"
              column="label"
              sort={sort.key}
              dir={sort.dir}
              pathname="/comptabilite/plan"
              searchParams={listParams}
            />
            <SortableTh
              label="Classe"
              column="classNum"
              sort={sort.key}
              dir={sort.dir}
              pathname="/comptabilite/plan"
              searchParams={listParams}
            />
            <SortableTh
              label="Nature"
              column="nature"
              sort={sort.key}
              dir={sort.dir}
              pathname="/comptabilite/plan"
              searchParams={listParams}
            />
            <SortableTh
              label="Ventilable"
              column="postable"
              sort={sort.key}
              dir={sort.dir}
              pathname="/comptabilite/plan"
              searchParams={listParams}
            />
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr
              key={a.id}
              className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
            >
              <td className="px-4 py-3 font-medium text-msk-ink">{a.code}</td>
              <td className="px-4 py-3">{a.label}</td>
              <td className="px-4 py-3 text-msk-ink/70">
                {classLabel(a.classNum)}
              </td>
              <td className="px-4 py-3">
                <Badge tone="muted">{NATURE_LABEL[a.nature]}</Badge>
              </td>
              <td className="px-4 py-3">
                {a.isPostable ? (
                  <Badge tone="success">Oui</Badge>
                ) : (
                  <Badge tone="muted">Non</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Surface>
  );
}
