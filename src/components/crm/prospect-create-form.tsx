"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CrmSource } from "@prisma/client";
import { createProspectAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  OptionPickerMulti,
  OptionPickerSingle,
} from "@/components/ui/option-picker-modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import { SOURCE_LABELS } from "@/lib/crm/labels";
import {
  schemaForSku,
  type OfferOptionSchema,
} from "@/lib/crm/offer-option-schemas";
import { cn } from "@/lib/utils";

const STEPS = [
  "Entreprise",
  "Contact",
  "Origine & suivi",
  "Offres",
] as const;

const SOURCE_OPTIONS = (
  [
    "INSTAGRAM",
    "LINKEDIN",
    "WHATSAPP",
    "TIKTOK",
    "GOOGLE_MAPS",
    "GOOGLE",
    "SNAPCHAT",
    "TERRAIN",
    "RECOMMANDATION",
    "EMAIL",
    "TELEPHONE",
    "AUTRE",
  ] as const
).map((s) => ({ value: s, label: SOURCE_LABELS[s] }));

type OfferRow = {
  catalogOfferId: string;
  config: Record<string, unknown>;
};

export function ProspectCreateForm({
  offers,
}: {
  offers: { id: string; name: string; sku: string }[];
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<CrmSource | null>("INSTAGRAM");
  const [offerIds, setOfferIds] = useState<string[]>([]);
  const [configs, setConfigs] = useState<Record<string, Record<string, unknown>>>(
    {},
  );

  const offerOptions = useMemo(
    () =>
      offers.map((o) => ({
        value: o.id,
        label: o.name,
        description: o.sku,
      })),
    [offers],
  );

  function schemaForId(id: string): OfferOptionSchema | null {
    const o = offers.find((x) => x.id === id);
    return o ? schemaForSku(o.sku) : null;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (source) fd.set("source", source);
    const links: OfferRow[] = offerIds.map((id) => ({
      catalogOfferId: id,
      config: configs[id] ?? {},
    }));
    fd.set("offersJson", JSON.stringify(links));
    void run(async () => {
      const res = await createProspectAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      if (res.opportunityId) router.push(`/crm/prospects/${res.opportunityId}`);
      else router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      aria-busy={pending || undefined}
    >
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              disabled={pending}
              onClick={() => setStep(i)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                i === step
                  ? "bg-msk-blue text-white"
                  : i < step
                    ? "bg-msk-chalk text-msk-ink"
                    : "text-msk-ink/35",
              )}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <div className={cn(step !== 0 && "hidden")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="orgName">Entreprise *</Label>
            <Input id="orgName" name="orgName" required disabled={pending} />
          </div>
          <div>
            <Label htmlFor="sector">Secteur</Label>
            <Input id="sector" name="sector" disabled={pending} />
          </div>
          <div>
            <Label htmlFor="city">Ville</Label>
            <Input id="city" name="city" disabled={pending} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="website">Site web</Label>
            <Input id="website" name="website" disabled={pending} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className={cn(step !== 1 && "hidden")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="contactFirst">Prénom *</Label>
            <Input
              id="contactFirst"
              name="contactFirst"
              required={step === 1}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="contactLast">Nom</Label>
            <Input id="contactLast" name="contactLast" disabled={pending} />
          </div>
          <div>
            <Label htmlFor="jobTitle">Poste</Label>
            <Input id="jobTitle" name="jobTitle" disabled={pending} />
          </div>
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" disabled={pending} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" disabled={pending} />
          </div>
        </div>
      </div>

      <div className={cn(step !== 2 && "hidden")}>
        <div className="space-y-4">
          <OptionPickerSingle
            label="Origine"
            options={SOURCE_OPTIONS}
            value={source}
            onChange={(v) => setSource((v as CrmSource) ?? "AUTRE")}
            disabled={pending}
            placeholder="Choisir l’origine"
          />
          <div>
            <Label htmlFor="nextAction">Prochaine action</Label>
            <Input id="nextAction" name="nextAction" disabled={pending} />
          </div>
          <div>
            <Label htmlFor="followUpAt">Date de relance</Label>
            <Input
              id="followUpAt"
              name="followUpAt"
              type="date"
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="budgetXof">Budget estimé (FCFA)</Label>
            <Input
              id="budgetXof"
              name="budgetXof"
              inputMode="numeric"
              disabled={pending}
            />
          </div>
        </div>
      </div>

      <div className={cn(step !== 3 && "hidden")}>
        <OptionPickerMulti
          label="Offres proposées"
          options={offerOptions}
          value={offerIds}
          onChange={setOfferIds}
          disabled={pending}
          placeholder="Ajouter une ou plusieurs offres"
          modalTitle="Catalogue MSK"
        />
        <div className="mt-4 space-y-4">
          {offerIds.map((id) => {
            const offer = offers.find((o) => o.id === id);
            const schema = schemaForId(id);
            if (!offer || !schema) return null;
            return (
              <div
                key={id}
                className="rounded-xl border border-msk-ink/[0.08] bg-msk-chalk/40 p-3"
              >
                <p className="text-sm font-semibold text-msk-ink">
                  {offer.name}
                </p>
                <div className="mt-3 space-y-3">
                  {schema.fields.map((field) => {
                    if (field.type === "multi") {
                      const cur = (configs[id]?.[field.key] as string[]) ?? [];
                      return (
                        <OptionPickerMulti
                          key={field.key}
                          label={field.label}
                          options={field.options}
                          value={cur}
                          onChange={(v) =>
                            setConfigs((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], [field.key]: v },
                            }))
                          }
                          disabled={pending}
                        />
                      );
                    }
                    if (field.type === "single") {
                      const cur =
                        (configs[id]?.[field.key] as string | undefined) ??
                        null;
                      return (
                        <OptionPickerSingle
                          key={field.key}
                          label={field.label}
                          options={field.options}
                          value={cur}
                          onChange={(v) =>
                            setConfigs((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], [field.key]: v },
                            }))
                          }
                          disabled={pending}
                        />
                      );
                    }
                    const on = configs[id]?.[field.key] === true;
                    return (
                      <label
                        key={field.key}
                        className="flex items-center gap-2 text-sm text-msk-ink"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={pending}
                          onChange={(e) =>
                            setConfigs((prev) => ({
                              ...prev,
                              [id]: {
                                ...prev[id],
                                [field.key]: e.target.checked,
                              },
                            }))
                          }
                        />
                        {field.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {step > 0 ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => setStep((s) => s - 1)}
          >
            Retour
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending
            ? "Création…"
            : step < STEPS.length - 1
              ? "Continuer"
              : "Créer le prospect"}
        </Button>
      </div>
    </form>
  );
}
