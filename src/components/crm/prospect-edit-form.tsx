"use client";

import Link from "next/link";
import { useState } from "react";
import type { CrmSource } from "@prisma/client";
import { updateProspectAction } from "@/actions/crm";
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
import { usePendingAction } from "@/hooks/use-pending-action";
import { SOURCE_LABELS } from "@/lib/crm/labels";
import {
  composeSectorValue,
  CRM_SECTOR_OTHER,
  resolveSectorSelection,
  SECTOR_PICKER_OPTIONS,
} from "@/lib/crm/sectors";
import {
  type ChannelInput,
  validateChannels,
} from "@/lib/crm/channels";
import { SOCIAL_NETWORKS, type SocialField } from "@/lib/crm/social";
import { ContactChannelsEditor } from "@/components/crm/contact-channels-editor";
import {
  SocialNetworksEditor,
  type SocialSelection,
} from "@/components/crm/social-networks-editor";

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

export type ProspectEditInitial = {
  opportunityId: string;
  orgName: string;
  sector: string;
  city: string;
  country: string;
  website: string;
  notes: string;
  source: CrmSource | null;
  contactFirst: string;
  contactLast: string;
  jobTitle: string;
  phone: string;
  email: string;
  channels: ChannelInput[];
  social: SocialSelection;
  budgetXof: string;
  nextAction: string;
  followUpAt: string;
};

/**
 * LOT-C — édition pleine largeur (identité, contact primaire, suivi).
 * Pas de multi-contacts / offres (lots ultérieurs).
 */
