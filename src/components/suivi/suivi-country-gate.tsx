import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { SvCountry } from "@/generated/prisma/client";
import {
  SV_COUNTRY_ISO,
  SV_COUNTRY_LABEL_FR,
  svCountryDisplayLabel,
  withSvCountryQuery,
} from "@/lib/suivi/country";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/**
 * Choix Mali | Togo pour **un** périmètre (Comptes / Mouvements / Stocks).
 * Affiché quand `?pays=` est absent. Un seul pays → redirect côté page (pas ici).
 */
export function SuiviCountryGate({
  countries,
  targetPath,
  pillarLabel,
}: {
  countries: SvCountry[];
  /** Chemin sans query, ex. `/suivi/comptes`. */
  targetPath: string;
  pillarLabel: string;
}) {
  if (countries.length === 0) {
    return (
      <PageShell>
        <PageHeader
          title={pillarLabel}
          description="Choisissez un pays pour continuer."
          backHref="/suivi"
          breadcrumbs={[
            { label: "Accueil", href: "/accueil" },
            { label: "Suivi", href: "/suivi" },
          ]}
        />
        <Surface className="p-5" role="status">
          <h2 className="text-sm font-semibold text-msk-ink">
            Accès pays Suivi manquant
          </h2>
          <p className="mt-1 text-sm text-msk-ink/55">
            Votre compte n’a pas de périmètre Mali ou Togo. Demandez l’accès à
            la Direction.
          </p>
          <Link
            prefetch={false}
            href="/accueil"
            className="mt-3 inline-flex text-sm font-medium text-msk-blue hover:underline"
          >
            Retour accueil
          </Link>
        </Surface>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={pillarLabel}
        description="Choisissez le pays pour ce périmètre — Mali et Togo restent séparés."
        backHref="/suivi"
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Suivi", href: "/suivi" },
        ]}
      />
      <section aria-labelledby="sv-gate-pays" className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2
            id="sv-gate-pays"
            className="text-lg font-semibold text-msk-ink"
          >
            Pays
          </h2>
          <p className="text-sm text-msk-ink/45">
            Un pays à la fois pour {pillarLabel.toLowerCase()}
          </p>
        </div>
        <div
          className={cn(
            "grid gap-3",
            countries.length > 1
              ? "sm:grid-cols-2"
              : "sm:grid-cols-1 sm:max-w-xl",
          )}
        >
          {countries.map((country) => (
            <Link
              key={country}
              prefetch={false}
              href={withSvCountryQuery(targetPath, country)}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-msk-ink/8 bg-white p-4 shadow-sm transition hover:border-msk-blue/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-msk-blue/10 text-msk-blue">
                  <MapPin className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-msk-ink group-hover:text-msk-blue">
                    {svCountryDisplayLabel(country)}
                  </p>
                  <p className="mt-0.5 text-sm text-msk-ink/50">
                    Ouvrir {pillarLabel.toLowerCase()} —{" "}
                    {SV_COUNTRY_LABEL_FR[country]} seulement (
                    {SV_COUNTRY_ISO[country]}).
                  </p>
                </div>
                <ArrowRight
                  className="mt-1 size-4 shrink-0 text-msk-ink/25 transition group-hover:translate-x-0.5 group-hover:text-msk-blue"
                  aria-hidden
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
