import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { GuideStep, GuideVisual } from "@/lib/guides";
import { GuideCallout } from "./guide-callout";
import { GuideNavPath } from "./guide-nav-path";
import { GuideVisualBlock } from "./guide-visual";

export function GuideSteps({
  steps,
  visuals = [],
}: {
  steps: GuideStep[];
  visuals?: GuideVisual[];
}) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-msk-ink/50">
        Aucune étape détaillée pour ce guide.
      </p>
    );
  }

  const byId = new Map(visuals.map((v) => [v.id, v]));

  return (
    <ol className="space-y-8">
      {steps.map((step, i) => {
        const visual = step.visualId ? byId.get(step.visualId) : undefined;
        return (
          <li
            key={`${step.title}-${i}`}
            id={`etape-${i + 1}`}
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-msk-ink/6 bg-white shadow-[0_1px_3px_rgba(13,19,48,0.04)]"
          >
            <div className="flex items-center gap-3 border-b border-msk-ink/5 bg-gradient-to-r from-msk-blue/6 via-white to-transparent px-4 py-3 sm:px-5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-msk-blue text-sm font-bold text-white shadow-sm shadow-msk-blue/30"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-msk-ink sm:text-lg">
                  {step.title}
                </h3>
                {step.navPath ? (
                  <GuideNavPath path={step.navPath} className="mt-1.5" />
                ) : null}
              </div>
            </div>

            <div
              className={
                visual
                  ? "grid gap-0 lg:grid-cols-2"
                  : "px-4 py-4 sm:px-5 sm:py-5"
              }
            >
              <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
                <p className="text-sm leading-relaxed text-msk-ink/75">
                  {step.instruction}
                </p>
                {step.uiTarget ? (
                  <p className="inline-flex items-center gap-2 rounded-lg border border-msk-blue/20 bg-msk-blue/5 px-3 py-2 text-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-msk-blue/70">
                      Cible
                    </span>
                    <span className="font-medium text-msk-blue">
                      {step.uiTarget}
                    </span>
                  </p>
                ) : null}
                {step.href ? (
                  <Link
                    prefetch={false}
                    href={step.href}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-msk-blue hover:underline"
                  >
                    Ouvrir l’écran <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
                {step.caution ? (
                  <GuideCallout variant="warning" title="Précaution">
                    {step.caution}
                  </GuideCallout>
                ) : null}
                {step.expected ? (
                  <GuideCallout variant="tip" title="Résultat attendu">
                    {step.expected}
                  </GuideCallout>
                ) : null}
              </div>

              {visual ? (
                <div className="border-t border-msk-ink/5 bg-msk-chalk/60 p-3 sm:p-4 lg:border-l lg:border-t-0">
                  <GuideVisualBlock visual={visual} />
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
