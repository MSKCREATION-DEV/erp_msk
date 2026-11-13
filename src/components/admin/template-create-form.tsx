"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createDocumentTemplateAction } from "@/actions/studio-templates";
import { textToBlocks } from "@/lib/studio/dsl";
import { extractVariableSlugs } from "@/lib/studio/variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import { FormSteps } from "@/components/ui/form-steps";
import { usePendingAction } from "@/hooks/use-pending-action";
import { failAction, reportActionSuccess } from "@/lib/toast/report";

const STEPS = [
  { id: "identite", label: "Identité", hint: "Nom, code, description" },
  { id: "contenu", label: "Contenu", hint: "Blocs + variables {{slug}}" },
  { id: "signature", label: "Signature", hint: "OFF par défaut" },
  { id: "recap", label: "Récapitulatif", hint: "Vérifier puis créer" },
] as const;

const BODY_PLACEHOLDER = `# Titre du document

Texte du paragraphe. Utilisez {{client.nom}} pour insérer une variable.

> Texte mis en évidence (encadré).

---

[[SIGNATURE: Signature du collaborateur | Pour l'entreprise]]`;

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function TemplateCreateForm({
  knownVariableSlugs,
}: {
  /** Catalogue central — pour repérer les variables inconnues avant soumission. */
  knownVariableSlugs: string[];
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [signatureEnabled, setSignatureEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const knownSet = useMemo(() => new Set(knownVariableSlugs), [knownVariableSlugs]);
  const blocks = useMemo(() => textToBlocks(bodyText), [bodyText]);
  const slugs = useMemo(() => extractVariableSlugs(bodyText), [bodyText]);
  const unknownSlugs = slugs.filter((s) => !knownSet.has(s));

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (name.trim().length < 3) return "Nom trop court (3 caractères min.)";
      if (!/^[a-z][a-z0-9_]{2,63}$/.test(code)) {
        return "Code invalide — minuscules/chiffres/_ uniquement, commence par une lettre";
      }
    }
    if (index === 1) {
      if (bodyText.trim().length < 10) return "Contenu trop court";
      if (blocks.length === 0) return "Aucun bloc reconnu — vérifiez la syntaxe";
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function onSubmit() {
    setError(null);
    const fd = new FormData();
    fd.set("code", code);
    fd.set("name", name);
    if (description.trim()) fd.set("description", description.trim());
    fd.set("bodyText", bodyText);
    if (signatureEnabled) fd.set("signatureEnabled", "on");
    void run(async () => {
      const res = await createDocumentTemplateAction(null, fd);
      if (failAction(res, setError, "Échec de la création")) return;
      reportActionSuccess(res.message ?? "Gabarit créé");
      if (res.templateId) {
        router.push(`/administration/gabarits/${res.templateId}`);
      } else {
        router.push("/administration/gabarits");
      }
    });
  }

  const stepId = STEPS[step]?.id;

  return (
    <FormShell
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          {step > 0 ? (
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={goBack}>
              Précédent
            </Button>
          ) : (
            <Link
              href="/administration/gabarits"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
            >
              Annuler
            </Link>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" size="sm" disabled={pending} onClick={goNext}>
              Continuer
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={pending} onClick={onSubmit}>
              {pending ? "Création…" : "Créer le gabarit"}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <FormSteps
          steps={STEPS}
          currentIndex={step}
          onGoTo={(i) => {
            if (i < step) {
              setError(null);
              setStep(i);
            }
          }}
        />

        {stepId === "identite" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="tpl-name" required>
                Nom du gabarit
              </FieldLabel>
              <Input
                id="tpl-name"
                value={name}
                disabled={pending}
                placeholder="Ex. Attestation de présence"
                onChange={(e) => {
                  setName(e.target.value);
                  if (!codeTouched) setCode(slugify(e.target.value));
                }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="tpl-code" required>
                Code (identifiant technique)
              </FieldLabel>
              <Input
                id="tpl-code"
                value={code}
                disabled={pending}
                placeholder="attestation_presence"
                onChange={(e) => {
                  setCodeTouched(true);
                  setCode(slugify(e.target.value));
                }}
              />
              <FieldHint>Unique, minuscules — utilisé par le moteur central.</FieldHint>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="tpl-desc">Description</FieldLabel>
              <Textarea
                id="tpl-desc"
                value={description}
                disabled={pending}
                rows={2}
                placeholder="À quoi sert ce document, pour qui ?"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {stepId === "contenu" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FieldLabel htmlFor="tpl-body" required>
                Contenu du document
              </FieldLabel>
              <Textarea
                id="tpl-body"
                value={bodyText}
                disabled={pending}
                rows={16}
                placeholder={BODY_PLACEHOLDER}
                className="font-mono text-xs leading-relaxed"
                onChange={(e) => setBodyText(e.target.value)}
              />
              <FieldHint>
                <code># Titre</code> · <code>&gt; encadré</code> ·{" "}
                <code>---</code> (séparateur) ·{" "}
                <code>[[SIGNATURE: Gauche | Droite]]</code> · variables{" "}
                <code>{"{{slug}}"}</code>.
              </FieldHint>
            </div>
            <div className="space-y-3 rounded-xl border border-msk-ink/8 bg-msk-chalk/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-caps text-msk-ink/45">
                Aperçu des blocs ({blocks.length})
              </p>
              {blocks.length === 0 ? (
                <p className="text-xs text-msk-ink/40">Aucun bloc détecté.</p>
              ) : (
                <ol className="space-y-1.5">
                  {blocks.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-msk-ink/70">
                      <Badge tone="ink" className="shrink-0">
                        {b.kind}
                      </Badge>
                      <span className="truncate">
                        {b.kind === "paragraph" || b.kind === "heading" || b.kind === "highlight"
                          ? b.text
                          : b.kind === "signature"
                            ? `${b.leftLabel} / ${b.rightLabel}`
                            : "—"}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <div className="border-t border-msk-ink/8 pt-3">
                <p className="text-xs font-semibold uppercase tracking-caps text-msk-ink/45">
                  Variables détectées ({slugs.length})
                </p>
                {slugs.length === 0 ? (
                  <p className="mt-1 text-xs text-msk-ink/40">Aucune.</p>
                ) : (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {slugs.map((s) => (
                      <li key={s}>
                        <Badge tone={knownSet.has(s) ? "success" : "coral"}>
                          {`{{${s}}}`}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {unknownSlugs.length > 0 ? (
                  <p className="mt-2 text-xs text-msk-coral">
                    Hors catalogue :{" "}
                    {unknownSlugs.map((s) => `{{${s}}}`).join(", ")} — ajoutez-les
                    via{" "}
                    <Link href="/administration/gabarits/variables/nouveau" className="underline">
                      le catalogue de variables
                    </Link>{" "}
                    pour qu’un échantillon s’affiche en aperçu.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {stepId === "signature" ? (
          <div className="space-y-3">
            <p className="text-sm text-msk-ink/60">
              Règle absolue du Studio : la signature est <strong>désactivée par
              défaut</strong> pour tout nouveau gabarit. Aucune image de
              signature n’est injectée tant que vous ne l’activez pas
              explicitement ici.
            </p>
            <label className="flex items-start gap-3 rounded-xl border border-msk-ink/10 bg-white p-4">
              <input
                type="checkbox"
                checked={signatureEnabled}
                disabled={pending}
                onChange={(e) => setSignatureEnabled(e.target.checked)}
                className="mt-0.5 size-4 rounded border-msk-ink/20 text-msk-blue focus:ring-msk-blue/30"
              />
              <span>
                <span className="block text-sm font-medium text-msk-ink">
                  Activer la signature pour ce gabarit
                </span>
                <span className="block text-xs text-msk-ink/45">
                  Le bloc <code>[[SIGNATURE: …]]</code> ne sera rendu que si cette
                  case est cochée — sinon il est ignoré, sans image.
                </span>
              </span>
            </label>
          </div>
        ) : null}

        {stepId === "recap" ? (
          <div className="space-y-3 rounded-xl border border-msk-ink/8 bg-msk-chalk/40 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-caps text-msk-ink/45">
              Récapitulatif
            </p>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-msk-ink/50">Nom</dt>
                <dd className="font-medium text-msk-ink">{name || "—"}</dd>
              </div>
              <div>
                <dt className="text-msk-ink/50">Code</dt>
                <dd className="font-mono text-msk-ink">{code || "—"}</dd>
              </div>
              <div>
                <dt className="text-msk-ink/50">Blocs</dt>
                <dd className="text-msk-ink">{blocks.length}</dd>
              </div>
              <div>
                <dt className="text-msk-ink/50">Signature</dt>
                <dd className="text-msk-ink">
                  {signatureEnabled ? (
                    <Badge tone="success">Activée</Badge>
                  ) : (
                    <Badge tone="muted">Désactivée</Badge>
                  )}
                </dd>
              </div>
            </dl>
            <p className="text-xs leading-relaxed text-msk-ink/50">
              Le gabarit sera créé en <strong>brouillon</strong> — il faudra le
              publier depuis sa fiche pour qu’il puisse générer un document
              officiel.
            </p>
          </div>
        ) : null}

        <FieldError>{error}</FieldError>
        <p className="text-center text-[11px] text-msk-ink/35">
          Étape {step + 1} / {STEPS.length}
        </p>
      </div>
    </FormShell>
  );
}
