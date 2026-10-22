import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuideCallout } from "@/components/guides/guide-callout";
import { GuideStatusBadge } from "@/components/guides/guide-status-badge";
import { GuideSteps } from "@/components/guides/guide-steps";
import { GuideVisualBlock } from "@/components/guides/guide-visual";
import { GuideWorkflowView } from "@/components/guides/guide-workflow";
import { Surface } from "@/components/ui/surface";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/session";
import {
  canViewGuide,
  getGuide,
  getGuideModule,
  getGuideRole,
  getGuideTask,
  relatedGuides,
} from "@/lib/guides";
import { moduleVisual } from "@/lib/guides/module-visual";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ guideId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { guideId } = await params;
  const guide = getGuide(guideId);
  return { title: guide ? guide.title : "Guide" };
}

export default async function GuideDetailPage({ params }: Props) {
  const user = await requireUser({ permission: "home.view" });
  const { guideId } = await params;

  const guide = getGuide(guideId);
  if (!guide) notFound();
  if (guide.status === "draft" && !user.isSuperAdmin) notFound();
  if (!canViewGuide(user, guide)) {
    redirect("/accueil?error=acces_refuse");
  }

  const mod = getGuideModule(guide.moduleId);
  const related = relatedGuides(guide).filter((g) => canViewGuide(user, g));
  const hero =
    guide.visuals.find((v) => v.id === guide.heroVisualId) ??
    guide.visuals[0];
  const vis = moduleVisual(guide.moduleId);
  const ModIcon = vis.icon;

  return (
    <PageShell className="space-y-6">
      <PageHeader
        title={guide.title}
        description={guide.summary}
        backHref={mod ? `/guides/modules/${mod.id}` : "/guides"}
        backLabel={mod ? `Module ${mod.label}` : "Guides"}
        breadcrumbs={[
          { label: "Guides", href: "/guides" },
          ...(mod
            ? [{ label: mod.label, href: `/guides/modules/${mod.id}` }]
            : []),
          { label: guide.title },
        ]}
        actions={<GuideStatusBadge status={guide.status} />}
      />

      {guide.status === "to_validate" ? (
        <GuideCallout variant="warning" title="À valider">
          Certaines étapes ou libellés UI restent à confirmer sur l’écran réel.
          Ne pas traiter ce guide comme procédure officielle complète.
        </GuideCallout>
      ) : null}
      {guide.status === "outdated" ? (
        <GuideCallout variant="warning" title="À mettre à jour">
          L’interface ou les droits ont pu évoluer — vérifiez avant d’appliquer.
        </GuideCallout>
      ) : null}

      {/* Bandeau visuel + objectif */}
      <div className="grid gap-4 overflow-hidden rounded-3xl border border-msk-ink/6 bg-white lg:grid-cols-2">
        <div
          className={cn(
            "relative flex flex-col justify-between bg-gradient-to-br p-6 sm:p-8",
            vis.soft,
          )}
        >
          <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-msk-blue shadow-sm">
            <ModIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/40">
              Objectif
            </p>
            <p className="mt-2 text-base font-medium leading-relaxed text-msk-ink sm:text-lg">
              {guide.objective}
            </p>
            {guide.prerequisites.length > 0 ? (
              <ul className="mt-4 space-y-1.5 border-t border-msk-ink/8 pt-4 text-sm text-msk-ink/60">
                {guide.prerequisites.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-msk-blue" />
                    {p}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="bg-msk-chalk/40 p-3 sm:p-4">
          {hero ? (
            <GuideVisualBlock visual={hero} priority />
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center rounded-2xl border border-dashed border-msk-ink/15 bg-white text-sm text-msk-ink/40">
              Illustration à venir
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
              Procédure illustrée
            </h2>
            <GuideSteps steps={guide.steps} visuals={guide.visuals} />
          </section>

          {guide.expectedResult ? (
            <Surface className="p-5">
              <h2 className="text-sm font-semibold text-msk-ink">
                Résultat attendu
              </h2>
              <p className="mt-2 text-sm text-msk-ink/70">
                {guide.expectedResult}
              </p>
            </Surface>
          ) : null}

          {guide.workflow ? (
            <Surface className="p-5">
              <GuideWorkflowView workflow={guide.workflow} />
            </Surface>
          ) : null}

          {guide.bestPractices.length > 0 ? (
            <Surface className="p-5">
              <h2 className="text-sm font-semibold text-msk-ink">
                Bonnes pratiques
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-msk-ink/65">
                {guide.bestPractices.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Surface>
          ) : null}

          {guide.troubleshooting.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
                Dépannage
              </h2>
              <ul className="space-y-3">
                {guide.troubleshooting.map((t) => (
                  <li key={t.problem}>
                    <Surface className="space-y-2 p-5 text-sm">
                      <p>
                        <span className="font-medium text-msk-ink">
                          Problème :{" "}
                        </span>
                        <span className="text-msk-ink/70">{t.problem}</span>
                      </p>
                      <p>
                        <span className="font-medium text-msk-ink">
                          Cause possible :{" "}
                        </span>
                        <span className="text-msk-ink/70">{t.cause}</span>
                      </p>
                      {t.check ? (
                        <p>
                          <span className="font-medium text-msk-ink">
                            Vérification :{" "}
                          </span>
                          <span className="text-msk-ink/70">{t.check}</span>
                        </p>
                      ) : null}
                      <p>
                        <span className="font-medium text-msk-ink">
                          Solution :{" "}
                        </span>
                        <span className="text-msk-ink/70">{t.solution}</span>
                      </p>
                      {t.escalate ? (
                        <p>
                          <span className="font-medium text-msk-ink">
                            Escalade :{" "}
                          </span>
                          <span className="text-msk-ink/70">{t.escalate}</span>
                        </p>
                      ) : null}
                    </Surface>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Surface className="space-y-3 p-4 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-msk-ink/35">
              Contexte
            </p>
            <dl className="space-y-2 text-msk-ink/65">
              <div>
                <dt className="text-xs text-msk-ink/40">Module</dt>
                <dd>
                  {mod ? (
                    <Link
                      prefetch={false}
                      href={`/guides/modules/${mod.id}`}
                      className="text-msk-blue hover:underline"
                    >
                      {mod.label}
                    </Link>
                  ) : (
                    guide.moduleId
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-msk-ink/40">Mis à jour</dt>
                <dd>{guide.updatedAt}</dd>
              </div>
              {guide.difficulty ? (
                <div>
                  <dt className="text-xs text-msk-ink/40">Niveau</dt>
                  <dd className="capitalize">{guide.difficulty}</dd>
                </div>
              ) : null}
            </dl>
            {guide.roleIds.length > 0 ? (
              <div>
                <p className="text-xs text-msk-ink/40">Rôles</p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {guide.roleIds.map((id) => (
                    <li key={id}>
                      <Link
                        prefetch={false}
                        href={`/guides/roles/${id}`}
                        className="rounded bg-msk-ink/5 px-1.5 py-0.5 text-xs hover:bg-msk-blue/10 hover:text-msk-blue"
                      >
                        {getGuideRole(id)?.label ?? id}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {guide.taskIds.length > 0 ? (
              <div>
                <p className="text-xs text-msk-ink/40">Tâches</p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {guide.taskIds.map((id) => (
                    <li key={id}>
                      <Link
                        prefetch={false}
                        href={`/guides/taches/${id}`}
                        className="rounded bg-msk-ink/5 px-1.5 py-0.5 text-xs hover:bg-msk-blue/10 hover:text-msk-blue"
                      >
                        {getGuideTask(id)?.label ?? id}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {guide.steps.length > 1 ? (
              <nav aria-label="Table des matières">
                <p className="text-xs text-msk-ink/40">Étapes</p>
                <ol className="mt-1 space-y-1">
                  {guide.steps.map((s, i) => (
                    <li key={s.title}>
                      <a
                        href={`#etape-${i + 1}`}
                        className="text-xs text-msk-blue hover:underline"
                      >
                        {i + 1}. {s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
          </Surface>

          {related.length > 0 ? (
            <Surface className="space-y-2 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-msk-ink/35">
                Guides associés
              </p>
              <ul className="space-y-2">
                {related.map((g) => (
                  <li key={g.id}>
                    <Link
                      prefetch={false}
                      href={`/guides/${g.id}`}
                      className="text-sm text-msk-blue hover:underline"
                    >
                      {g.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Surface>
          ) : null}
        </aside>
      </div>
    </PageShell>
  );
}
