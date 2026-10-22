import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideCallout } from "@/components/guides/guide-callout";
import { GuideList } from "@/components/guides/guide-list";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { requireUser } from "@/lib/auth/session";
import {
  ALL_GUIDES,
  getGuideModule,
  getGuideRole,
  publishedForUser,
} from "@/lib/guides";

type Props = { params: Promise<{ moduleId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { moduleId } = await params;
  const mod = getGuideModule(moduleId);
  return { title: mod ? `Guides — ${mod.label}` : "Module" };
}

export default async function GuideModulePage({ params }: Props) {
  const user = await requireUser({ permission: "home.view" });
  const { moduleId } = await params;
  const mod = getGuideModule(moduleId);
  if (!mod) notFound();

  const guides = publishedForUser(user, ALL_GUIDES).filter(
    (g) => g.moduleId === mod.id,
  );

  return (
    <PageShell>
      <PageHeader
        title={mod.label}
        description={mod.objective}
        backHref="/guides/modules"
        backLabel="Tous les modules"
        breadcrumbs={[
          { label: "Guides", href: "/guides" },
          { label: "Modules", href: "/guides/modules" },
          { label: mod.label },
        ]}
        actions={
          mod.href ? (
            <Link
              prefetch={false}
              href={mod.href}
              className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Ouvrir le module
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        {mod.stub ? <Badge tone="muted">Stub — procédures à rédiger</Badge> : null}
        {mod.accessPermission ? (
          <Badge tone="ink" title="Permission nav typique">
            {mod.accessPermission}
          </Badge>
        ) : null}
      </div>

      {mod.stub ? (
        <GuideCallout variant="info" title="Documentation en cours">
          Aucune procédure détaillée validée pour ce module dans le centre de
          guides. Consultez le manuel technique
          {mod.manualPath ? ` (${mod.manualPath})` : ""} et le suivi
          `docs/guides/SUIVI-GUIDES.md`.
        </GuideCallout>
      ) : null}

      <Surface className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-msk-ink">Rôles concernés</h2>
        <ul className="flex flex-wrap gap-2">
          {mod.roleIds.map((id) => {
            const role = getGuideRole(id);
            return (
              <li key={id}>
                <Link
                  prefetch={false}
                  href={`/guides/roles/${id}`}
                  className="inline-flex rounded-md bg-msk-ink/5 px-2.5 py-1 text-sm text-msk-ink hover:bg-msk-blue/10 hover:text-msk-blue"
                >
                  {role?.label ?? id}
                </Link>
              </li>
            );
          })}
        </ul>
        {mod.relatedModuleIds.length > 0 ? (
          <>
            <h2 className="pt-2 text-sm font-semibold text-msk-ink">
              Modules liés
            </h2>
            <ul className="flex flex-wrap gap-2">
              {mod.relatedModuleIds.map((id) => {
                const related = getGuideModule(id);
                return (
                  <li key={id}>
                    <Link
                      prefetch={false}
                      href={`/guides/modules/${id}`}
                      className="text-sm text-msk-blue hover:underline"
                    >
                      {related?.label ?? id}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </Surface>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
          Procédures
        </h2>
        <GuideList
          guides={guides}
          emptyMessage="Pas encore de guide publié pour ce module."
        />
      </section>
    </PageShell>
  );
}
