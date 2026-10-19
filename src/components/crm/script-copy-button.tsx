"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FieldLabel } from "@/components/ui/field-label";
import {
  fillScriptTemplate,
  SCRIPT_VAR_KEYS,
  SCRIPT_VAR_LABELS,
  type ScriptVars,
} from "@/lib/crm/script-vars";

export type ScriptCopyDefaults = ScriptVars;

const PRIMARY_FIELDS: (keyof ScriptVars)[] = [
  "prenom",
  "commercial",
  "entreprise",
  "secteur",
  "offre",
  "ville",
];

const EXTRA_FIELDS: (keyof ScriptVars)[] = [
  "resultat",
  "source",
  "jour",
  "exemple",
  "date",
  "montant",
];

export function ScriptCopyButton({
  text,
  title,
  defaults,
  autoOpen = false,
}: {
  text: string;
  title?: string;
  defaults?: ScriptCopyDefaults;
  /** Ouvre le modal au montage (ex. deep-link depuis fiche prospect). */
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [ok, setOk] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [vars, setVars] = useState<ScriptVars>(() => ({
    prenom: defaults?.prenom ?? "",
    commercial: defaults?.commercial ?? "",
    entreprise: defaults?.entreprise ?? "",
    secteur: defaults?.secteur ?? "",
    ville: defaults?.ville ?? "Bamako",
    resultat: defaults?.resultat ?? "",
    source: defaults?.source ?? "",
    jour: defaults?.jour ?? "",
    offre: defaults?.offre ?? "",
    exemple: defaults?.exemple ?? "",
    date: defaults?.date ?? "",
    montant: defaults?.montant ?? "",
  }));

  const preview = useMemo(
    () => fillScriptTemplate(text, vars),
    [text, vars],
  );

  function setField(key: keyof ScriptVars, value: string) {
    setVars((v) => ({ ...v, [key]: value }));
  }

  async function copyFilled() {
    await navigator.clipboard.writeText(preview);
    setOk(true);
    setTimeout(() => setOk(false), 1800);
  }

  const fields = showExtra
    ? [...PRIMARY_FIELDS, ...EXTRA_FIELDS]
    : PRIMARY_FIELDS;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        {ok ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden />
            Copié
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            Copier
          </>
        )}
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={title ? `Copier — ${title}` : "Copier le script"}
        description="Renseignez les variables, vérifiez l’aperçu, puis copiez."
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Fermer
            </Button>
            <Button type="button" onClick={() => void copyFilled()}>
              {ok ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden />
                  Copier le texte
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((key) => (
              <div key={key}>
                <FieldLabel htmlFor={`sc-${key}`}>
                  {SCRIPT_VAR_LABELS[key]}
                </FieldLabel>
                <Input
                  id={`sc-${key}`}
                  value={vars[key] ?? ""}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={`{{${key}}}`}
                  className="h-9"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="text-xs font-medium text-msk-blue hover:underline"
            onClick={() => setShowExtra((v) => !v)}
          >
            {showExtra
              ? "Masquer les champs avancés"
              : "Plus de variables (jour, montant, exemple…)"}
          </button>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-msk-ink/40">
              Aperçu
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-msk-ink/8 bg-white p-4 text-sm leading-relaxed text-msk-ink/85">
              {preview}
            </pre>
            <p className="mt-2 text-[11px] text-msk-ink/40">
              Variables reconnues :{" "}
              {SCRIPT_VAR_KEYS.map((k) => `{{${k}}}`).join(", ")}
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
