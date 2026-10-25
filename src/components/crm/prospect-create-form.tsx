"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CrmSource } from "@prisma/client";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  createProspectAction,
  findContactDuplicateCandidatesAction,
  findOrgDuplicateCandidatesAction,
} from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { ProspectOffersStep } from "@/components/crm/prospect-offers-step";
import { ContactChannelsEditor } from "@/components/crm/contact-channels-editor";
import {
  ContactDuplicateMatchCard,
  OrgDuplicateMatchCard,
} from "@/components/crm/duplicate-match-card";
import { DuplicateSearchStatus } from "@/components/crm/duplicate-search-status";
import {
  SocialNetworksEditor,
  type SocialSelection,
} from "@/components/crm/social-networks-editor";
import { usePendingAction } from "@/hooks/use-pending-action";
import { useDuplicateLiveSearch } from "@/hooks/use-duplicate-live-search";
import { SOURCE_LABELS } from "@/lib/crm/labels";
import {
  composeSectorValue,
  CRM_SECTOR_OTHER,
  SECTOR_PICKER_OPTIONS,
} from "@/lib/crm/sectors";
import {
  type ChannelInput,
  phoneDigits,
  validateChannels,
} from "@/lib/crm/channels";
import {
  hasBlockingOrgMatch,
  hasIdentityContactMatch,
  MIN_LIVE_SEARCH_CHARS,
  MIN_PHONE_SEARCH_DIGITS,
  orgLiveSearchReady,
  type ContactDuplicateCandidate,
  type OrgDuplicateCandidate,
} from "@/lib/crm/duplicates";
import { SOCIAL_NETWORKS } from "@/lib/crm/social";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: "entreprise",
    label: "Entreprise",
    hint: "Qui prospectez-vous ?",
  },
  {
    id: "contact",
    label: "Contact",
    hint: "Interlocuteur principal",
  },
  {
    id: "suivi",
    label: "Origine & suivi",
    hint: "Canal, réseaux, relance",
  },
  {
    id: "offres",
    label: "Offres",
    hint: "Catalogue proposé (optionnel)",
  },
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

type FieldErrors = Partial<
  Record<"orgName" | "contactFirst" | "source" | "followUpAt", string>
>;

