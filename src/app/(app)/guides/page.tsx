import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Briefcase,
  HelpCircle,
  ListChecks,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { GuideFilters } from "@/components/guides/guide-filters";
import { GuideList } from "@/components/guides/guide-list";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/session";
import {
  featuredGuides,
  filterGuides,
  GUIDE_MODULES,
  publishedForUser,
  ALL_GUIDES,
} from "@/lib/guides";
import { moduleVisual } from "@/lib/guides/module-visual";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Guides",
};

export default async function GuidesHomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    module?: string;
    role?: string;
    task?: string;
  }>;
}) {
  const user = await requireUser({ permission: "home.view" });
  const params = await searchParams;
  const catalog = publishedForUser(user, ALL_GUIDES);
  const filtering = Boolean(
    params.q?.trim() || params.module || params.role || params.task,
  );

  const results = filtering
    ? filterGuides(catalog, {
        q: params.q,
        moduleId: params.module,
        roleId: params.role,
        taskId: params.task,
      })
    : featuredGuides(catalog, 6);

  const liveModules = GUIDE_MODULES.filter((m) => !m.stub).slice(0, 6);

  return (
    <PageShell className="space-y-8">
      {/* Hero visuel */}
      <section className="relative overflow-hidden rounded-3xl border border-msk-ink/6 bg-white shadow-[0_8px_32px_rgba(13,19,48,0.06)]">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#2A3D8E]/12 via-transparent to-[#00ACEE]/18"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-msk-blue/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[#00ACEE]/20 blur-3xl"
          aria-hidden
        />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-msk-blue/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-blue">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Centre d’aide MSK
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-msk-ink sm:text-4xl">
              Guides pour{" "}
              <span className="font-accent text-msk-blue italic">réussir</span>{" "}
              chaque opération
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-msk-ink/55 sm:text-base">
              Procédures illustrées, chemins de navigation et captures de
              l’ERP — par module, rôle ou tâche.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-msk-ink/40">
                <Search className="h-3.5 w-3.5" aria-hidden />
                Recherchez une action (« créer prospect », « GED »…)
              </div>
              <Suspense
                fallback={
                  <div className="h-11 animate-pulse rounded-xl bg-msk-ink/6" />
                }
              >
                <ListSearchForm
                  placeholder="Ex. créer un prospect, accès refusé, relance…"
                  autoFocus
                />
              </Suspense>
            </div>
          </div>

          {/* Mini preview schéma */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-msk-blue/5 to-[#00ACEE]/10" />
            <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/70 p-3 shadow-inner backdrop-blur">
              <div className="flex aspect-[4/3] overflow-hidden rounded-xl border border-msk-ink/8 bg-[#F4F6F9]">
                <div className="w-[28%] border-r border-msk-ink/6 bg-white p-2">
                  <div className="mb-2 h-2 w-10 rounded bg-msk-blue/30" />
                  {["Accueil", "Guides", "Commercial"].map((l, i) => (
                    <div
                      key={l}
                      className={cn(
                        "mb-1 rounded-md px-1.5 py-1 text-[9px]",
                        i === 1
                          ? "bg-msk-blue/15 font-semibold text-msk-blue"
                          : "text-msk-ink/35",
                      )}
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="h-3 w-24 rounded bg-msk-ink/15" />
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white shadow-sm ring-1 ring-msk-ink/5" />
                    <div className="rounded-lg bg-white shadow-sm ring-1 ring-msk-ink/5" />
                    <div className="col-span-2 rounded-lg bg-msk-blue/10 ring-1 ring-msk-blue/20" />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] text-msk-ink/40">
                Aperçu — chaque guide montre l’écran à viser
              </p>
            </div>
          </div>
        </div>
      </section>

      <GuideFilters
        q={params.q}
        moduleId={params.module}
        roleId={params.role}
        taskId={params.task}
      />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
            {filtering ? `Résultats (${results.length})` : "À commencer"}
          </h2>
          {!filtering ? (
            <Link
              prefetch={false}
              href="/guides?module=commercial"
              className="inline-flex items-center gap-1 text-sm font-medium text-msk-blue hover:underline"
            >
              Commercial <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
        <GuideList
          guides={results}
          emptyMessage="Aucun guide trouvé. Effacez les filtres ou reformulez."
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: "/guides/modules",
            title: "Par module",
            desc: "CRM, GED, RH…",
            icon: Briefcase,
            tint: "from-[#2A3D8E]/15 to-msk-blue/10",
          },
          {
            href: "/guides/roles",
            title: "Par rôle",
            desc: "Packs & groupes",
            icon: Users,
            tint: "from-msk-blue/12 to-[#00ACEE]/15",
          },
          {
            href: "/guides/taches",
            title: "Par tâche",
            desc: "Créer, suivre…",
            icon: ListChecks,
            tint: "from-[#00ACEE]/15 to-msk-chalk",
          },
          {
            href: "/guides/faq",
            title: "FAQ",
            desc: "Dépannage rapide",
            icon: HelpCircle,
            tint: "from-msk-coral/10 to-msk-chalk",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              prefetch={false}
              href={item.href}
              className="group block cursor-pointer"
            >
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl border border-msk-ink/6 bg-gradient-to-br p-5 transition group-hover:border-msk-blue/25 group-hover:shadow-md",
                  item.tint,
                )}
              >
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-msk-blue shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-semibold text-msk-ink">{item.title}</p>
                <p className="mt-0.5 text-sm text-msk-ink/50">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="space-y-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
          Modules illustrés
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {liveModules.map((m) => {
            const vis = moduleVisual(m.id);
            const Icon = vis.icon;
            return (
              <Link
                key={m.id}
                prefetch={false}
                href={`/guides/modules/${m.id}`}
                className="group block cursor-pointer"
              >
                <div className="flex overflow-hidden rounded-2xl border border-msk-ink/6 bg-white transition group-hover:border-msk-blue/20 group-hover:shadow-md">
                  <div
                    className={cn(
                      "flex w-16 shrink-0 items-center justify-center bg-gradient-to-b",
                      vis.soft,
                    )}
                  >
                    <Icon className={cn("h-6 w-6", vis.accent)} />
                  </div>
                  <div className="min-w-0 p-4">
                    <p className="font-medium text-msk-ink">{m.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-msk-ink/50">
                      {m.objective}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
