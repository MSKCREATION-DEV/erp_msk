import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { requireUser } from "@/lib/auth/session";
import { ALL_GUIDES, GUIDE_ROLES, publishedForUser } from "@/lib/guides";

export const metadata: Metadata = { title: "Guides — Rôles" };

export default async function GuidesRolesPage() {
  const user = await requireUser({ permission: "home.view" });
  const catalog = publishedForUser(user, ALL_GUIDES);

  return (
    <PageShell>
      <PageHeader
        title="Guides par rôle"
        description="Parcours documentaires alignés sur les packs et groupes réels de l’ERP."
        backHref="/guides"
        backLabel="Centre de guides"
        breadcrumbs={[
          { label: "Guides", href: "/guides" },
          { label: "Rôles" },
        ]}
      />
      <ul className="grid min-w-0 gap-3 grid-cols-1 @min-[28rem]:grid-cols-2 @min-[52rem]:grid-cols-3">
        {GUIDE_ROLES.map((r) => {
          const count = catalog.filter((g) => g.roleIds.includes(r.id)).length;
          return (
            <li key={r.id}>
              <Link
                prefetch={false}
                href={`/guides/roles/${r.id}`}
                className="group block h-full cursor-pointer"
              >
                <Surface className="flex h-full flex-col p-5 transition group-hover:border-msk-blue/20">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge tone="muted">{r.kind}</Badge>
                    <Badge tone="blue">
                      {count} guide{count > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <span className="font-medium text-msk-ink">{r.label}</span>
                  <span className="mt-1 line-clamp-3 text-sm text-msk-ink/50">
                    {r.mission}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-msk-blue">
                    Voir le parcours <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Surface>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
