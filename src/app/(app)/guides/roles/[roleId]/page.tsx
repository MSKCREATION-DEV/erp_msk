import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideCallout } from "@/components/guides/guide-callout";
import { GuideList } from "@/components/guides/guide-list";
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

type Props = { params: Promise<{ roleId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roleId } = await params;
  const role = getGuideRole(roleId);
  return { title: role ? `Guides — ${role.label}` : "Rôle" };
}

export default async function GuideRolePage({ params }: Props) {
  const user = await requireUser({ permission: "home.view" });
  const { roleId } = await params;
  const role = getGuideRole(roleId);
  if (!role) notFound();

  const guides = publishedForUser(user, ALL_GUIDES).filter((g) =>
    g.roleIds.includes(role.id),
  );

  return (
    <PageShell>
      <PageHeader
        title={role.label}
        description={role.mission}
        backHref="/guides/roles"
        backLabel="Tous les rôles"
        breadcrumbs={[
          { label: "Guides", href: "/guides" },
          { label: "Rôles", href: "/guides/roles" },
          { label: role.label },
        ]}
      />

      <GuideCallout variant="tip" title="Visibilité ≠ autorisation">
        Consulter un guide n’accorde pas le droit d’exécuter l’action. Les
        permissions métier restent contrôlées par packs, groupes et overrides.
      </GuideCallout>

      <Surface className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-msk-ink">Modules</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {role.moduleIds.length === 0 ? (
              <li className="text-sm text-msk-ink/50">Non listé (profil spécial).</li>
            ) : (
              role.moduleIds.map((id) => {
                const mod = getGuideModule(id);
                return (
                  <li key={id}>
                    <Link
                      prefetch={false}
                      href={`/guides/modules/${id}`}
                      className="text-sm text-msk-blue hover:underline"
                    >
                      {mod?.label ?? id}
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </div>
        {role.limits.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-msk-ink">Limites</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-msk-ink/65">
              {role.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Surface>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
          Guides utiles
        </h2>
        <GuideList
          guides={guides}
          emptyMessage="Pas encore de guide rattaché à ce rôle."
        />
      </section>
    </PageShell>
  );
}
