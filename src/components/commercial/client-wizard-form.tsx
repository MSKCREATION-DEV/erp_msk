"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CrmSource } from "@/generated/prisma/client";
import {
  createClientWizardAction,
  findClientWizardDuplicatesAction,
} from "@/actions/client-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldHint, FieldLabel } from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import { FormSteps } from "@/components/ui/form-steps";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { usePendingAction } from "@/hooks/use-pending-action";
import { useDuplicateLiveSearch } from "@/hooks/use-duplicate-live-search";
import { OrgDuplicateMatchCard } from "@/components/crm/duplicate-match-card";
import { DuplicateSearchStatus } from "@/components/crm/duplicate-search-status";
import {
  CONTRACT_FAMILY_LABELS,
  SERVICE_KIND_DEFAULT_FAMILY,
  SERVICE_KIND_LABELS,
  formatComMoney,
} from "@/lib/commercial/labels";
import { SOURCE_LABELS } from "@/lib/crm/labels";
import {
  hasBlockingOrgMatch,
  orgLiveSearchReady,
  type OrgDuplicateCandidate,
} from "@/lib/crm/duplicates";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "identity", label: "Identité", hint: "Entreprise" },
  { id: "contact", label: "Contact", hint: "Qui parle" },
  { id: "origin", label: "Origine", hint: "Trail commercial" },
  { id: "composition", label: "Composition", hint: "Offre / lignes" },
  { id: "conditions", label: "Conditions", hint: "Cadre contrat" },
  { id: "recap", label: "Récap", hint: "Engagement + docs" },
] as const;

const SOURCE_OPTIONS = Object.entries(SOURCE_LABELS) as [CrmSource, string][];
const FAMILY_OPTIONS = Object.entries(CONTRACT_FAMILY_LABELS).map(
  ([value, label]) => ({ value: value as keyof typeof CONTRACT_FAMILY_LABELS, label }),
);
const SERVICE_KIND_OPTIONS = Object.entries(SERVICE_KIND_LABELS).map(
  ([value, label]) => ({ value: value as keyof typeof SERVICE_KIND_LABELS, label }),
);

export type OfferOpt = {
  id: string;
  name: string;
  sku: string;
  priceXof: number | null;
};

export type AcceptedQuoteOpt = {
  id: string;
  label: string;
  lines: Array<{
    label: string;
    qty: number;
    unitPrice: number;
    catalogOfferId?: string | null;
    isTravel?: boolean;
  }>;
};

type Line = {
  key: string;
  label: string;
  qty: number;
  unitPrice: number;
  catalogOfferId?: string | null;
  isTravel?: boolean;
};

/**
 * Parcours unifié Client ↔ Contrat (plan `docs/commercial/PLAN-CLIENT-CONTRAT.md`
 * §4 — stepper verrouillé). Une seule UI pour les deux portes : création
 * directe (`/commercial/clients/nouveau`) et transformation prospect
 * (`?opportunityId=`). Le contexte prospect préremplit identité/contact —
 * jamais de skip : tout reste visible et éditable.
 */
