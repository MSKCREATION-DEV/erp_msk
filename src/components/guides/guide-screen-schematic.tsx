import { cn } from "@/lib/utils";
import type { GuideVisual } from "@/lib/guides";

const ZONE_POS: Record<
  string,
  { top: string; left: string; w: string; h: string }
> = {
  sidebar: { top: "12%", left: "2%", w: "18%", h: "78%" },
  header: { top: "8%", left: "24%", w: "72%", h: "10%" },
  toolbar: { top: "20%", left: "24%", w: "72%", h: "8%" },
  main: { top: "30%", left: "24%", w: "72%", h: "58%" },
  table: { top: "34%", left: "26%", w: "68%", h: "42%" },
  form: { top: "32%", left: "28%", w: "64%", h: "50%" },
  cta: { top: "22%", left: "72%", w: "22%", h: "8%" },
};

/**
 * Schéma d’écran ERP annoté — clairement illustratif (pas une fausse capture).
 * Reproduit chrome sidebar + zone principale avec pastilles numérotées.
 */
export function GuideScreenSchematic({
  visual,
  className,
}: {
  visual: GuideVisual;
  className?: string;
}) {
  const nav = visual.highlightNav ?? "Module";
  const title = visual.chromeTitle ?? "ERP MSK";

  return (
    <figure className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-2xl border border-msk-ink/10 bg-[#F4F6F9] shadow-[0_8px_30px_rgba(13,19,48,0.08)]">
        {/* Barre fenêtre */}
        <div className="flex items-center gap-2 border-b border-msk-ink/6 bg-white px-3 py-2">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-msk-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-msk-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-msk-ink/15" />
          </span>
          <span className="ml-2 truncate rounded-md bg-msk-chalk px-2 py-0.5 text-[10px] font-medium text-msk-ink/45">
            {title}
          </span>
        </div>

        <div className="relative aspect-[16/10] w-full">
          {/* Sidebar */}
          <div className="absolute bottom-0 left-0 top-0 w-[22%] border-r border-msk-ink/6 bg-white p-2">
            <div className="mb-3 h-3 w-14 rounded bg-msk-blue/25" />
            {["Accueil", "Guides", nav, "…"].map((label) => {
              const active = label === nav;
              return (
                <div
                  key={label}
                  className={cn(
                    "mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] sm:text-[11px]",
                    active
                      ? "bg-msk-blue/12 font-semibold text-msk-blue ring-1 ring-msk-blue/30"
                      : "text-msk-ink/40",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      active ? "bg-msk-blue" : "bg-msk-ink/20",
                    )}
                  />
                  <span className="truncate">{label}</span>
                </div>
              );
            })}
          </div>

          {/* Main */}
          <div className="absolute bottom-0 left-[22%] right-0 top-0 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="space-y-1.5">
                <div className="h-3 w-28 rounded bg-msk-ink/20 sm:w-36" />
                <div className="h-2 w-40 rounded bg-msk-ink/10 sm:w-52" />
              </div>
              <div className="h-7 w-20 rounded-lg bg-msk-blue shadow-sm shadow-msk-blue/25" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl border border-msk-ink/6 bg-white sm:h-16"
                />
              ))}
            </div>
            <div className="mt-2 h-[38%] rounded-xl border border-dashed border-msk-ink/10 bg-white/80" />
          </div>

          {/* Callout pins */}
          {visual.callouts.map((c) => {
            const pos = ZONE_POS[c.zone] ?? ZONE_POS.main;
            return (
              <div
                key={`${c.n}-${c.label}`}
                className="absolute z-10"
                style={{
                  top: pos.top,
                  left: `calc(${pos.left} + ${pos.w} / 2 - 0.75rem)`,
                }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-msk-coral text-[11px] font-bold text-white shadow-md ring-2 ring-white">
                  {c.n}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {visual.callouts.length > 0 ? (
        <ol className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
          {visual.callouts.map((c) => (
            <li
              key={`leg-${c.n}`}
              className="inline-flex items-center gap-1.5 text-xs text-msk-ink/60"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-msk-coral text-[9px] font-bold text-white">
                {c.n}
              </span>
              {c.label}
            </li>
          ))}
        </ol>
      ) : null}

      <figcaption className="px-1 text-xs text-msk-ink/40">
        {visual.caption ??
          "Schéma illustratif de l’interface — repères pour localiser l’action."}
      </figcaption>
    </figure>
  );
}
