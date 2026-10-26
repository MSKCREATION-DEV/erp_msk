"use client";

import { useMemo, useState } from "react";
import { Check, Package, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  schemaForSku,
  type OfferOptionField,
  type OfferOptionSchema,
} from "@/lib/crm/offer-option-schemas";
import { cn } from "@/lib/utils";

export type CatalogOfferOption = {
  id: string;
  name: string;
  sku: string;
};

type Props = {
  offers: CatalogOfferOption[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  configs: Record<string, Record<string, unknown>>;
  onConfigsChange: (
    next: Record<string, Record<string, unknown>>,
  ) => void;
  disabled?: boolean;
};

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-msk-blue bg-msk-blue text-white shadow-sm shadow-msk-blue/20"
          : "border-msk-ink/12 bg-white text-msk-ink/70 hover:border-msk-blue/35 hover:text-msk-ink",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function FieldConfig({
  field,
  value,
  disabled,
  onChange,
}: {
  field: OfferOptionField;
  value: unknown;
  disabled?: boolean;
  onChange: (next: unknown) => void;
}) {
  if (field.type === "multi") {
    const cur = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-msk-ink/40">
          {field.label}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((o) => {
            const on = cur.includes(o.value);
            return (
              <Chip
                key={o.value}
                active={on}
                disabled={disabled}
                onClick={() =>
                  onChange(
                    on
                      ? cur.filter((x) => x !== o.value)
                      : [...cur, o.value],
                  )
                }
              >
                {on ? <Check className="h-3 w-3" aria-hidden /> : null}
                {o.label}
              </Chip>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "single") {
    const cur = typeof value === "string" ? value : null;
    return (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-msk-ink/40">
          {field.label}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((o) => (
            <Chip
              key={o.value}
              active={cur === o.value}
              disabled={disabled}
              onClick={() => onChange(cur === o.value ? null : o.value)}
            >
              {cur === o.value ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : null}
              {o.label}
            </Chip>
          ))}
        </div>
      </div>
    );
  }

  const on = value === true;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition",
        on
          ? "border-msk-blue/35 bg-msk-blue/6"
          : "border-msk-ink/10 bg-white hover:border-msk-ink/18",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <span className="text-sm font-medium text-msk-ink">{field.label}</span>
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition",
          on ? "bg-msk-blue" : "bg-msk-ink/15",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition",
            on && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}

function OfferConfigPanel({
  offer,
  schema,
  config,
  disabled,
  onRemove,
  onConfigChange,
}: {
  offer: CatalogOfferOption;
  schema: OfferOptionSchema | null;
  config: Record<string, unknown>;
  disabled?: boolean;
  onRemove: () => void;
  onConfigChange: (key: string, value: unknown) => void;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-msk-ink/8 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-msk-blue/10 text-msk-blue">
              <Package className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-msk-ink">
                {offer.name}
              </h3>
              <p className="font-mono text-[11px] text-msk-ink/40">{offer.sku}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-msk-ink/35 transition hover:bg-msk-coral/10 hover:text-msk-coral"
          aria-label={`Retirer ${offer.name}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {schema && schema.fields.length > 0 ? (
        <div className="space-y-4 border-t border-msk-ink/6 pt-4">
          {schema.fields.map((field) => (
            <FieldConfig
              key={field.key}
              field={field}
              value={config[field.key]}
              disabled={disabled}
              onChange={(next) => onConfigChange(field.key, next)}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-msk-chalk/60 px-3 py-2.5 text-xs text-msk-ink/45">
          Aucune option à préciser — offre liée telle quelle.
        </p>
      )}
    </article>
  );
}

/**
 * Étape Offres — catalogue cliquable plein largeur + config inline (chips / switches).
 */
export function ProspectOffersStep({
  offers,
  selectedIds,
  onSelectedIdsChange,
  configs,
  onConfigsChange,
  disabled,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return offers;
    return offers.filter(
      (o) =>
        o.name.toLowerCase().includes(needle) ||
        o.sku.toLowerCase().includes(needle),
    );
  }, [offers, q]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggleOffer(id: string) {
    if (selectedSet.has(id)) {
      onSelectedIdsChange(selectedIds.filter((x) => x !== id));
      const next = { ...configs };
      delete next[id];
      onConfigsChange(next);
      return;
    }
    onSelectedIdsChange([...selectedIds, id]);
  }

  const selectedOffers = selectedIds
    .map((id) => offers.find((o) => o.id === id))
    .filter((o): o is CatalogOfferOption => Boolean(o));

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="step-offres"
              className="text-lg font-semibold text-msk-ink"
            >
              Offres proposées
            </h2>
            <p className="mt-1 text-sm text-msk-ink/50">
              Cliquez pour ajouter — configurez ensuite chaque offre. Optionnel.
            </p>
          </div>
          {selectedIds.length > 0 ? (
            <p className="rounded-full bg-msk-blue/10 px-3 py-1 text-xs font-semibold text-msk-blue">
              {selectedIds.length} sélectionnée
              {selectedIds.length > 1 ? "s" : ""}
            </p>
          ) : null}
        </div>

        <div className="relative mb-4 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-msk-ink/35"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrer le catalogue…"
            disabled={disabled}
            className="pl-9"
            aria-label="Filtrer le catalogue"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-msk-ink/12 bg-msk-chalk/40 px-4 py-10 text-center text-sm text-msk-ink/45">
            Aucune offre ne correspond à « {q.trim()} ».
          </p>
        ) : (
          <ul className="grid min-w-0 gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
            {filtered.map((o) => {
              const active = selectedSet.has(o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleOffer(o.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-full w-full items-start gap-3 rounded-2xl border px-3.5 py-3.5 text-left transition",
                      active
                        ? "border-msk-blue bg-msk-blue/6 shadow-sm shadow-msk-blue/10"
                        : "border-msk-ink/8 bg-white hover:border-msk-blue/30 hover:shadow-sm",
                      disabled && "pointer-events-none opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                        active
                          ? "border-msk-blue bg-msk-blue text-white"
                          : "border-msk-ink/20 bg-white",
                      )}
                    >
                      {active ? (
                        <Check className="h-3 w-3" aria-hidden />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-msk-ink">
                        {o.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-msk-ink/40">
                        {o.sku}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-msk-ink">
            Configuration
          </h3>
          <p className="text-xs text-msk-ink/40">
            Affinez réseaux, type de site, options…
          </p>
        </div>

        {selectedOffers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-msk-ink/12 bg-msk-chalk/30 px-4 py-12 text-center">
            <Package
              className="mx-auto h-8 w-8 text-msk-ink/25"
              aria-hidden
            />
            <p className="mt-3 text-sm font-medium text-msk-ink/55">
              Aucune offre sélectionnée
            </p>
            <p className="mt-1 text-xs text-msk-ink/40">
              Le prospect peut être créé sans offre — vous pourrez en ajouter
              sur la fiche.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
            {selectedOffers.map((offer) => (
              <OfferConfigPanel
                key={offer.id}
                offer={offer}
                schema={schemaForSku(offer.sku)}
                config={configs[offer.id] ?? {}}
                disabled={disabled}
                onRemove={() => toggleOffer(offer.id)}
                onConfigChange={(key, value) =>
                  onConfigsChange({
                    ...configs,
                    [offer.id]: {
                      ...(configs[offer.id] ?? {}),
                      [key]: value,
                    },
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