export function ClientWizardForm({
  opportunityId,
  orgName,
  initial,
  acceptedQuotes = [],
  offers = [],
  cancelHref,
}: {
  opportunityId?: string;
  orgName?: string;
  initial?: {
    name?: string;
    sector?: string;
    city?: string;
    country?: string;
    website?: string;
    contactName?: string;
    contactRole?: string;
    email?: string;
    phone?: string;
  };
  acceptedQuotes?: AcceptedQuoteOpt[];
  offers?: OfferOpt[];
  cancelHref: string;
}) {
  const { pending, run } = usePendingAction();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duplicateHref, setDuplicateHref] = useState<string | null>(null);
  const lastIndex = STEPS.length - 1;

  // ---- Identité ----
  const [name, setName] = useState(initial?.name ?? "");
  const [sector, setSector] = useState(initial?.sector ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [country, setCountry] = useState(initial?.country ?? "ML");
  const [website, setWebsite] = useState(initial?.website ?? "");

  /**
   * Anti-doublon live (identité) — création directe uniquement : avec
   * `opportunityId`, le nom vient déjà du prospect transformé (match
   * attendu sur lui-même, pas un doublon à signaler).
   */
  const [orgDupes, setOrgDupes] = useState<OrgDuplicateCandidate[]>([]);
  const orgLiveEnabled = !opportunityId && orgLiveSearchReady(name);
  const orgQueryKey = orgLiveEnabled ? name.trim() : "";
  const orgSearchFn = useCallback(async () => {
    const checkFd = new FormData();
    checkFd.set("name", name.trim());
    const res = await findClientWizardDuplicatesAction(checkFd);
    if (!res.ok) return { ok: false as const, error: res.error };
    return { ok: true as const, data: res.candidates };
  }, [name]);
  const orgLive = useDuplicateLiveSearch<OrgDuplicateCandidate[]>({
    queryKey: orgQueryKey,
    enabled: orgLiveEnabled,
    search: orgSearchFn,
  });
  useEffect(() => {
    if (!orgLiveEnabled) {
      setOrgDupes([]);
      return;
    }
    if (orgLive.status === "ok" && orgLive.data) {
      setOrgDupes(orgLive.data);
      return;
    }
    setOrgDupes([]);
  }, [orgLive.status, orgLive.data, orgLiveEnabled]);
  const orgMatchBlock = orgLiveEnabled && hasBlockingOrgMatch(orgDupes);

  // ---- Contact ----
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [contactRole, setContactRole] = useState(initial?.contactRole ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");

  // ---- Origine ----
  const [source, setSource] = useState<CrmSource | "">("");
  const [originNotes, setOriginNotes] = useState("");

  // ---- Composition ----
  const [quoteId, setQuoteId] = useState<string>("");
  const [lines, setLines] = useState<Line[]>([
    { key: "1", label: "", qty: 1, unitPrice: 0 },
  ]);
  const [compositionNotes, setCompositionNotes] = useState("");

  // ---- Conditions ----
  const [family, setFamily] = useState<keyof typeof CONTRACT_FAMILY_LABELS>(
    "PRESTATION_ABONNEMENT",
  );
  const [serviceKind, setServiceKind] = useState<
    keyof typeof SERVICE_KIND_LABELS
  >("RESEAUX_SOCIAUX");
  const [startDate, setStartDate] = useState("");
  const [billingDay, setBillingDay] = useState(5);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [renewalTerms, setRenewalTerms] = useState("");
  const [terminationTerms, setTerminationTerms] = useState("");
  const [contractNotes, setContractNotes] = useState("");
  const [scopeContext, setScopeContext] = useState("");
  const [scopeObjectives, setScopeObjectives] = useState("");
  const [scopeDeliverables, setScopeDeliverables] = useState("");
  const [scopeOutOfScope, setScopeOutOfScope] = useState("");

  const isCdc = family === "ENGAGEMENT_CDC";

  const totalHt = useMemo(
    () =>
      lines.reduce(
        (sum, l) => sum + Math.max(0, Math.trunc(l.qty)) * Math.trunc(l.unitPrice),
        0,
      ),
    [lines],
  );

  function applyQuote(id: string) {
    setQuoteId(id);
    if (!id) return;
    const q = acceptedQuotes.find((x) => x.id === id);
    if (!q) return;
    setLines(
      q.lines.length
        ? q.lines.map((l, i) => ({
            key: `quote-${i}`,
            label: l.label,
            qty: l.qty,
            unitPrice: l.unitPrice,
            catalogOfferId: l.catalogOfferId,
            isTravel: l.isTravel,
          }))
        : [{ key: "1", label: "", qty: 1, unitPrice: 0 }],
    );
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: `${Date.now()}`, label: "", qty: 1, unitPrice: 0 },
    ]);
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

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!name.trim()) return "Indiquez la raison sociale";
      if (!country.trim()) return "Indiquez le pays";
      if (orgMatchBlock) {
        return "Une correspondance existe déjà — ouvrez la fiche existante plutôt que de continuer.";
      }
    }
    if (index === 1) {
      if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
        return "E-mail de contact invalide";
      }
    }
    if (index === 3) {
      const valid = lines.filter((l) => l.label.trim() && l.qty > 0);
      if (valid.length === 0) {
        return "Ajoutez au moins une ligne de composition (libellé + quantité)";
      }
    }
    if (index === 4) {
      if (billingDay < 1 || billingDay > 28) {
        return "Le jour de facturation doit être entre 1 et 28";
      }
    }
    return null;
  }

  function goTo(index: number) {
    setDuplicateHref(null);
    if (index < step) {
      setError(null);
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
    setStep(index);
  }

  function next() {
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
        setStep(i);
        return;
      }
    }
    setError(null);
    setDuplicateHref(null);

    const payloadLines = lines
      .filter((l) => l.label.trim() && l.qty > 0)
      .map((l) => ({
        label: l.label.trim(),
        qty: l.qty,
        unitPrice: l.unitPrice,
        catalogOfferId: l.catalogOfferId ?? null,
        isTravel: Boolean(l.isTravel),
      }));

    const fd = new FormData();
    if (opportunityId) fd.set("opportunityId", opportunityId);
    fd.set("name", name.trim());
    if (sector.trim()) fd.set("sector", sector.trim());
    if (city.trim()) fd.set("city", city.trim());
    fd.set("country", country.trim() || "ML");
    if (website.trim()) fd.set("website", website.trim());
    if (contactName.trim()) fd.set("contactName", contactName.trim());
    if (contactRole.trim()) fd.set("contactRole", contactRole.trim());
    if (email.trim()) fd.set("email", email.trim());
    if (phone.trim()) fd.set("phone", phone.trim());
    if (source) fd.set("source", source);
    if (originNotes.trim()) fd.set("originNotes", originNotes.trim());
    if (quoteId) fd.set("quoteId", quoteId);
    if (compositionNotes.trim()) fd.set("compositionNotes", compositionNotes.trim());
    fd.set("linesJson", JSON.stringify(payloadLines));
    fd.set("family", family);
    fd.set("serviceKind", serviceKind);
    if (startDate) fd.set("startDate", startDate);
    fd.set("billingDay", String(billingDay));
    if (paymentTerms.trim()) fd.set("paymentTerms", paymentTerms.trim());
    if (renewalTerms.trim()) fd.set("renewalTerms", renewalTerms.trim());
    if (terminationTerms.trim()) fd.set("terminationTerms", terminationTerms.trim());
    if (contractNotes.trim()) fd.set("contractNotes", contractNotes.trim());
    if (isCdc) {
      fd.set("scopeContext", scopeContext);
      fd.set("scopeObjectives", scopeObjectives);
      fd.set("scopeDeliverables", scopeDeliverables);
      fd.set("scopeOutOfScope", scopeOutOfScope);
    }

    void run(async () => {
      const res = await createClientWizardAction(fd);
      if (res && !res.ok) {
        setError(res.error ?? "Échec de la création");
        setDuplicateHref(
          res.duplicateHref ??
            (res.clientId ? `/commercial/clients/${res.clientId}` : null),
        );
      }
    });
  }

  return (
    <FormShell
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (step === 0) window.history.back();
              else {
                setError(null);
                setStep(step - 1);
              }
            }}
          >
            {step === 0 ? "Annuler" : "Retour"}
          </Button>
          {step < lastIndex ? (
            <Button type="button" disabled={pending} onClick={next}>
              Continuer
            </Button>
          ) : (
            <Button
              type="button"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={submit}
            >
              {pending ? "Création…" : "Créer le client et le contrat"}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6" aria-busy={pending || undefined}>
        {orgName ? (
          <p className="rounded-lg bg-msk-blue/6 px-3 py-2 text-xs font-medium text-msk-blue">
            Depuis le prospect « {orgName} » — historique CRM conservé.
          </p>
        ) : null}

        <FormSteps steps={STEPS} currentIndex={step} onGoTo={goTo} />

        {step === 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-msk-ink">
                Identité de l’entreprise
              </h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Qui est le client — anti-doublon automatique sur le nom.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <FieldLabel htmlFor="wz-name" required>
                  Raison sociale
                </FieldLabel>
                <Input
                  id="wz-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. Marinas SARL"
                  aria-invalid={orgMatchBlock || undefined}
                  className={orgMatchBlock ? "border-msk-coral/50" : undefined}
                />
                {!opportunityId ? (
                  <DuplicateSearchStatus
                    status={orgLiveEnabled ? orgLive.status : "idle"}
                    error={orgLive.error}
                    onRetry={orgLive.refresh}
                    idleHint="À partir de 3 caractères, on vérifie les clients et prospects CRM déjà enregistrés."
                    okEmptyHint={
                      orgDupes.length === 0
                        ? "Aucune correspondance — nom disponible."
                        : null
                    }
                  />
                ) : null}
              </div>
              <div>
                <FieldLabel htmlFor="wz-sector">Secteur</FieldLabel>
                <Input
                  id="wz-sector"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. Restauration"
                />
              </div>
              <div>
                <FieldLabel htmlFor="wz-city">Ville</FieldLabel>
                <Input
                  id="wz-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. Bamako"
                />
              </div>
              <div>
                <FieldLabel htmlFor="wz-country" required>
                  Pays
                </FieldLabel>
                <Input
                  id="wz-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={pending}
                  placeholder="ML"
                />
                <FieldHint>Code pays (défaut ML).</FieldHint>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <FieldLabel htmlFor="wz-website">Site web</FieldLabel>
                <Input
                  id="wz-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={pending}
                  placeholder="https://…"
                />
              </div>
            </div>

            {orgDupes.length > 0 ? (
              <div className="space-y-3" aria-live="polite">
                <h3 className="text-sm font-semibold text-msk-ink">
                  Correspondance détectée — création bloquée
                </h3>
                {orgDupes.map((c) => (
                  <OrgDuplicateMatchCard key={`${c.entity}-${c.id}`} candidate={c} />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-msk-ink">
                Contact principal
              </h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Qui parle côté client.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <FieldLabel htmlFor="wz-contact-name">Nom</FieldLabel>
                <Input
                  id="wz-contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. Hassan Diallo"
                />
              </div>
              <div>
                <FieldLabel htmlFor="wz-contact-role">Rôle</FieldLabel>
                <Input
                  id="wz-contact-role"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. Gérant"
                />
              </div>
              <div>
                <FieldLabel htmlFor="wz-email">E-mail</FieldLabel>
                <Input
                  id="wz-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. contact@entreprise.ml"
                />
              </div>
              <div>
                <FieldLabel htmlFor="wz-phone">Téléphone</FieldLabel>
                <Input
                  id="wz-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. 70 12 34 56"
                />
              </div>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-msk-ink">
                Origine &amp; suivi
              </h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                {opportunityId
                  ? "Trail commercial existant — complétez si besoin."
                  : "D’où vient ce client (pas d’opportunité CRM obligatoire)."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="wz-source">Source</FieldLabel>
                <select
                  id="wz-source"
                  value={source}
                  disabled={pending}
                  onChange={(e) => setSource(e.target.value as CrmSource | "")}
                  className="mt-1.5 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/15"
                >
                  <option value="">—</option>
                  {SOURCE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="wz-origin-notes">Notes</FieldLabel>
                <Textarea
                  id="wz-origin-notes"
                  rows={3}
                  value={originNotes}
                  onChange={(e) => setOriginNotes(e.target.value)}
                  disabled={pending}
                  placeholder="Contexte de prospection, interlocuteur, historique…"
                />
              </div>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-msk-ink">
                Composition commerciale
              </h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Offres / lignes qui alimentent le contrat — visibles et
                modifiables même si reprises d’un devis.
              </p>
            </div>

            {acceptedQuotes.length > 0 ? (
              <div>
                <FieldLabel htmlFor="wz-quote">
                  Reprendre un devis accepté (optionnel)
                </FieldLabel>
                <select
                  id="wz-quote"
                  value={quoteId}
                  disabled={pending}
                  onChange={(e) => applyQuote(e.target.value)}
                  className="mt-1.5 flex h-11 w-full max-w-md rounded-lg border border-msk-ink/15 bg-white px-3 text-sm outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/15"
                >
                  <option value="">Composition libre (saisie manuelle)</option>
                  {acceptedQuotes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {offers.length > 0 ? (
              <div>
                <FieldLabel htmlFor="wz-offer">Ajouter depuis le catalogue</FieldLabel>
                <select
                  id="wz-offer"
                  defaultValue=""
                  disabled={pending}
                  onChange={(e) => {
                    if (e.target.value) addLineFromOffer(e.target.value);
                    e.target.value = "";
                  }}
                  className="mt-1.5 flex h-11 w-full max-w-md rounded-lg border border-msk-ink/15 bg-white px-3 text-sm outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/15"
                >
                  <option value="">Choisir une offre…</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.sku} · {o.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-msk-ink/8">
              <table className="w-full min-w-150 text-left text-sm">
                <thead className="border-b border-msk-ink/10 bg-msk-chalk/50 text-msk-ink/45">
                  <tr>
                    <th className="px-3 py-2 font-medium">Libellé</th>
                    <th className="px-3 py-2 font-medium">Qté</th>
                    <th className="px-3 py-2 font-medium">P.U. (XOF)</th>
                    <th className="px-3 py-2 font-medium">Déplacement</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.key} className="border-b border-msk-ink/5">
                      <td className="px-3 py-2">
                        <Input
                          value={l.label}
                          disabled={pending}
                          onChange={(e) =>
                            updateLine(l.key, { label: e.target.value })
                          }
                          placeholder="Ex. Pack réseaux sociaux STANDARD"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={l.qty}
                          disabled={pending}
                          onChange={(e) =>
                            updateLine(l.key, {
                              qty: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-20"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={l.unitPrice}
                          disabled={pending}
                          onChange={(e) =>
                            updateLine(l.key, {
                              unitPrice: Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                            })
                          }
                          className="w-28"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(l.isTravel)}
                          disabled={pending}
                          onChange={(e) =>
                            updateLine(l.key, { isTravel: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-msk-ink/20 text-msk-blue focus:ring-msk-blue/30"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={pending || lines.length <= 1}
                          onClick={() => removeLine(l.key)}
                          className="text-xs text-msk-coral underline disabled:opacity-40"
                        >
                          Retirer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={pending}
                onClick={addLine}
                className="text-sm font-medium text-msk-blue hover:underline"
              >
                + Ajouter une ligne
              </button>
              <p className="text-sm font-medium text-msk-ink">
                Total HT estimé : {formatComMoney(totalHt, "XOF")}
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="wz-composition-notes">
                Notes de composition
              </FieldLabel>
              <Textarea
                id="wz-composition-notes"
                rows={2}
                value={compositionNotes}
                onChange={(e) => setCompositionNotes(e.target.value)}
                disabled={pending}
                placeholder="Précisions commerciales last-minute…"
              />
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-msk-ink">
                Conditions du contrat
              </h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Famille document et paramètres juridiques — consomme la
                composition (pas de double saisie des lignes).
              </p>
            </div>

            <div>
              <FieldLabel>Nature de la prestation</FieldLabel>
              <ChoiceCards
                name="serviceKindChoice"
                columns={3}
                value={serviceKind}
                disabled={pending}
                options={SERVICE_KIND_OPTIONS}
                onChange={(v) => {
                  setServiceKind(v);
                  setFamily(SERVICE_KIND_DEFAULT_FAMILY[v]);
                }}
              />
            </div>

            <div>
              <FieldLabel>Famille document</FieldLabel>
              <ChoiceCards
                name="familyChoice"
                columns={2}
                value={family}
                disabled={pending}
                options={FAMILY_OPTIONS}
                onChange={setFamily}
              />
              <FieldHint>
                Préremplie selon la prestation — ajustable (ex. bundle).
              </FieldHint>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <FieldLabel htmlFor="wz-start-date">Début</FieldLabel>
                <Input
                  id="wz-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div>
                <FieldLabel htmlFor="wz-billing-day" required>
                  Jour de facturation
                </FieldLabel>
                <Input
                  id="wz-billing-day"
                  type="number"
                  min={1}
                  max={28}
                  value={billingDay}
                  onChange={(e) =>
                    setBillingDay(
                      Math.min(28, Math.max(1, Number.parseInt(e.target.value, 10) || 5)),
                    )
                  }
                  disabled={pending}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <FieldLabel htmlFor="wz-payment-terms">Modalités de paiement</FieldLabel>
                <Textarea
                  id="wz-payment-terms"
                  rows={2}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. Virement / OM / Wave — 50% à la signature"
                />
              </div>
              <div>
                <FieldLabel htmlFor="wz-renewal-terms">Renouvellement</FieldLabel>
                <Textarea
                  id="wz-renewal-terms"
                  rows={2}
                  value={renewalTerms}
                  onChange={(e) => setRenewalTerms(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. Tacite reconduction annuelle"
                />
              </div>
              <div>
                <FieldLabel htmlFor="wz-termination-terms">Résiliation</FieldLabel>
                <Textarea
                  id="wz-termination-terms"
                  rows={2}
                  value={terminationTerms}
                  onChange={(e) => setTerminationTerms(e.target.value)}
                  disabled={pending}
                  placeholder="Ex. Préavis 30 jours"
                />
              </div>
            </div>

            {isCdc ? (
              <div className="space-y-4 rounded-xl border border-msk-ink/8 bg-msk-chalk/40 p-4">
                <p className="text-sm font-semibold text-msk-ink">
                  Cahier des charges — un point par ligne
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="wz-scope-context">Contexte / problème</FieldLabel>
                    <Textarea
                      id="wz-scope-context"
                      rows={3}
                      value={scopeContext}
                      onChange={(e) => setScopeContext(e.target.value)}
                      disabled={pending}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="wz-scope-objectives">Objectifs</FieldLabel>
                    <Textarea
                      id="wz-scope-objectives"
                      rows={3}
                      value={scopeObjectives}
                      onChange={(e) => setScopeObjectives(e.target.value)}
                      disabled={pending}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="wz-scope-deliverables">Livrables</FieldLabel>
                    <Textarea
                      id="wz-scope-deliverables"
                      rows={3}
                      value={scopeDeliverables}
                      onChange={(e) => setScopeDeliverables(e.target.value)}
                      disabled={pending}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="wz-scope-out">Hors périmètre</FieldLabel>
                    <Textarea
                      id="wz-scope-out"
                      rows={3}
                      value={scopeOutOfScope}
                      onChange={(e) => setScopeOutOfScope(e.target.value)}
                      disabled={pending}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <FieldLabel htmlFor="wz-contract-notes">Notes contrat</FieldLabel>
              <Textarea
                id="wz-contract-notes"
                rows={2}
                value={contractNotes}
                onChange={(e) => setContractNotes(e.target.value)}
                disabled={pending}
              />
            </div>
          </section>
        ) : null}

        {step === 5 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-msk-ink">
                Récapitulatif avant engagement
              </h2>
              <p className="mt-1 text-sm text-msk-ink/50">
                Un contrat <strong>brouillon</strong> sera créé — l’activation
                et la signature restent un acte séparé, depuis la fiche
                contrat.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Recap label="Client">
                {name.trim() || "—"}
                {city.trim() ? ` · ${city.trim()}` : ""}
              </Recap>
              <Recap label="Contact">
                {contactName.trim() || "—"}
                {contactRole.trim() ? ` (${contactRole.trim()})` : ""}
              </Recap>
              <Recap label="Origine">{source ? SOURCE_LABELS[source] : "—"}</Recap>
              <Recap label="Composition" full>
                {lines.filter((l) => l.label.trim()).length} ligne(s) — total
                HT estimé {formatComMoney(totalHt, "XOF")}
                {quoteId ? " (reprise devis accepté)" : ""}
              </Recap>
              <Recap label="Nature">{SERVICE_KIND_LABELS[serviceKind]}</Recap>
              <Recap label="Famille document">{CONTRACT_FAMILY_LABELS[family]}</Recap>
              <Recap label="Jour de facturation">Jour {billingDay}</Recap>
            </dl>
          </section>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-msk-coral/25 bg-msk-coral/5 px-4 py-3 text-sm font-medium text-msk-coral"
          >
            <p>{error}</p>
            {duplicateHref ? (
              <Link
                prefetch={false}
                href={duplicateHref}
                className="mt-1 inline-block underline"
              >
                Ouvrir la fiche existante
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Link
            prefetch={false}
            href={cancelHref}
            className={cn(
              "text-sm text-msk-ink/45 hover:text-msk-ink/70",
              pending && "pointer-events-none opacity-50",
            )}
          >
            Annuler et revenir
          </Link>
        </div>
      </div>
    </FormShell>
  );
}

function Recap({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-msk-chalk/60 px-4 py-3",
        full && "sm:col-span-2 lg:col-span-3",
      )}
    >
      <dt className="text-xs font-semibold tracking-caps uppercase text-msk-ink/40">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-msk-ink">{children}</dd>
    </div>
  );
}
