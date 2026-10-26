import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { requireUser } from "@/lib/auth/session";
import { ALL_GUIDES, GUIDE_TASKS, publishedForUser } from "@/lib/guides";

export const metadata: Metadata = { title: "Guides — Tâches" };

export default async function GuidesTasksPage() {
  const user = await requireUser({ permission: "home.view" });
  const catalog = publishedForUser(user, ALL_GUIDES);

  return (
    <PageShell>
      <PageHeader
        title="Catalogue des tâches"
        description="Trouvez une procédure par intention (créer, suivre, dépanner…) sans connaître le module."
        backHref="/guides"
        backLabel="Centre de guides"
        breadcrumbs={[
          { label: "Guides", href: "/guides" },
          { label: "Tâches" },
        ]}
      />
      <ul className="grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
        {GUIDE_TASKS.map((t) => {
          const count = catalog.filter((g) => g.taskIds.includes(t.id)).length;
          return (
            <li key={t.id}>
              <Link
                prefetch={false}
                href={`/guides/taches/${t.id}`}
                className="group block h-full cursor-pointer"
              >
                <Surface className="flex h-full flex-col p-5 transition group-hover:border-msk-blue/20">
                  <Badge tone="blue" className="mb-2 w-fit">
                    {count} guide{count > 1 ? "s" : ""}
                  </Badge>
                  <span className="font-medium text-msk-ink">{t.label}</span>
                  <span className="mt-1 text-sm text-msk-ink/50">
                    {t.description}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-msk-blue">
                    Voir <ArrowRight className="h-3.5 w-3.5" />
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
