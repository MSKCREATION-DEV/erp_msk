import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GuideStatusBadge } from "@/components/guides/guide-status-badge";
import { getGuideModule, type Guide } from "@/lib/guides";
import { moduleVisual } from "@/lib/guides/module-visual";
import { cn } from "@/lib/utils";

export function GuideList({
  guides,
  emptyMessage = "Aucun guide ne correspond à votre recherche.",
}: {
  guides: Guide[];
  emptyMessage?: string;
}) {
  if (guides.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-msk-ink/12 bg-white px-5 py-14 text-center text-sm text-msk-ink/50">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="grid min-w-0 gap-4 grid-cols-1 @min-[28rem]:grid-cols-2 @min-[52rem]:grid-cols-3">
      {guides.map((g) => {
        const mod = getGuideModule(g.moduleId);
        const vis = moduleVisual(g.moduleId);
        const Icon = vis.icon;
        return (
          <li key={g.id}>
            <Link
              prefetch={false}
              href={`/guides/${g.id}`}
              className="group block h-full cursor-pointer"
            >
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-msk-ink/6 bg-white shadow-[0_1px_2px_rgba(13,19,48,0.04)] transition group-hover:-translate-y-0.5 group-hover:border-msk-blue/25 group-hover:shadow-[0_12px_28px_rgba(29,115,188,0.12)]">
                <div
                  className={cn(
                    "relative flex h-28 items-end bg-gradient-to-br p-4",
                    vis.soft,
                  )}
                >
                  <span className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 text-msk-blue shadow-sm backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </span>
                  <GuideStatusBadge status={g.status} />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-msk-ink/35">
                    {mod?.label ?? g.moduleId}
                  </span>
                  <span className="mt-1 font-semibold text-msk-ink group-hover:text-msk-blue">
                    {g.title}
                  </span>
                  <span className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-msk-ink/50">
                    {g.summary}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-msk-blue">
                    Voir le guide{" "}
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </article>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
