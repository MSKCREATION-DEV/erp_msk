"use client";

import { FieldHint, FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { SOCIAL_NETWORKS, type SocialField } from "@/lib/crm/social";
import { cn } from "@/lib/utils";

export type SocialSelection = {
  selected: SocialField[];
  urls: Partial<Record<SocialField, string>>;
};

export function SocialNetworksEditor({
  value,
  onChange,
  disabled,
}: {
  value: SocialSelection;
  onChange: (next: SocialSelection) => void;
  disabled?: boolean;
}) {
  function toggle(field: SocialField) {
    const has = value.selected.includes(field);
    if (has) {
      const urls = { ...value.urls };
      delete urls[field];
      onChange({
        selected: value.selected.filter((f) => f !== field),
        urls,
      });
    } else {
      onChange({
        selected: [...value.selected, field],
        urls: value.urls,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Réseaux sociaux de l’entreprise</FieldLabel>
        <FieldHint>
          Sélectionnez les réseaux présents, puis renseignez les liens. Sans
          sélection = pas de présence connue.
        </FieldHint>
      </div>
      <div className="flex flex-wrap gap-2">
        {SOCIAL_NETWORKS.map((n) => {
          const on = value.selected.includes(n.field);
          return (
            <button
              key={n.field}
              type="button"
              disabled={disabled}
              onClick={() => toggle(n.field)}
              aria-pressed={on}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                on
                  ? "border-msk-blue bg-msk-blue text-white"
                  : "border-msk-ink/15 bg-white text-msk-ink/70 hover:border-msk-blue/40",
              )}
            >
              {n.label}
            </button>
          );
        })}
      </div>
      {value.selected.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_NETWORKS.filter((n) =>
            value.selected.includes(n.field),
          ).map((n) => (
            <div key={n.field}>
              <FieldLabel htmlFor={`social-${n.field}`}>
                Lien {n.label}
              </FieldLabel>
              <Input
                id={`social-${n.field}`}
                name={n.field}
                value={value.urls[n.field] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    urls: { ...value.urls, [n.field]: e.target.value },
                  })
                }
                placeholder={n.placeholder}
                disabled={disabled}
                inputMode="url"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
