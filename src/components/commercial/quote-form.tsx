"use client";

import { failAction } from "@/lib/toast/report";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pencil } from "lucide-react";
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
import { FormSteps } from "@/components/ui/form-steps";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import { computeDocTotals } from "@/lib/commercial/totals";
import { formatComMoney } from "@/lib/commercial/labels";
import { assertLinesAboveFloor } from "@/lib/commercial/floor-price";
import {
  buildTravelLineFromOffers,
  isCatalogTravelOffer,
} from "@/lib/commercial/travel-offer";
import { formatXof } from "@/lib/crm/labels";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "client", label: "Client", hint: "Destinataire" },
  { id: "cadre", label: "Cadre", hint: "Fiscal & objet" },
  { id: "composition", label: "Composition", hint: "Lignes" },
  { id: "recap", label: "Récap", hint: "Engagement" },
] as const;

type Offer = {
  id: string;
  name: string;
  sku: string;
  priceXof: number | null;
  floorPriceXof: number | null;
  billing?: string | null;
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

function makeTravelLine(offers: Offer[], currency: "XOF" | "EUR"): Line {
  const travel = buildTravelLineFromOffers(offers);
  return {
    key: `travel-${Date.now()}`,
    label: travel.label,
    qty: travel.qty,
    unitPrice: currency === "EUR" ? 0 : travel.unitPrice,
    catalogOfferId: travel.catalogOfferId ?? undefined,
    isTravel: true,
  };
}

/**
 * Création devis — stepper aligné wizard client / RDV.
 * Déplacement = ligne catalogue (pas de checkbox). Pas de mode modal embarqué.
 */
export function QuoteCreateForm({
  clients,
  offers,
  defaultClientId,
  defaultOpportunityId,
  defaultIncludeTravel,
  initialLines,
  defaultObject,
  fromProspect = false,
}: {
  clients: { id: string; name: string; includeTravelDefault: boolean }[];
  offers: Offer[];
  defaultClientId?: string;
  defaultOpportunityId?: string;
  defaultIncludeTravel?: boolean;
  initialLines?: QuotePrefillLine[];
  defaultObject?: string;
  /** Client figé (parcours depuis prospect). */
  fromProspect?: boolean;
}) {
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(() => (defaultClientId ? 1 : 0));
  const [returnToRecap, setReturnToRecap] = useState(false);
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [regime, setRegime] = useState<"ML" | "FR">("ML");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoPercent, setPromoPercent] = useState(10);
  const [validUntil, setValidUntil] = useState("");
  const [objectDraft, setObjectDraft] = useState(defaultObject ?? "");
  const [missionNote, setMissionNote] = useState("");
  const [lines, setLines] = useState<Line[]>(() => {
    if (initialLines?.length) {
      return initialLines.map((l, i) => {
        const offer = l.catalogOfferId
          ? offers.find((o) => o.id === l.catalogOfferId)
          : undefined;
        return {
          key: `prefill-${i}`,
          label: l.label,
          qty: l.qty,
          unitPrice: l.unitPrice,
          catalogOfferId: l.catalogOfferId,
          isTravel: offer ? isCatalogTravelOffer(offer) : false,
        };
      });
    }
    return [{ key: "1", label: "", qty: 1, unitPrice: 0 }];
  });

  const travelAutoApplied = useRef(false);
  const lastIndex = STEPS.length - 1;
  const vatRate = regime === "FR" ? 20 : 18;
  const currency = regime === "FR" ? "EUR" : "XOF";
  const clientLocked = Boolean(fromProspect && defaultClientId);
  const selectedClient = clients.find((c) => c.id === clientId);

  const totals = useMemo(
    () =>
      computeDocTotals({
        lines,
        vatEnabled,
        vatRate,
        promoEnabled,
        promoPercent,
        // Lignes présentes = intentionnelles (déplacement = ligne, pas filtre).
        includeTravel: true,
      }),
    [lines, vatEnabled, vatRate, promoEnabled, promoPercent],
  );

  function ensureTravelLine(list: Line[]): Line[] {
    if (list.some((l) => l.isTravel)) return list;
    return [...list, makeTravelLine(offers, currency)];
  }

  /** Auto-ajout déplacement une fois si défaut client / prop. */
  useEffect(() => {
    if (travelAutoApplied.current) return;
    const want =
      defaultIncludeTravel ||
      Boolean(selectedClient?.includeTravelDefault);
    if (!want) return;
    travelAutoApplied.current = true;
    setLines((prev) => ensureTravelLine(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount / client default
  }, [clientId, defaultIncludeTravel, selectedClient?.includeTravelDefault]);

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
        unitPrice: currency === "EUR" ? 0 : (o.priceXof ?? 0),
        catalogOfferId: o.id,
        isTravel: isCatalogTravelOffer(o),
      },
    ]);
  }

  function addTravelLine() {
    setLines((prev) => {
      if (prev.some((l) => l.isTravel)) return prev;
      return [...prev, makeTravelLine(offers, currency)];
    });
  }

  function selectClient(id: string | null) {
    if (!id || clientLocked) return;
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c?.includeTravelDefault) {
      travelAutoApplied.current = true;
      setLines((prev) => ensureTravelLine(prev));
    }
  }

  function payloadLines() {
    return lines
      .filter((l) => l.label.trim())
      .map(({ label, qty, unitPrice, catalogOfferId, isTravel }) => ({
        label,
        qty,
        unitPrice,
        catalogOfferId,
        isTravel: Boolean(isTravel),
      }));
  }

  function validateComposition(): string | null {
    const payload = payloadLines();
    if (payload.length === 0) return "Ajoutez au moins une ligne de devis.";
    if (currency === "EUR") {
      const missingEur = payload.find(
        (l) => l.catalogOfferId && !(l.unitPrice > 0),
      );
      if (missingEur) {
        return `Saisissez le prix en EUR pour « ${missingEur.label} » (catalogue = FCFA).`;
      }
    }
    const floorCheck = assertLinesAboveFloor({
      lines: payload,
      offers,
      currency,
    });
    if (!floorCheck.ok) return floorCheck.error;
    return null;
  }

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!clientId) return "Sélectionnez un client.";
    }
    if (index === 2) {
      return validateComposition();
    }
    return null;
  }

  function goTo(index: number) {
    if (index < step) {
      setError(null);
      setReturnToRecap(false);
      setStep(index);
      return;
    }
    for (let i = step; i < index; i++) {
      const err = validateStep(i);
      if (err) {
        setError(err);
        return;
      }
    }
    setError(null);
    setReturnToRecap(false);
    setStep(index);
  }

  function editSection(stepIndex: number) {
    setError(null);
    setReturnToRecap(true);
    setStep(stepIndex);
  }

  function leaveEditOrStep(direction: "back" | "next") {
    if (returnToRecap) {
      const err = direction === "next" ? validateStep(step) : null;
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      setReturnToRecap(false);
      setStep(lastIndex);
      return;
    }
    if (direction === "back") {
      setError(null);
      if (step === 0) return;
      setStep(step - 1);
      return;
    }
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step < lastIndex) setStep(step + 1);
  }

  function submit() {
    for (let i = 0; i < lastIndex; i++) {
      const err = validateStep(i);
      if (err) {
        setError(err);
        setReturnToRecap(false);
        setStep(i);
        return;
      }
    }
    setError(null);

    const payload = payloadLines();
    const hasTravel = payload.some((l) => l.isTravel);

    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("lines", JSON.stringify(payload));
    fd.set("vatEnabled", vatEnabled ? "on" : "off");
    fd.set("regime", regime);
    fd.set("currency", currency);
    fd.set("vatRate", String(vatRate));
    fd.set("object", objectDraft);
    fd.set("missionNote", missionNote);
    if (validUntil) fd.set("validUntil", validUntil);
    if (promoEnabled) {
      fd.set("promoEnabled", "on");
      fd.set("promoPercent", String(promoPercent));
    }
    if (hasTravel) fd.set("includeTravel", "on");
    if (defaultOpportunityId) fd.set("opportunityId", defaultOpportunityId);

    void run(async () => {
      const res = await createQuoteAction(fd);
      if (failAction(res, setError, "Échec de la création")) return;
      // Succès : redirect() dans l’action
    });
  }

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.includeTravelDefault
      ? "Déplacement par défaut"
      : undefined,
  }));

  const offerPickerOptions = offers.map((o) => ({
    value: o.id,
    label: `${o.sku} · ${o.name}`,
    description:
      o.floorPriceXof != null
        ? `Min. ${o.floorPriceXof.toLocaleString("fr-FR")} XOF`
        : o.priceXof != null
          ? formatComMoney(o.priceXof, "XOF")
          : undefined,
  }));

  const regimeLabel =
    regime === "FR" ? "France (EUR, TVA 20 %)" : "Mali (XOF, TVA 18 %)";

  return (
    <FormShell
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          {step === 0 && !returnToRecap ? (
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
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => leaveEditOrStep("back")}
            >
              {returnToRecap ? "Retour au récap" : "Retour"}
            </Button>
          )}
          {step < lastIndex ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => leaveEditOrStep("next")}
            >
              {returnToRecap ? "Enregistrer et revenir au récap" : "Continuer"}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={submit}
            >
              {pending ? "Création…" : "Créer le devis"}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6" aria-busy={pending || undefined}>
        {fromProspect ? (
          <p className="rounded-lg bg-msk-blue/6 px-3 py-2 text-xs font-medium text-msk-blue">
            Depuis un prospect — client lié sans conversion CRM. Le devis n’est
            possible qu’au statut Intéressé.
            {returnToRecap ? (
              <span className="ml-1 font-normal text-msk-ink/55">
                Modification depuis le récap.
              </span>
            ) : null}
          </p>
        ) : null}

        <FormSteps
          steps={STEPS}
          currentIndex={step}
          onGoTo={(i) => {
            if (returnToRecap && i === lastIndex) {
              setReturnToRecap(false);
              setStep(lastIndex);
              return;
            }
            goTo(i);
          }}
        />

        {step === 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-msk-ink">Client</h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Destinataire de la proposition commerciale.
              </p>
            </div>
            {clientLocked ? (
              <>
                <div className="rounded-xl border border-msk-ink/8 bg-msk-chalk/40 px-4 py-3">
                  <p className="text-sm font-semibold text-msk-ink">
                    {selectedClient?.name ?? "Client prospect"}
                  </p>
                  <FieldHint>
                    Client lié automatiquement au prospect — source de vérité
                    CRM.
                  </FieldHint>
                </div>
              </>
            ) : (
              <OptionPickerSingle
                label="Client"
                required
                options={clientOptions}
                value={clientId || null}
                onChange={selectClient}
                disabled={pending}
                placeholder="Choisir un client…"
                modalTitle="Client commercial"
              />
            )}
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-msk-ink">
                Cadre fiscal &amp; objet
              </h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Régime, TVA, promotion, validité et libellé de mission.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    Prix catalogue en FCFA — saisissez les montants en EUR
                    manuellement.
                  </FieldHint>
                ) : null}
              </div>
              <div>
                <FieldLabel htmlFor="validUntil">Validité</FieldLabel>
                <Input
                  id="validUntil"
                  type="date"
                  disabled={pending}
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <FieldLabel htmlFor="object">Objet</FieldLabel>
                <Input
                  id="object"
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
                  rows={2}
                  disabled={pending}
                  value={missionNote}
                  onChange={(e) => setMissionNote(e.target.value)}
                  placeholder="Contexte, livrables, délais évoqués…"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 rounded-xl border border-msk-ink/8 bg-msk-chalk/30 px-4 py-3.5 text-sm">
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
                    onChange={(e) =>
                      setPromoPercent(Number(e.target.value) || 0)
                    }
                    className="h-8 w-16"
                    disabled={pending}
                  />
                ) : null}
                %
              </label>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-msk-ink">
                Composition
              </h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Offres catalogue ou lignes libres. Le déplacement est une ligne
                tarifée — pas une case à cocher.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {offers.length > 0 ? (
                <div className="min-w-52 flex-1">
                  <OptionPickerSingle
                    label="Offre catalogue"
                    options={offerPickerOptions}
                    value={null}
                    onChange={(v) => {
                      if (v) addLineFromOffer(v);
                    }}
                    disabled={pending}
                    placeholder="+ Offre catalogue"
                    modalTitle="Offre catalogue"
                  />
                </div>
              ) : null}
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
                disabled={pending || lines.some((l) => l.isTravel)}
                onClick={addTravelLine}
              >
                + Déplacement
              </Button>
            </div>

            <div className="space-y-2.5">
              {lines.map((line, idx) => {
                const floor = floorFor(line.catalogOfferId);
                const underFloor =
                  currency === "XOF" &&
                  floor != null &&
                  line.unitPrice < floor;
                return (
                  <div
                    key={line.key}
                    className="grid gap-2 rounded-xl border border-msk-ink/8 bg-white p-3 sm:grid-cols-[1fr_80px_140px_auto]"
                  >
                    <div>
                      <Input
                        placeholder="Libellé de la ligne"
                        value={line.label}
                        disabled={pending}
                        onChange={(e) =>
                          setLines((p) =>
                            p.map((l, i) =>
                              i === idx
                                ? { ...l, label: e.target.value }
                                : l,
                            ),
                          )
                        }
                      />
                      {line.isTravel ? (
                        <span className="mt-1 inline-flex rounded-md bg-msk-blue/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-msk-blue">
                          Déplacement
                        </span>
                      ) : null}
                    </div>
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
                                ? {
                                    ...l,
                                    unitPrice: Number(e.target.value) || 0,
                                  }
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
                      onClick={() =>
                        setLines((p) => p.filter((_, i) => i !== idx))
                      }
                    >
                      Retirer
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-msk-ink/8 bg-msk-chalk/40 px-4 py-4 text-sm">
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
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-msk-ink">Récapitulatif</h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Vérifiez avant création — crayons pour ajuster une section.
              </p>
            </div>

            <RecapBlock
              title="Client"
              onEdit={() => editSection(0)}
              disabled={pending}
            >
              <p className="font-medium text-msk-ink">
                {selectedClient?.name ?? "—"}
              </p>
            </RecapBlock>

            <RecapBlock
              title="Cadre"
              onEdit={() => editSection(1)}
              disabled={pending}
            >
              <ul className="space-y-1 text-sm text-msk-ink/75">
                <li>{regimeLabel}</li>
                <li>
                  TVA {vatEnabled ? `${vatRate} %` : "désactivée"}
                  {promoEnabled ? ` · Promo ${promoPercent} %` : ""}
                </li>
                {validUntil ? <li>Validité : {validUntil}</li> : null}
                {objectDraft.trim() ? (
                  <li>Objet : {objectDraft.trim()}</li>
                ) : null}
              </ul>
            </RecapBlock>

            <RecapBlock
              title="Composition"
              onEdit={() => editSection(2)}
              disabled={pending}
            >
              <ul className="divide-y divide-msk-ink/6 text-sm">
                {payloadLines().map((l, i) => (
                  <li
                    key={`${l.label}-${i}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-2"
                  >
                    <span className="text-msk-ink">
                      {l.label}
                      {l.isTravel ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-msk-blue">
                          Déplacement
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums text-msk-ink/70">
                      {l.qty} × {formatComMoney(l.unitPrice, currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-msk-ink/10 pt-3 text-base font-semibold text-msk-ink">
                <span>Total TTC</span>
                <span className="tabular-nums">
                  {formatComMoney(totals.totalTtc, currency)}
                </span>
              </div>
            </RecapBlock>
          </section>
        ) : null}

        <FieldError>{error}</FieldError>
      </div>
    </FormShell>
  );
}

function RecapBlock({
  title,
  onEdit,
  disabled,
  children,
}: {
  title: string;
  onEdit: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-msk-ink">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onEdit}
          aria-label={`Modifier ${title}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Modifier
        </Button>
      </div>
      {children}
    </div>
  );
}
