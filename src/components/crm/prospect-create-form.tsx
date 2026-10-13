"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { CrmSource } from "@prisma/client";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { createProspectAction } from "@/actions/crm";
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
import { usePendingAction } from "@/hooks/use-pending-action";
import { SOURCE_LABELS } from "@/lib/crm/labels";
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
    hint: "Comment trouvé, prochaine relance",
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
  Record<
    | "orgName"
    | "contactFirst"
    | "contactLast"
    | "email"
    | "phone"
    | "source"
    | "followUpAt"
    | "nextAction",
    string
  >
>;

function readTrim(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
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
  const [nextActionDraft, setNextActionDraft] = useState("");
  const [offerIds, setOfferIds] = useState<string[]>([]);
  const [configs, setConfigs] = useState<
    Record<string, Record<string, unknown>>
  >({});

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
      const email = readTrim(fd, "email");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errs.email = "Adresse e-mail invalide.";
      }
      const phone = readTrim(fd, "phone");
      if (!phone && !email) {
        errs.phone = "Renseignez au moins un téléphone ou un e-mail.";
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

  function goToStep(next: number) {
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
      goToStep(step + 1);
      return;
    }

    const errs = validateStep(STEPS.length - 1, fd);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError("Corrigez les champs en erreur avant de créer le prospect.");
      const firstKey = Object.keys(errs)[0];
      const jump =
        firstKey === "orgName"
          ? 0
          : firstKey === "contactFirst" ||
              firstKey === "contactLast" ||
              firstKey === "email" ||
              firstKey === "phone"
            ? 1
            : 2;
      setStep(jump);
      return;
    }

    setError(null);
    setFieldErrors({});
    if (source) fd.set("source", source);
    const links: OfferRow[] = offerIds.map((id) => ({
      catalogOfferId: id,
      config: configs[id] ?? {},
    }));
    fd.set("offersJson", JSON.stringify(links));

    void run(async () => {
      // Succès : `redirect()` dans l’action (App Router). Erreur : return { ok: false }.
      const res = await createProspectAction(fd);
      if (res && !res.ok) {
        setError(res.error ?? "Échec de la création");
      }
    });
  }

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {step > 0 ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
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
              pending && "pointer-events-none opacity-50",
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
        <Button type="submit" disabled={pending} form="prospect-create-form">
          {pending ? (
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
        aria-busy={pending || undefined}
      >
        {/* Stepper pleine largeur */}
        <nav aria-label="Étapes du formulaire">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={pending || i > step}
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
                        ? "border-msk-blue/40 bg-msk-blue/[0.06] shadow-sm"
                        : done
                          ? "border-msk-ink/10 bg-msk-chalk/60 hover:border-msk-ink/20"
                          : "border-msk-ink/[0.06] bg-white text-msk-ink/35",
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
              Identité de la structure prospectée.
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
                autoComplete="organization"
                placeholder="Ex. Boulangerie Diallo SARL"
                disabled={pending}
                aria-invalid={Boolean(fieldErrors.orgName) || undefined}
                className={
                  fieldErrors.orgName ? "border-msk-coral/50" : undefined
                }
              />
              <FieldError>{fieldErrors.orgName}</FieldError>
            </div>
            <div>
              <FieldLabel htmlFor="sector">Secteur</FieldLabel>
              <Input
                id="sector"
                name="sector"
                placeholder="Ex. Agroalimentaire, BTP…"
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="city">Ville</FieldLabel>
              <Input
                id="city"
                name="city"
                placeholder="Ex. Dakar, Thiès…"
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="website">Site web</FieldLabel>
              <Input
                id="website"
                name="website"
                inputMode="url"
                placeholder="https://…"
                disabled={pending}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel htmlFor="notes">Notes internes</FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Contexte, besoin exprimé, info utile pour l’équipe…"
                disabled={pending}
              />
              <FieldHint>Visible uniquement dans l’ERP, pas sur les devis.</FieldHint>
            </div>
          </div>
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
              Au moins un moyen de joindre la personne (téléphone ou e-mail).
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
                disabled={pending}
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
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="jobTitle">Poste</FieldLabel>
              <Input
                id="jobTitle"
                name="jobTitle"
                autoComplete="organization-title"
                placeholder="Ex. Directrice commerciale"
                disabled={pending}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="mb-3 text-sm font-medium text-msk-ink/80">
                Moyen de contact
                <span className="ml-0.5 font-semibold text-msk-coral" aria-hidden>
                  *
                </span>
                <span className="sr-only"> (obligatoire)</span>
                <span className="ml-2 text-xs font-normal text-msk-ink/45">
                  Téléphone ou e-mail — au moins un
                </span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="Ex. +221 77 000 00 00"
                    disabled={pending}
                    aria-invalid={Boolean(fieldErrors.phone) || undefined}
                    className={
                      fieldErrors.phone ? "border-msk-coral/50" : undefined
                    }
                  />
                  <FieldError>{fieldErrors.phone}</FieldError>
                </div>
                <div>
                  <FieldLabel htmlFor="email">E-mail</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Ex. contact@entreprise.sn"
                    disabled={pending}
                    aria-invalid={Boolean(fieldErrors.email) || undefined}
                    className={
                      fieldErrors.email ? "border-msk-coral/50" : undefined
                    }
                  />
                  <FieldError>{fieldErrors.email}</FieldError>
                </div>
              </div>
            </div>
          </div>
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
              Canal d’acquisition et prochaine action commerciale.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-msk-ink/[0.06] bg-msk-chalk/30 p-4 sm:p-5">
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
                disabled={pending}
                placeholder="Choisir l’origine"
                modalTitle="Origine du prospect"
              />
              <FieldError>{fieldErrors.source}</FieldError>
              <FieldHint>
                Instagram, terrain, recommandation… — d’où vient ce lead.
              </FieldHint>
            </div>
            <div className="space-y-4 rounded-xl border border-msk-ink/[0.06] bg-msk-chalk/30 p-4 sm:p-5">
              <div>
                <FieldLabel htmlFor="nextAction">Prochaine action</FieldLabel>
                <Input
                  id="nextAction"
                  name="nextAction"
                  value={nextActionDraft}
                  onChange={(e) => setNextActionDraft(e.target.value)}
                  placeholder="Ex. Appeler pour présenter l’offre site vitrine"
                  disabled={pending}
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
                  disabled={pending}
                  aria-invalid={Boolean(fieldErrors.followUpAt) || undefined}
                  className={
                    fieldErrors.followUpAt ? "border-msk-coral/50" : undefined
                  }
                />
                <FieldError>{fieldErrors.followUpAt}</FieldError>
                <FieldHint>
                  Obligatoire dès qu’une prochaine action est renseignée
                  (règle GUIDE).
                </FieldHint>
              </div>
              <div>
                <FieldLabel htmlFor="budgetXof">Budget estimé (FCFA)</FieldLabel>
                <Input
                  id="budgetXof"
                  name="budgetXof"
                  inputMode="numeric"
                  placeholder="Ex. 500000"
                  disabled={pending}
                />
              </div>
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
            disabled={pending}
          />
        </section>
      </form>
    </FormShell>
  );
}
