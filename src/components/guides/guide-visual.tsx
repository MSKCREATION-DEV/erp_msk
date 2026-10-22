import Image from "next/image";
import type { GuideVisual } from "@/lib/guides";
import { guideShotExists } from "@/lib/guides/shot-exists";
import { GuideScreenSchematic } from "./guide-screen-schematic";
import { cn } from "@/lib/utils";

/**
 * Affiche une capture réelle si le fichier existe, sinon le schéma annoté.
 * Server Component uniquement (contrôle fs via `guideShotExists`).
 */
export function GuideVisualBlock({
  visual,
  className,
  priority = false,
}: {
  visual: GuideVisual;
  className?: string;
  priority?: boolean;
}) {
  const hasShot =
    visual.kind === "screenshot" &&
    Boolean(visual.src) &&
    guideShotExists(visual.src!);

  if (hasShot && visual.src) {
    return (
      <figure className={cn("space-y-2", className)}>
        <div className="overflow-hidden rounded-2xl border border-msk-ink/10 bg-msk-ink/4 shadow-[0_12px_40px_rgba(13,19,48,0.1)]">
          <div className="relative aspect-[16/10] w-full bg-msk-chalk">
            <Image
              src={visual.src}
              alt={visual.alt}
              fill
              priority={priority}
              className="object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 720px"
            />
          </div>
          {visual.callouts.length > 0 ? (
            <ol className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-msk-ink/6 bg-white px-4 py-2.5">
              {visual.callouts.map((c) => (
                <li
                  key={c.n}
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
        </div>
        <figcaption className="px-1 text-xs text-msk-ink/40">
          {visual.caption ??
            "Capture de l’interface ERP MSK (données personnelles floutées)."}
        </figcaption>
      </figure>
    );
  }

  return (
    <GuideScreenSchematic
      visual={{
        ...visual,
        kind: "schematic",
        caption:
          visual.caption ??
          (visual.src
            ? "Schéma de repérage (capture absente — npm run guides:shots)."
            : undefined),
      }}
      className={className}
    />
  );
}
