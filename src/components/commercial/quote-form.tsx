"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createQuoteAction } from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import { computeDocTotals } from "@/lib/commercial/totals";
import { formatComMoney } from "@/lib/commercial/labels";
import { assertLinesAboveFloor } from "@/lib/commercial/floor-price";
import { formatXof } from "@/lib/crm/labels";

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
}: {
  clients: { id: string; name: string; includeTravelDefault: boolean }[];
  offers: Offer[];
  defaultClientId?: string;
  defaultOpportunityId?: string;
  defaultIncludeTravel?: boolean;
  initialLines?: QuotePrefillLine[];
  defaultObject?: string;
}) {
  const router = useRouter();
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
    setLines((prev) => [
      ...prev,
      {
        key: `${Date.now()}`,
        label: `${o.sku} · ${o.name}`,
        qty: 1,
        unitPrice: o.priceXof ?? 0,
        catalogOfferId: o.id,
      },
    ]);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const payload = lines
      .filter((l) => l.label.trim())
      .map(({ label, qty, unitPrice, catalogOfferId, isTravel }) => ({
        label,
        qty,
        unitPrice,
        catalogOfferId,
        isTravel,
      }));

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
    fd.set("lines", JSON.stringify(payload));
    fd.set("vatEnabled", vatEnabled ? "on" : "off");
    fd.set("regime", regime);
    fd.set("currency", currency);
    fd.set("vatRate", String(vatRate));
    if (promoEnabled) {
      fd.set("promoEnabled", "on");
      fd.set("promoPercent", String(promoPercent));
    }
    if (includeTravel) fd.set("includeTravel", "on");
    if (defaultOpportunityId) fd.set("opportunityId", defaultOpportunityId);

    void run(async () => {
      const res = await createQuoteAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      if (res.quoteId) router.push(`/commercial/devis/${res.quoteId}`);
      else router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      aria-busy={pending || undefined}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="clientId">Client *</Label>
          <select
            id="clientId"
            name="clientId"
            required
            value={clientId}
            disabled={pending}
            onChange={(e) => {
              setClientId(e.target.value);
              const c = clients.find((x) => x.id === e.target.value);
              if (c) setIncludeTravel(c.includeTravelDefault);
            }}
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            <option value="">— choisir —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="regime">Régime</Label>
          <select
            id="regime"
            value={regime}
            disabled={pending}
            onChange={(e) => setRegime(e.target.value as "ML" | "FR")}
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            <option value="ML">Mali (XOF, TVA 18 %)</option>
            <option value="FR">France (EUR, TVA 20 %)</option>
          </select>
        </div>
        <div>
          <Label htmlFor="validUntil">Validité</Label>
          <Input
            id="validUntil"
            name="validUntil"
            type="date"
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="object">Objet</Label>
          <Input
            id="object"
            name="object"
            disabled={pending}
            defaultValue={defaultObject}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="missionNote">Note mission</Label>
          <textarea
            id="missionNote"
            name="missionNote"
            rows={2}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={vatEnabled}
            onChange={(e) => setVatEnabled(e.target.checked)}
            disabled={pending}
          />
          TVA {vatRate} %
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={promoEnabled}
            onChange={(e) => setPromoEnabled(e.target.checked)}
            disabled={pending}
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
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeTravel}
            onChange={(e) => setIncludeTravel(e.target.checked)}
            disabled={pending}
          />
          Inclure déplacement
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label>Lignes</Label>
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

        {lines.map((line, idx) => {
          const floor = floorFor(line.catalogOfferId);
          const underFloor =
            currency === "XOF" &&
            floor != null &&
            line.unitPrice < floor;
          return (
            <div
              key={line.key}
              className="grid gap-2 rounded-lg border border-msk-ink/10 bg-white p-3 sm:grid-cols-[1fr_80px_120px_auto]"
            >
              <Input
                placeholder="Libellé"
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

      <div className="rounded-lg bg-msk-chalk px-4 py-3 text-sm text-msk-ink/70">
        <div className="flex justify-between">
          <span>HT</span>
          <span>{formatComMoney(totals.totalHt, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>TVA</span>
          <span>{formatComMoney(totals.totalVat, currency)}</span>
        </div>
        <div className="mt-1 flex justify-between font-semibold text-msk-ink">
          <span>TTC</span>
          <span>{formatComMoney(totals.totalTtc, currency)}</span>
        </div>
      </div>

      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer le devis"}
      </Button>
    </form>
  );
}
