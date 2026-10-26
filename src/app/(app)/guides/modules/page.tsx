import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { requireUser } from "@/lib/auth/session";
import {
  ALL_GUIDES,
  GUIDE_MODULES,
  publishedForUser,
} from "@/lib/guides";

export const metadata: Metadata = { title: "Guides — Modules" };

export default async function GuidesModulesPage() {
  const user = await requireUser({ permission: "home.view" });
  const catalog = publishedForUser(user, ALL_GUIDES);

  return (
    <PageShell>
      <PageHeader
        title="Guides par module"
        description="Chaque module ERP dispose d’une fiche : objectif, rôles et procédures disponibles."
        backHref="/guides"
        backLabel="Centre de guides"
        breadcrumbs={[
          { label: "Guides", href: "/guides" },
          { label: "Modules" },
        ]}
      />
      <ul className="grid min-w-0 gap-3 grid-cols-1 @min-[28rem]:grid-cols-2 @min-[52rem]:grid-cols-3">
        {GUIDE_MODULES.map((m) => {
          const count = catalog.filter((g) => g.moduleId === m.id).length;
          return (
            <li key={m.id}>
              <Link
                prefetch={false}
                href={`/guides/modules/${m.id}`}
                className="group block h-full cursor-pointer"
              >
                <Surface className="flex h-full flex-col p-5 transition group-hover:border-msk-blue/20">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {m.stub ? (
                      <Badge tone="muted">Documentation à venir</Badge>
                    ) : (
                      <Badge tone="blue">{count} guide{count > 1 ? "s" : ""}</Badge>
                    )}
                  </div>
                  <span className="font-medium text-msk-ink">{m.label}</span>
                  <span className="mt-1 line-clamp-3 text-sm text-msk-ink/50">
                    {m.objective}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-msk-blue">
                    Ouvrir <ArrowRight className="h-3.5 w-3.5" />
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