export function ProspectEditForm({ initial }: { initial: ProspectEditInitial }) {
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<CrmSource | null>(initial.source);
  const initialSector = resolveSectorSelection(initial.sector);
  const [sectorPreset, setSectorPreset] = useState<string | null>(
    initialSector.preset,
  );
  const [sectorOther, setSectorOther] = useState(initialSector.otherDetail);
  const [nextActionDraft, setNextActionDraft] = useState(initial.nextAction);
  const [channels, setChannels] = useState<ChannelInput[]>(() => {
    if (initial.channels.length > 0) return initial.channels;
    const fallback: ChannelInput[] = [];
    if (initial.phone.trim()) {
      fallback.push({
        type: "PHONE",
        value: initial.phone,
        isPrimary: true,
      });
    }
    if (initial.email.trim()) {
      fallback.push({
        type: "EMAIL",
        value: initial.email,
        isPrimary: fallback.length === 0,
      });
    }
    return fallback.length
      ? fallback
      : [{ type: "PHONE", value: "", isPrimary: true }];
  });
  const [social, setSocial] = useState<SocialSelection>(initial.social);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (source) fd.set("source", source);
    else {
      setError("Origine obligatoire");
      return;
    }
    if (
      sectorPreset === CRM_SECTOR_OTHER &&
      sectorOther.trim().length < 2
    ) {
      setError("Précisez le secteur (min. 2 caractères) ou choisissez une liste.");
      return;
    }
    fd.set("sector", composeSectorValue(sectorPreset, sectorOther));
    const filled = channels.filter((c) => c.value.trim());
    const chErr = validateChannels(filled);
    if (chErr) {
      setError(chErr);
      return;
    }
    fd.set("channelsJson", JSON.stringify(filled));
    for (const n of SOCIAL_NETWORKS) {
      if (social.selected.includes(n.field as SocialField)) {
        fd.set(n.field, social.urls[n.field] ?? "");
      } else {
        fd.set(n.field, "");
      }
    }
    const nextAction = String(fd.get("nextAction") ?? "").trim();
    const followUpAt = String(fd.get("followUpAt") ?? "").trim();
    if (nextAction && !followUpAt) {
      setError(
        "Date de relance obligatoire si une prochaine action est renseignée.",
      );
      return;
    }
    void run(async () => {
      const res = await updateProspectAction(fd);
      if (res && !res.ok) {
        setError(res.error ?? "Échec de l’enregistrement");
      }
    });
  }

  return (
    <FormShell
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            prefetch={false}
            href={`/crm/prospects/${initial.opportunityId}`}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink transition hover:bg-msk-chalk"
            aria-disabled={pending || undefined}
          >
            Annuler
          </Link>
          <Button type="submit" form="prospect-edit-form" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      }
    >
      <form
        id="prospect-edit-form"
        onSubmit={onSubmit}
        className="space-y-10"
        noValidate
        aria-busy={pending || undefined}
      >
        <input
          type="hidden"
          name="opportunityId"
          value={initial.opportunityId}
        />

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-msk-coral/25 bg-msk-coral/5 px-4 py-3 text-sm text-msk-coral"
          >
            {error}
          </div>
        ) : null}

        <section aria-labelledby="edit-entreprise">
          <div className="mb-5">
            <h2
              id="edit-entreprise"
              className="text-lg font-semibold text-msk-ink"
            >
              Entreprise
            </h2>
            <p className="mt-1 text-sm text-msk-ink/50">
              Corrigez l’identité du prospect (fautes de saisie, infos manquantes).
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
                defaultValue={initial.orgName}
                autoComplete="organization"
                placeholder="Ex. Boulangerie Diallo SARL"
                disabled={pending}
                required
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
                disabled={pending}
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
                    disabled={pending}
                  />
                </div>
              ) : null}
            </div>
            <div>
              <FieldLabel htmlFor="city">Ville</FieldLabel>
              <Input
                id="city"
                name="city"
                defaultValue={initial.city}
                placeholder="Ex. Bamako, Dakar…"
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="country">Pays (code)</FieldLabel>
              <Input
                id="country"
                name="country"
                defaultValue={initial.country || "ML"}
                placeholder="ML"
                maxLength={4}
                disabled={pending}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="website">Site web</FieldLabel>
              <Input
                id="website"
                name="website"
                defaultValue={initial.website}
                inputMode="url"
                placeholder="https://…"
                disabled={pending}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel htmlFor="notes">Note</FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={initial.notes}
                placeholder="Contexte, besoin exprimé, points d’attention pour l’équipe…"
                disabled={pending}
              />
              <FieldHint>
                Note libre sur ce prospect — visible sur la fiche, pas sur les
                devis.
              </FieldHint>
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-contact">
          <div className="mb-5">
            <h2 id="edit-contact" className="text-lg font-semibold text-msk-ink">
              Contact principal
            </h2>
            <p className="mt-1 text-sm text-msk-ink/50">
              Une personne · plusieurs moyens · un principal.
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
                defaultValue={initial.contactFirst}
                autoComplete="given-name"
                placeholder="Ex. Aïssatou"
                disabled={pending}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="contactLast">Nom</FieldLabel>
              <Input
                id="contactLast"
                name="contactLast"
                defaultValue={initial.contactLast}
                autoComplete="family-name"
                placeholder="Ex. Diallo"
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="jobTitle">Poste</FieldLabel>
              <Input
                id="jobTitle"
                name="jobTitle"
                defaultValue={initial.jobTitle}
                placeholder="Ex. Gérante"
                disabled={pending}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <ContactChannelsEditor
                value={
                  channels.length
                    ? channels
                    : [{ type: "PHONE", value: "", isPrimary: true }]
                }
                onChange={setChannels}
                disabled={pending}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-suivi">
          <div className="mb-5">
            <h2 id="edit-suivi" className="text-lg font-semibold text-msk-ink">
              Origine &amp; suivi
            </h2>
            <p className="mt-1 text-sm text-msk-ink/50">
              Origine, réseaux sociaux, budget et prochaine action.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <OptionPickerSingle
                label="Origine"
                required
                options={SOURCE_OPTIONS}
                value={source}
                onChange={(v) => setSource((v as CrmSource | null) ?? null)}
                disabled={pending}
                placeholder="Choisir l’origine"
                modalTitle="Origine du prospect"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <SocialNetworksEditor
                value={social}
                onChange={setSocial}
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="budgetXof">Budget estimé (XOF)</FieldLabel>
              <Input
                id="budgetXof"
                name="budgetXof"
                defaultValue={initial.budgetXof}
                inputMode="numeric"
                placeholder="Ex. 150000"
                disabled={pending}
              />
            </div>
            <div>
              <FieldLabel htmlFor="followUpAt">
                Date de relance
                {nextActionDraft.trim() ? (
                  <span className="ml-0.5 font-semibold text-msk-coral" aria-hidden>
                    *
                  </span>
                ) : null}
              </FieldLabel>
              <Input
                id="followUpAt"
                name="followUpAt"
                type="date"
                defaultValue={initial.followUpAt}
                disabled={pending}
              />
              {nextActionDraft.trim() ? (
                <FieldHint>Obligatoire si une prochaine action est renseignée.</FieldHint>
              ) : null}
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel htmlFor="nextAction">Prochaine action</FieldLabel>
              <Input
                id="nextAction"
                name="nextAction"
                defaultValue={initial.nextAction}
                placeholder="Ex. Rappeler pour devis pack RS"
                disabled={pending}
                onChange={(e) => setNextActionDraft(e.target.value)}
              />
            </div>
          </div>
        </section>

        <FieldError>{error}</FieldError>
      </form>
    </FormShell>
  );
}
