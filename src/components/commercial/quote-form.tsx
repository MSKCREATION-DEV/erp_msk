"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createQuoteAction } from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import { usePendingAction } from "@/hooks/use-pending-action";
import { computeDocTotals } from "@/lib/commercial/totals";
import { formatComMoney } from "@/lib/commercial/labels";
import { assertLinesAboveFloor } from "@/lib/commercial/floor-price";
import { formatXof } from "@/lib/crm/labels";
import { cn } from "@/lib/utils";

type Offer = {
  id: string;
  name: string;
  sku: string;
  priceXof: number | null;
  floorPriceXof: number | null;
};

type Line = {
  key: string;
  label: string;
  qty: number;
  unitPrice: number;
  catalogOfferId?: string;
  isTravel?: boolean;
};

export type QuotePrefillLine = {
  label: string;
  qty: number;
  unitPrice: number;
  catalogOfferId?: string;
};

export function QuoteCreateForm({
  clients,
  offers,
  defaultClientId,
  defaultOpportunityId,
  defaultIncludeTravel,
  initialLines,
  defaultObject,
  /** Modal fiche prospect : pas de redirect, callback succès. */
  embedded = false,
  fromProspect = false,
  onSuccess,
  onCancel,
}: {
  clients: { id: string; name: string; includeTravelDefault: boolean }[];
  offers: Offer[];
  defaultClientId?: string;
  defaultOpportunityId?: string;
  defaultIncludeTravel?: boolean;
  initialLines?: QuotePrefillLine[];
  defaultObject?: string;
  embedded?: boolean;
  fromProspect?: boolean;
  /** Callback async — le pending du formulaire attend la fin (ex. PDF). */
  onSuccess?: (quoteId: string) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [regime, setRegime] = useState<"ML" | "FR">("ML");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoPercent, setPromoPercent] = useState(10);
  const [includeTravel, setIncludeTravel] = useState(
    defaultIncludeTravel ?? false,
  );
  const [objectDraft, setObjectDraft] = useState(defaultObject ?? "");
  const [lines, setLines] = useState<Line[]>(() => {
    if (initialLines?.length) {
      return initialLines.map((l, i) => ({
        key: `prefill-${i}`,
        label: l.label,
        qty: l.qty,
        unitPrice: l.unitPrice,
        catalogOfferId: l.catalogOfferId,
      }));
    }
    return [{ key: "1", label: "", qty: 1, unitPrice: 0 }];
  });

  const vatRate = regime === "FR" ? 20 : 18;
  const currency = regime === "FR" ? "EUR" : "XOF";
  const clientLocked = Boolean(fromProspect && defaultClientId);

  const totals = useMemo(
    () =>
      computeDocTotals({
        lines,
        vatEnabled,
        vatRate,
        promoEnabled,
        promoPercent,
        includeTravel,
      }),
    [lines, vatEnabled, vatRate, promoEnabled, promoPercent, includeTravel],
  );

  function floorFor(catalogOfferId?: string) {
    if (!catalogOfferId) return null;
    return offers.find((o) => o.id === catalogOfferId)?.floorPriceXof ?? null;
  }

  function addLineFromOffer(offerId: string) {
    const o = offers.find((x) => x.id === offerId);
    if (!o) return;
    // Catalogue = XOF uniquement — en FR/EUR on préremplit le libellé, prix à saisir.
    setLines((prev) => [
      ...prev,
      {
        key: `${Date.now()}`,
        label: `${o.sku} · ${o.name}`,
        qty: 1,
        unitPrice: currency === "EUR" ? 0 : (o.priceXof ?? 0),
        catalogOfferId: o.id,
      },
    ]);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!clientId) {
      setError("Sélectionnez un client.");
      return;
    }
    const payload = lines
      .filter((l) => l.label.trim())
      .map(({ label, qty, unitPrice, catalogOfferId, isTravel }) => ({
        label,
        qty,
        unitPrice,
        catalogOfferId,
        isTravel,
      }));

    if (payload.length === 0) {
      setError("Ajoutez au moins une ligne de devis.");
      return;
    }

    if (currency === "EUR") {
      const missingEur = payload.find(
        (l) => l.catalogOfferId && !(l.unitPrice > 0),
      );
      if (missingEur) {
        setError(
          `Saisissez le prix en EUR pour « ${missingEur.label} » (catalogue = FCFA).`,
        );
        return;
      }
    }

    const floorCheck = assertLinesAboveFloor({
      lines: payload,
      offers,
      currency,
    });
    if (!floorCheck.ok) {
      setError(floorCheck.error);
      return;
    }

    const fd = new FormData(e.currentTarget);
    fd.set("clientId", clientId);
    fd.set("lines", JSON.stringify(payload));
    fd.set("vatEnabled", vatEnabled ? "on" : "off");
    fd.set("regime", regime);
    fd.set("currency", currency);
    fd.set("vatRate", String(vatRate));
    fd.set("object", objectDraft);
    if (promoEnabled) {
      fd.set("promoEnabled", "on");
      fd.set("promoPercent", String(promoPercent));
    }
    if (includeTravel) fd.set("includeTravel", "on");
    if (defaultOpportunityId) fd.set("opportunityId", defaultOpportunityId);
    if (embedded) fd.set("stayOnPage", "1");

    void run(async () => {
      const res = await createQuoteAction(fd);
      if (res && !res.ok) {
        setError(res.error ?? "Échec de la création");
        return;
      }
      if (embedded && res?.quoteId) {
        try {
          await onSuccess?.(res.quoteId);
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Devis créé, mais étape suivante échouée",
          );
        }
      }
      // page mode : redirect() dans l’action
    });
  }

  const body = (
    <form
      id="quote-create-form"
      onSubmit={onSubmit}
      className="space-y-8"
      noValidate
      aria-busy={pending || undefined}
    >
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-msk-ink">Client & cadre</h2>
          <p className="mt-1 text-sm text-msk-ink/50">
            Destinataire, régime fiscal et objet de la proposition.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="clientId" required>
              Client
            </FieldLabel>
            <select
              id="clientId"
              name="clientId"
              required
              value={clientId}
              disabled={pending || clientLocked}
              onChange={(e) => {
                setClientId(e.target.value);
                const c = clients.find((x) => x.id === e.target.value);
                if (c) setIncludeTravel(c.includeTravelDefault);
              }}
              className="flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3.5 text-sm text-msk-ink shadow-sm focus:border-msk-blue focus:outline-none focus:ring-2 focus:ring-msk-blue/20 disabled:opacity-50"
            >
              <option value="">— Choisir un client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {clientLocked ? (
              <FieldHint>Client lié automatiquement au prospect.</FieldHint>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor="regime" required>
              Régime
            </FieldLabel>
            <select
              id="regime"
              value={regime}
              disabled={pending}
              onChange={(e) => {
                const next = e.target.value as "ML" | "FR";
                setRegime(next);
                if (next === "FR") {
                  // Ne pas coller des montants XOF catalogue en EUR.
                  setLines((prev) =>
                    prev.map((l) =>
                      l.catalogOfferId ? { ...l, unitPrice: 0 } : l,
                    ),
                  );
                }
              }}
              className="flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3.5 text-sm shadow-sm focus:border-msk-blue focus:outline-none focus:ring-2 focus:ring-msk-blue/20"
            >
              <option value="ML">Mali (XOF, TVA 18 %)</option>
              <option value="FR">France (EUR, TVA 20 %)</option>
            </select>
            {regime === "FR" ? (
              <FieldHint>
                Prix catalogue en FCFA — saisissez les montants en EUR manuellement.
              </FieldHint>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor="validUntil">Validité</FieldLabel>
            <Input
              id="validUntil"
              name="validUntil"
              type="date"
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="object">Objet</FieldLabel>
            <Input
              id="object"
              name="object"
              disabled={pending}
              value={objectDraft}
              onChange={(e) => setObjectDraft(e.target.value)}
              placeholder="Ex. Proposition site vitrine + réseaux sociaux"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="missionNote">Note mission</FieldLabel>
            <Textarea
              id="missionNote"
              name="missionNote"
              rows={2}
              disabled={pending}
              placeholder="Contexte, livrables, délais évoqués…"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-msk-ink">Options</h2>
          <p className="mt-1 text-sm text-msk-ink/50">
            TVA, promotion et frais de déplacement.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 rounded-xl border border-msk-ink/[0.08] bg-msk-chalk/30 px-4 py-3.5 text-sm">
          <label className="flex items-center gap-2 font-medium text-msk-ink">
            <input
              type="checkbox"
              checked={vatEnabled}
              onChange={(e) => setVatEnabled(e.target.checked)}
              disabled={pending}
              className="rounded border-msk-ink/20"
            />
            TVA {vatRate} %
          </label>
          <label className="flex items-center gap-2 font-medium text-msk-ink">
            <input
              type="checkbox"
              checked={promoEnabled}
              onChange={(e) => setPromoEnabled(e.target.checked)}
              disabled={pending}
              className="rounded border-msk-ink/20"
            />
            Promo
            {promoEnabled ? (
              <Input
                type="number"
                min={1}
                max={100}
                value={promoPercent}
                onChange={(e) => setPromoPercent(Number(e.target.value) || 0)}
                className="h-8 w-16"
                disabled={pending}
              />
            ) : null}
            %
          </label>
          <label className="flex items-center gap-2 font-medium text-msk-ink">
            <input
              type="checkbox"
              checked={includeTravel}
              onChange={(e) => setIncludeTravel(e.target.checked)}
              disabled={pending}
              className="rounded border-msk-ink/20"
            />
            Inclure déplacement
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-msk-ink">Lignes</h2>
            <p className="mt-1 text-sm text-msk-ink/50">
              Catalogue MSK ou lignes libres — plancher respecté.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
              defaultValue=""
              disabled={pending}
              onChange={(e) => {
                if (e.target.value) {
                  addLineFromOffer(e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="">+ Offre catalogue</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.sku} · {o.name}
                  {o.floorPriceXof != null
                    ? ` (min ${o.floorPriceXof.toLocaleString("fr-FR")})`
                    : ""}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                setLines((p) => [
                  ...p,
                  { key: `${Date.now()}`, label: "", qty: 1, unitPrice: 0 },
                ])
              }
            >
              Ligne libre
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                setLines((p) => [
                  ...p,
                  {
                    key: `${Date.now()}`,
                    label: "Frais de déplacement",
                    qty: 1,
                    unitPrice: 15000,
                    isTravel: true,
                  },
                ])
              }
            >
              + Déplacement
            </Button>
          </div>
        </div>

        <div className="space-y-2.5">
          {lines.map((line, idx) => {
            const floor = floorFor(line.catalogOfferId);
            const underFloor =
              currency === "XOF" && floor != null && line.unitPrice < floor;
            return (
              <div
                key={line.key}
                className="grid gap-2 rounded-xl border border-msk-ink/[0.08] bg-white p-3 sm:grid-cols-[1fr_80px_140px_auto]"
              >
                <Input
                  placeholder="Libellé de la ligne"
                  value={line.label}
                  disabled={pending}
                  onChange={(e) =>
                    setLines((p) =>
                      p.map((l, i) =>
                        i === idx ? { ...l, label: e.target.value } : l,
                      ),
                    )
                  }
                />
                <Input
                  type="number"
                  min={1}
                  value={line.qty}
                  disabled={pending}
                  aria-label="Quantité"
                  onChange={(e) =>
                    setLines((p) =>
                      p.map((l, i) =>
                        i === idx
                          ? { ...l, qty: Number(e.target.value) || 1 }
                          : l,
                      ),
                    )
                  }
                />
                <div>
                  <Input
                    type="number"
                    min={floor != null && currency === "XOF" ? floor : 0}
                    value={line.unitPrice}
                    disabled={pending}
                    aria-label="Prix unitaire"
                    aria-invalid={underFloor || undefined}
                    className={underFloor ? "border-msk-coral" : undefined}
                    onChange={(e) =>
                      setLines((p) =>
                        p.map((l, i) =>
                          i === idx
                            ? { ...l, unitPrice: Number(e.target.value) || 0 }
                            : l,
                        ),
                      )
                    }
                  />
                  {floor != null && currency === "XOF" ? (
                    <p
                      className={
                        underFloor
                          ? "mt-0.5 text-[11px] text-msk-coral"
                          : "mt-0.5 text-[11px] text-msk-ink/40"
                      }
                    >
                      Min. {formatXof(floor)}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending || lines.length <= 1}
                  onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
                >
                  Retirer
                </Button>
                {line.isTravel ? (
                  <span className="text-xs text-msk-ink/45 sm:col-span-4">
                    Ligne déplacement
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-2xl border border-msk-ink/[0.08] bg-msk-chalk/40 px-4 py-4 text-sm">
        <div className="flex justify-between text-msk-ink/60">
          <span>HT</span>
          <span className="tabular-nums">
            {formatComMoney(totals.totalHt, currency)}
          </span>
        </div>
        <div className="mt-1 flex justify-between text-msk-ink/60">
          <span>TVA</span>
          <span className="tabular-nums">
            {formatComMoney(totals.totalVat, currency)}
          </span>
        </div>
        <div className="mt-2 flex justify-between border-t border-msk-ink/10 pt-2 text-base font-semibold text-msk-ink">
          <span>TTC</span>
          <span className="tabular-nums">
            {formatComMoney(totals.totalTtc, currency)}
          </span>
        </div>
      </div>

      <FieldError>{error}</FieldError>
    </form>
  );

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {embedded && onCancel ? (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={onCancel}
        >
          Annuler
        </Button>
      ) : (
        <Link
          prefetch={false}
          href="/commercial/devis"
          className={cn(
            "inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-msk-ink transition hover:bg-msk-ink/5",
            pending && "pointer-events-none opacity-50",
          )}
        >
          Annuler
        </Link>
      )}
      <Button type="submit" form="quote-create-form" disabled={pending}>
        {pending ? "Création…" : "Créer le devis"}
      </Button>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {body}
        {footer}
      </div>
    );
  }

  return <FormShell footer={footer}>{body}</FormShell>;
}