function readTrim(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function channelsLiveReady(channels: ChannelInput[]): boolean {
  for (const c of channels) {
    const v = c.value.trim();
    if (!v) continue;
    if (c.type === "PHONE" || c.type === "WHATSAPP") {
      if (phoneDigits(v).length >= MIN_PHONE_SEARCH_DIGITS) return true;
    } else if (v.length >= MIN_LIVE_SEARCH_CHARS) {
      return true;
    }
  }
  return false;
}

export function ProspectCreateForm({
  offers,
}: {
  offers: { id: string; name: string; sku: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, run } = usePendingAction();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [source, setSource] = useState<CrmSource | null>(null);
  const [sectorPreset, setSectorPreset] = useState<string | null>(null);
  const [sectorOther, setSectorOther] = useState("");
  const [nextActionDraft, setNextActionDraft] = useState("");
  const [offerIds, setOfferIds] = useState<string[]>([]);
  const [configs, setConfigs] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [channels, setChannels] = useState<ChannelInput[]>([
    { type: "PHONE", value: "", isPrimary: true },
  ]);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [orgNameDraft, setOrgNameDraft] = useState("");
  const [orgDupes, setOrgDupes] = useState<OrgDuplicateCandidate[]>([]);
  /** Toute correspondance org (exacte ou proche) bloque dès 3 caractères. */
  const [orgMatchBlock, setOrgMatchBlock] = useState(false);
  const [contactDupes, setContactDupes] = useState<ContactDuplicateCandidate[]>(
    [],
  );
  const [contactAcked, setContactAcked] = useState(false);
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [social, setSocial] = useState<SocialSelection>({
    selected: [],
    urls: {},
  });

  const orgLiveEnabled = orgLiveSearchReady(orgNameDraft);
  const orgQueryKey = orgLiveEnabled ? orgNameDraft.trim() : "";

  const orgSearchFn = useCallback(async () => {
    const checkFd = new FormData();
    checkFd.set("orgName", orgNameDraft.trim());
    const res = await findOrgDuplicateCandidatesAction(checkFd);
    if (!res.ok) return { ok: false as const, error: res.error };
    return { ok: true as const, data: res.candidates };
  }, [orgNameDraft]);

  const orgLive = useDuplicateLiveSearch<OrgDuplicateCandidate[]>({
    queryKey: orgQueryKey,
    enabled: orgLiveEnabled,
    search: orgSearchFn,
  });

  useEffect(() => {
    if (!orgLiveEnabled) {
      setOrgDupes([]);
      setOrgMatchBlock(false);
      return;
    }
    if (orgLive.status === "ok" && orgLive.data) {
      setOrgDupes(orgLive.data);
      setOrgMatchBlock(hasBlockingOrgMatch(orgLive.data));
      return;
    }
    // idle (debounce) / pending / erreur : pas de cards périmées
    setOrgDupes([]);
    setOrgMatchBlock(false);
  }, [orgLive.status, orgLive.data, orgLiveEnabled]);

  const contactLiveEnabled = channelsLiveReady(channels);
  const contactQueryKey = contactLiveEnabled
    ? JSON.stringify(
        channels
          .filter((c) => c.value.trim())
          .map((c) => ({ t: c.type, v: c.value.trim() })),
      )
    : "";

  const contactSearchFn = useCallback(async () => {
    const filled = channels.filter((c) => c.value.trim());
    const checkFd = new FormData();
    checkFd.set("channelsJson", JSON.stringify(filled));
    checkFd.set("live", "1");
    const res = await findContactDuplicateCandidatesAction(checkFd);
    if (!res.ok) return { ok: false as const, error: res.error };
    return { ok: true as const, data: res.candidates };
  }, [channels]);

  const contactLive = useDuplicateLiveSearch<ContactDuplicateCandidate[]>({
    queryKey: contactQueryKey,
    enabled: contactLiveEnabled,
    search: contactSearchFn,
  });

  useEffect(() => {
    if (!contactLiveEnabled) {
      setContactDupes([]);
      setContactAcked(false);
      return;
    }
    if (contactLive.status === "ok" && contactLive.data) {
      setContactDupes(contactLive.data);
      if (contactLive.data.length === 0) setContactAcked(false);
      return;
    }
    setContactDupes([]);
  }, [contactLive.status, contactLive.data, contactLiveEnabled]);

  function validateStep(targetStep: number, fd: FormData): FieldErrors {
    const errs: FieldErrors = {};
    if (targetStep >= 0) {
      if (!readTrim(fd, "orgName")) {
        errs.orgName = "Indiquez le nom de l’entreprise.";
      }
    }
    if (targetStep >= 1) {
      if (!readTrim(fd, "contactFirst")) {
        errs.contactFirst = "Le prénom du contact est obligatoire.";
      }
    }
    if (targetStep >= 2) {
      if (!source) {
        errs.source = "Choisissez l’origine du prospect.";
      }
      const nextAction = readTrim(fd, "nextAction");
      const followUpRaw = readTrim(fd, "followUpAt");
      if (nextAction && !followUpRaw) {
        errs.followUpAt =
          "Date de relance obligatoire si une prochaine action est renseignée.";
      }
      if (followUpRaw) {
        const d = new Date(followUpRaw);
        if (Number.isNaN(d.getTime())) {
          errs.followUpAt = "Date de relance invalide.";
        }
      }
    }
    return errs;
  }

  function currentFormData() {
    return formRef.current ? new FormData(formRef.current) : new FormData();
  }

  async function advanceFromOrg() {
    const fd = currentFormData();
    const errs = validateStep(0, fd);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError("Complétez les champs obligatoires avant de continuer.");
      return;
    }
    if (
      sectorPreset === CRM_SECTOR_OTHER &&
      sectorOther.trim().length < 2
    ) {
      setError(
        "Précisez le secteur (min. 2 caractères) ou choisissez une liste.",
      );
      return;
    }
    setCheckingDupes(true);
    setError(null);
    setFieldErrors({});
    try {
      const checkFd = new FormData();
      checkFd.set("orgName", readTrim(fd, "orgName"));
      const res = await findOrgDuplicateCandidatesAction(checkFd);
      if (!res.ok) {
        setError(res.error ?? "Vérification doublons impossible");
        return;
      }
      setOrgDupes(res.candidates);
      const blocked = hasBlockingOrgMatch(res.candidates);
      setOrgMatchBlock(blocked);
      if (blocked) {
        setError(
          "Entreprise correspondante déjà connue (identique ou très proche). Ouvrez la fiche existante ou modifiez le nom.",
        );
        return;
      }
      setStep(1);
    } finally {
      setCheckingDupes(false);
    }
  }

  async function advanceFromContact() {
    const fd = currentFormData();
    const errs = validateStep(1, fd);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError("Complétez les champs obligatoires avant de continuer.");
      return;
    }
    const filledRaw = channels.filter((c) => c.value.trim());
    const filled = filledRaw.some((c) => c.isPrimary)
      ? filledRaw
      : filledRaw.map((c, i) => ({ ...c, isPrimary: i === 0 }));
    const chErr = validateChannels(filled);
    if (chErr) {
      setChannelsError(chErr);
      setError(chErr);
      return;
    }
    setChannelsError(null);
    setCheckingDupes(true);
    setError(null);
    setFieldErrors({});
    try {
      const checkFd = new FormData();
      checkFd.set("channelsJson", JSON.stringify(filled));
      const res = await findContactDuplicateCandidatesAction(checkFd);
      if (!res.ok) {
        setError(res.error ?? "Vérification contact impossible");
        return;
      }
      setContactDupes(res.candidates);
      if (res.candidates.length > 0 && !contactAcked) {
        setError(
          hasIdentityContactMatch(res.candidates)
            ? "Ce téléphone ou e-mail est déjà lié à une entreprise. Ouvrez la fiche ou continuez quand même."
            : "Ce canal semble déjà utilisé. Vérifiez les fiches ou continuez quand même.",
        );
        return;
      }
      setStep(2);
    } finally {
      setCheckingDupes(false);
    }
  }

  function goToStep(next: number) {
    if (next <= step) {
      setStep(next);
      return;
    }
    if (step === 0 && next === 1) {
      void advanceFromOrg();
      return;
    }
    if (step === 1 && next === 2) {
      void advanceFromContact();
      return;
    }
    const fd = currentFormData();
    const errs = validateStep(step, fd);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError("Complétez les champs obligatoires avant de continuer.");
      return;
    }
    setFieldErrors({});
    setError(null);
    setStep(next);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (step < STEPS.length - 1) {
      if (step === 0) {
        void advanceFromOrg();
        return;
      }
      if (step === 1) {
        void advanceFromContact();
        return;
      }
      goToStep(step + 1);
      return;
    }

    if (orgMatchBlock || orgDupes.length > 0) {
      setError(
        "Entreprise correspondante déjà connue (identique ou très proche). Ouvrez la fiche existante ou modifiez le nom.",
      );
      setStep(0);
      return;
    }

    const errs = validateStep(STEPS.length - 1, fd);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError("Corrigez les champs en erreur avant de créer le prospect.");
      setStep(2);
      return;
    }

    const filledRaw = channels.filter((c) => c.value.trim());
    const filled = filledRaw.some((c) => c.isPrimary)
      ? filledRaw
      : filledRaw.map((c, i) => ({ ...c, isPrimary: i === 0 }));
    const chErr = validateChannels(filled);
    if (chErr) {
      setChannelsError(chErr);
      setError(chErr);
      setStep(1);
      return;
    }

    if (contactDupes.length > 0 && !contactAcked) {
      setError(
        "Confirmez « Continuer quand même » à l’étape Contact avant de créer.",
      );
      setStep(1);
      return;
    }

    setError(null);
    setFieldErrors({});
    if (source) fd.set("source", source);
    if (
      sectorPreset === CRM_SECTOR_OTHER &&
      sectorOther.trim().length < 2
    ) {
      setError("Précisez le secteur (min. 2 caractères) ou choisissez une liste.");
      setStep(0);
      return;
    }
    fd.set("sector", composeSectorValue(sectorPreset, sectorOther));
    fd.set("channelsJson", JSON.stringify(filled));
    for (const n of SOCIAL_NETWORKS) {
      if (social.selected.includes(n.field)) {
        fd.set(n.field, social.urls[n.field] ?? "");
      } else {
        fd.set(n.field, "");
      }
    }
    if (contactAcked && contactDupes.length > 0) {
      fd.set("acknowledgeContactDupes", "1");
    }
    const links: OfferRow[] = offerIds.map((id) => ({
      catalogOfferId: id,
      config: configs[id] ?? {},
    }));
    fd.set("offersJson", JSON.stringify(links));

    void run(async () => {
      const res = await createProspectAction(fd);
      if (res && !res.ok) {
        setError(res.error ?? "Échec de la création");
      }
    });
  }

  /** Tant que la vérif live n’est pas « ok », pas de progression (debounce / pending / erreur). */
  const orgSearchBlocking = orgLiveEnabled && orgLive.status !== "ok";
  const contactNeedsAck = contactDupes.length > 0 && !contactAcked;
  const contactSearchBlocking =
    step === 1 && contactLiveEnabled && contactLive.status !== "ok";

  const busy = pending || checkingDupes;
  const continueDisabled =
    busy ||
    (step === 0 && (orgMatchBlock || orgSearchBlocking)) ||
    (step === 1 && (contactNeedsAck || contactSearchBlocking));

  const orgStatusHint = useMemo(() => {
    if (!orgLiveEnabled) {
      return `Saisissez au moins ${MIN_LIVE_SEARCH_CHARS} caractères pour vérifier les doublons automatiquement.`;
    }
    if (orgLive.status === "ok" && orgDupes.length === 0) {
      return "Aucune correspondance détectée pour ce nom.";
    }
    return null;
  }, [orgLiveEnabled, orgLive.status, orgDupes.length]);

  const contactStatusHint = useMemo(() => {
    if (!contactLiveEnabled) {
      return "La vérification démarre dès qu’un téléphone (6 chiffres) ou un e-mail (3 caractères) est saisi.";
    }
    if (contactLive.status === "ok" && contactDupes.length === 0) {
      return "Aucune correspondance contact détectée.";
    }
    return null;
  }, [contactLiveEnabled, contactLive.status, contactDupes.length]);

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {step > 0 ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setError(null);
              setFieldErrors({});
              setStep((s) => s - 1);
            }}
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            Retour
          </Button>
        ) : (
          <Link
            prefetch={false}
            href="/crm/prospects"
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-msk-ink transition hover:bg-msk-ink/5",
              busy && "pointer-events-none opacity-50",
            )}
          >
            Annuler
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="hidden text-xs text-msk-ink/40 sm:block">
          Étape {step + 1} / {STEPS.length}
        </p>
        {step === 1 && contactNeedsAck ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy || contactLive.status === "pending"}
            onClick={() => {
              setContactAcked(true);
              setError(null);
              setStep(2);
            }}
          >
            Continuer quand même
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={continueDisabled}
          form="prospect-create-form"
        >
          {checkingDupes ||
          (step === 0 && orgLive.status === "pending") ||
          (step === 1 && contactLive.status === "pending") ? (
            "Vérification…"
          ) : pending ? (
            "Création…"
          ) : step < STEPS.length - 1 ? (
            <>
              Continuer
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </>
          ) : (
            "Créer le prospect"
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <FormShell footer={footer}>
      <form
        id="prospect-create-form"
        ref={formRef}
        onSubmit={onSubmit}
        className="space-y-8"
        noValidate
        aria-busy={busy || undefined}
      >
        <nav aria-label="Étapes du formulaire">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={busy || i > step}
                    onClick={() => {
                      if (i < step) {
                        setError(null);
                        setFieldErrors({});
                        setStep(i);
                      } else if (i > step) {
                        goToStep(i);
                      }
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                      active
                        ? "border-msk-blue/40 bg-msk-blue/6 shadow-sm"
                        : done
                          ? "border-msk-ink/10 bg-msk-chalk/60 hover:border-msk-ink/20"
                          : "border-msk-ink/6 bg-white text-msk-ink/35",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        active
                          ? "bg-msk-blue text-white"
                          : done
                            ? "bg-msk-ink/80 text-white"
                            : "bg-msk-chalk text-msk-ink/40",
                      )}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm font-semibold",
                          active || done ? "text-msk-ink" : "text-msk-ink/40",
                        )}
                      >
                        {s.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-msk-ink/45">
                        {s.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-msk-coral/25 bg-msk-coral/5 px-4 py-3 text-sm text-msk-coral"
          >
            {error}
          </div>
        ) : null}

        {/* Étape 0 — Entreprise */}
        <section
          className={cn(step !== 0 && "hidden")}
          aria-labelledby="step-entreprise"
        >
          <div className="mb-5">
            <h2
              id="step-entreprise"
              className="text-lg font-semibold text-msk-ink"
            >
              Entreprise
            </h2>
            <p className="mt-1 text-sm text-msk-ink/50">
              Identité de la structure prospectée. Contrôle anti-doublon
              automatique dès {MIN_LIVE_SEARCH_CHARS} caractères.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel htmlFor="orgName" required>
                Entreprise
              </FieldLabel>
              <Input
                id="orgName"
                name="orgName"
                value={orgNameDraft}
                autoComplete="organization"
                placeholder="Ex. Boulangerie Diallo SARL"
                disabled={busy}
                onChange={(e) => {
                  setOrgNameDraft(e.target.value);
                  setOrgMatchBlock(false);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.orgName;
                    return next;
                  });
                }}
                aria-invalid={
                  Boolean(fieldErrors.orgName) || orgMatchBlock || undefined
                }
                className={
                  fieldErrors.orgName || orgMatchBlock
                    ? "border-msk-coral/50"
                    : undefined
                }
              />
              <FieldError>{fieldErrors.orgName}</FieldError>
              <DuplicateSearchStatus
                status={orgLiveEnabled ? orgLive.status : "idle"}
                error={orgLive.error}
                onRetry={orgLive.refresh}
                idleHint={orgStatusHint}
                okEmptyHint={
                  orgDupes.length === 0 ? orgStatusHint : null
                }
              />
            </div>
            <div>
              <OptionPickerSingle
                label="Secteur"
                options={SECTOR_PICKER_OPTIONS}
                value={sectorPreset}
                onChange={(v) => {
                  setSectorPreset(v);
                  if (v !== CRM_SECTOR_OTHER) setSectorOther("");
                }}
                disabled={busy}
                placeholder="Choisir un secteur"
                modalTitle="Secteur d’activité"
              />
              {sectorPreset === CRM_SECTOR_OTHER ? (
                <div className="mt-2">
                  <FieldLabel htmlFor="sectorOther" required>
                    Précisez le secteur
                  </FieldLabel>
                  <Input
                    id="sectorOther"
                    value={sectorOther}
                    onChange={(e) => setSectorOther(e.target.value)}
                    placeholder="Ex. Énergie solaire, artisanat…"
                    disabled={busy}
                  />
                </div>
              ) : null}
            </div>
            <div>
              <FieldLabel htmlFor="city">Ville</FieldLabel>
              <Input
                id="city"
                name="city"
                placeholder="Ex. Bamako, Dakar…"
                disabled={busy}
              />
            </div>
            <div>
              <FieldLabel htmlFor="website">Site web</FieldLabel>
              <Input
                id="website"
                name="website"
                inputMode="url"
                placeholder="https://…"
                disabled={busy}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel htmlFor="notes">Note</FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Contexte, besoin exprimé, points d’attention pour l’équipe…"
                disabled={busy}
              />
              <FieldHint>
                Note libre sur ce prospect — visible sur la fiche, pas sur les
                devis.
              </FieldHint>
            </div>
          </div>

          {orgDupes.length > 0 ? (
            <div className="mt-6 space-y-3" aria-live="polite">
              <h3 className="text-sm font-semibold text-msk-ink">
                Correspondance détectée — création bloquée
              </h3>
              {orgDupes.map((c) => (
                <OrgDuplicateMatchCard
                  key={`${c.entity}-${c.id}`}
                  candidate={c}
                />
              ))}
            </div>
          ) : null}
        </section>

        {/* Étape 1 — Contact */}
        <section
          className={cn(step !== 1 && "hidden")}
          aria-labelledby="step-contact"
        >
          <div className="mb-5">
            <h2
              id="step-contact"
              className="text-lg font-semibold text-msk-ink"
            >
              Contact principal
            </h2>
            <p className="mt-1 text-sm text-msk-ink/50">
              Une personne · plusieurs moyens de joindre · un principal.
              Vérification automatique des contacts existants.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel htmlFor="contactFirst" required>
                Prénom
              </FieldLabel>
              <Input
                id="contactFirst"
                name="contactFirst"
                autoComplete="given-name"
                placeholder="Ex. Aïssatou"
                disabled={busy}
                aria-invalid={Boolean(fieldErrors.contactFirst) || undefined}
                className={
                  fieldErrors.contactFirst ? "border-msk-coral/50" : undefined
                }
              />
              <FieldError>{fieldErrors.contactFirst}</FieldError>
            </div>
            <div>
              <FieldLabel htmlFor="contactLast">Nom</FieldLabel>
              <Input
                id="contactLast"
                name="contactLast"
                autoComplete="family-name"
                placeholder="Ex. Ndiaye"
                disabled={busy}
              />
            </div>
            <div>
              <FieldLabel htmlFor="jobTitle">Poste</FieldLabel>
              <Input
                id="jobTitle"
                name="jobTitle"
                autoComplete="organization-title"
                placeholder="Ex. Directrice commerciale"
                disabled={busy}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <ContactChannelsEditor
                value={channels}
                onChange={(next) => {
                  setChannels(next);
                  setContactAcked(false);
                  setChannelsError(null);
                }}
                disabled={busy}
                error={channelsError}
              />
              <DuplicateSearchStatus
                status={contactLiveEnabled ? contactLive.status : "idle"}
                error={contactLive.error}
                onRetry={contactLive.refresh}
                idleHint={contactStatusHint}
                okEmptyHint={
                  contactDupes.length === 0 ? contactStatusHint : null
                }
              />
            </div>
          </div>

          {contactDupes.length > 0 ? (
            <div className="mt-6 space-y-3" aria-live="polite">
              <h3 className="text-sm font-semibold text-msk-ink">
                {hasIdentityContactMatch(contactDupes)
                  ? "Contact déjà présent"
                  : "Canal déjà utilisé"}
              </h3>
              {contactDupes.map((c) => (
                <ContactDuplicateMatchCard
                  key={`${c.entity}-${c.id}-${c.matchedVia}`}
                  candidate={c}
                />
              ))}
            </div>
          ) : null}
        </section>

        {/* Étape 2 — Origine & suivi */}
        <section
          className={cn(step !== 2 && "hidden")}
          aria-labelledby="step-suivi"
        >
          <div className="mb-5">
            <h2 id="step-suivi" className="text-lg font-semibold text-msk-ink">
              Origine & suivi
            </h2>
            <p className="mt-1 text-sm text-msk-ink/50">
              Canal d’acquisition, présence digitale et prochaine action.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 rounded-xl border border-msk-ink/6 bg-msk-chalk/30 p-4 lg:col-span-4">
              <OptionPickerSingle
                label="Origine"
                required
                options={SOURCE_OPTIONS}
                value={source}
                onChange={(v) => {
                  setSource((v as CrmSource) ?? null);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.source;
                    return next;
                  });
                }}
                disabled={busy}
                placeholder="Choisir l’origine"
                modalTitle="Origine du prospect"
              />
              <FieldError>{fieldErrors.source}</FieldError>
              <FieldHint>
                Instagram, terrain, recommandation… — d’où vient ce lead.
              </FieldHint>
            </div>
            <div className="space-y-3 rounded-xl border border-msk-ink/6 bg-msk-chalk/30 p-4 lg:col-span-4">
              <div>
                <FieldLabel htmlFor="nextAction">Prochaine action</FieldLabel>
                <Input
                  id="nextAction"
                  name="nextAction"
                  value={nextActionDraft}
                  onChange={(e) => setNextActionDraft(e.target.value)}
                  placeholder="Ex. Appeler pour présenter l’offre site vitrine"
                  disabled={busy}
                />
              </div>
              <div>
                <FieldLabel
                  htmlFor="followUpAt"
                  required={nextActionDraft.trim().length > 0}
                >
                  Date de relance
                </FieldLabel>
                <Input
                  id="followUpAt"
                  name="followUpAt"
                  type="date"
                  disabled={busy}
                  aria-invalid={Boolean(fieldErrors.followUpAt) || undefined}
                  className={
                    fieldErrors.followUpAt ? "border-msk-coral/50" : undefined
                  }
                />
                <FieldError>{fieldErrors.followUpAt}</FieldError>
                <FieldHint>
                  Obligatoire dès qu’une prochaine action est renseignée.
                </FieldHint>
              </div>
              <div>
                <FieldLabel htmlFor="budgetXof">Budget estimé (FCFA)</FieldLabel>
                <Input
                  id="budgetXof"
                  name="budgetXof"
                  inputMode="numeric"
                  placeholder="Ex. 500000"
                  disabled={busy}
                />
              </div>
            </div>
            <div className="rounded-xl border border-msk-ink/6 bg-msk-chalk/30 p-4 lg:col-span-4">
              <SocialNetworksEditor
                value={social}
                onChange={setSocial}
                disabled={busy}
              />
            </div>
          </div>
        </section>

        {/* Étape 3 — Offres */}
        <section
          className={cn(step !== 3 && "hidden")}
          aria-labelledby="step-offres"
        >
          <ProspectOffersStep
            offers={offers}
            selectedIds={offerIds}
            onSelectedIdsChange={setOfferIds}
            configs={configs}
            onConfigsChange={setConfigs}
            disabled={busy}
          />
        </section>
      </form>
    </FormShell>
  );
}
