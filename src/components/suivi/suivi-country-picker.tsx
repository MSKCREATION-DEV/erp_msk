import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { SvCountry } from "@/generated/prisma/client";
import {
  SV_COUNTRY_ISO,
  SV_COUNTRY_LABEL_FR,
  svCountryDisplayLabel,
  withSvCountryQuery,
} from "@/lib/suivi/country";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

const PILLAR_LINKS: {
  href: string;
  label: string;
}[] = [
  { href: "/suivi/comptes", label: "Comptes" },
  { href: "/suivi/mouvements", label: "Mouvements" },
  { href: "/suivi/stocks", label: "Stocks" },
];

/**
 * Entrée pays V1 — Mali / Togo selon droits (`sv.country.*`).
 * Un seul pays → une carte (pas d’écran vide). Aucun → message clair.
 */
export function SuiviCountryPicker({
  countries,
}: {
  countries: SvCountry[];
}) {
  if (countries.length === 0) {
    return (
      <Surface className="p-5" role="status">
        <h2 className="text-sm font-semibold text-msk-ink">
          Accès pays Suivi manquant
        </h2>
        <p className="mt-1 text-sm text-msk-ink/55">
          Votre compte n’a pas de périmètre Mali ou Togo. Demandez l’accès à la
          Direction.
        </p>
        <Link
          prefetch={false}
          href="/accueil"
          className="mt-3 inline-flex text-sm font-medium text-msk-blue hover:underline"
        >
          Retour accueil
        </Link>
      </Surface>
    );
  }

  return (
    <section aria-labelledby="sv-hub-pays" className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          id="sv-hub-pays"
          className="text-lg font-semibold text-msk-ink"
        >
          Pays
        </h2>
        <p className="text-sm text-msk-ink/45">
          Comptes, mouvements et stocks — un pays à la fois
        </p>
      </div>
      <div
        className={cn(
          "grid gap-3",
          countries.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1 sm:max-w-xl",
        )}
      >
        {countries.map((country) => (
          <CountryCard key={country} country={country} />
        ))}
      </div>
    </section>
  );
}

function CountryCard({ country }: { country: SvCountry }) {
  const primaryHref = withSvCountryQuery("/suivi/comptes", country);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-msk-ink/8 bg-white shadow-sm transition hover:border-msk-blue/30 hover:shadow-md">
      <Link
        prefetch={false}
        href={primaryHref}
        className="group flex flex-1 flex-col p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40"
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
              Caisse, banque, registre et inventaire —{" "}
              {SV_COUNTRY_LABEL_FR[country]} seulement ({SV_COUNTRY_ISO[country]}
              ).
            </p>
          </div>
          <ArrowRight
            className="mt-1 size-4 shrink-0 text-msk-ink/25 transition group-hover:translate-x-0.5 group-hover:text-msk-blue"
            aria-hidden
          />
        </div>
      </Link>
      <div className="flex flex-wrap gap-2 border-t border-msk-ink/6 bg-msk-chalk/40 px-4 py-2.5">
        {PILLAR_LINKS.map((link) => (
          <Link
            key={link.href}
            prefetch={false}
            href={withSvCountryQuery(link.href, country)}
            className="inline-flex h-8 items-center rounded-lg border border-msk-ink/10 bg-white px-2.5 text-xs font-medium text-msk-ink/70 transition hover:border-msk-blue/25 hover:text-msk-blue"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
