"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createDraftVersionAction } from "@/actions/studio-templates";
import { textToBlocks } from "@/lib/studio/dsl";
import { extractVariableSlugs } from "@/lib/studio/variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import { usePendingAction } from "@/hooks/use-pending-action";
import { failAction, reportActionSuccess } from "@/lib/toast/report";

/**
 * Édition d’un gabarit Studio — intention unique (réécrire le contenu),
 * donc mono-écran (règle `forms-stepper` : autorisé hors parcours multi-intention).
 * Crée toujours une **nouvelle version brouillon** — ne modifie jamais la
 * version publiée en place.
 */
export function TemplateEditForm({
  templateId,
  initialBodyText,
  knownVariableSlugs,
  nextVersion,
}: {
  templateId: string;
  initialBodyText: string;
  knownVariableSlugs: string[];
  nextVersion: number;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [bodyText, setBodyText] = useState(initialBodyText);
  const [changelog, setChangelog] = useState("");
  const [error, setError] = useState<string | null>(null);

  const knownSet = useMemo(() => new Set(knownVariableSlugs), [knownVariableSlugs]);
  const blocks = useMemo(() => textToBlocks(bodyText), [bodyText]);
  const slugs = useMemo(() => extractVariableSlugs(bodyText), [bodyText]);
  const unknownSlugs = slugs.filter((s) => !knownSet.has(s));

  function onSubmit() {
    setError(null);
    if (bodyText.trim().length < 10) {
      setError("Contenu trop court");
      return;
    }
    if (blocks.length === 0) {
      setError("Aucun bloc reconnu — vérifiez la syntaxe");
      return;
    }
    const fd = new FormData();
    fd.set("templateId", templateId);
    fd.set("bodyText", bodyText);
    if (changelog.trim()) fd.set("changelog", changelog.trim());
    void run(async () => {
      const res = await createDraftVersionAction(null, fd);
      if (failAction(res, setError, "Échec de l’enregistrement")) return;
      reportActionSuccess(res.message ?? "Brouillon enregistré");
      router.push(`/administration/gabarits/${templateId}`);
    });
  }

  return (
    <FormShell
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/administration/gabarits/${templateId}`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
          >
            Annuler
          </Link>
          <Button type="button" size="sm" disabled={pending} onClick={onSubmit}>
            {pending ? "Enregistrement…" : `Enregistrer en brouillon (v${nextVersion})`}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-msk-ink/60">
          L’enregistrement crée une <strong>nouvelle version brouillon</strong>{" "}
          (v{nextVersion}) — la version publiée actuelle continue de servir aux
          générations tant que vous ne publiez pas ce brouillon depuis la
          fiche du gabarit.
        </p>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FieldLabel htmlFor="tpl-body" required>
              Contenu du document
            </FieldLabel>
            <Textarea
              id="tpl-body"
              value={bodyText}
              disabled={pending}
              rows={18}
              className="font-mono text-xs leading-relaxed"
              onChange={(e) => setBodyText(e.target.value)}
            />
            <FieldHint>
              <code># Titre</code> · <code>&gt; encadré</code> · <code>---</code>{" "}
              (séparateur) · <code>[[SIGNATURE: Gauche | Droite]]</code> ·
              variables <code>{"{{slug}}"}</code>.
            </FieldHint>

            <div className="mt-4">
              <FieldLabel htmlFor="tpl-changelog">Note de version (optionnel)</FieldLabel>
              <Input
                id="tpl-changelog"
                value={changelog}
                disabled={pending}
                placeholder="Ex. Correction du libellé de l’objet"
                onChange={(e) => setChangelog(e.target.value)}
              />
            </div>
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
                      <Badge tone={knownSet.has(s) ? "success" : "coral"}>{`{{${s}}}`}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {unknownSlugs.length > 0 ? (
                <p className="mt-2 text-xs text-msk-coral">
                  Hors catalogue : {unknownSlugs.map((s) => `{{${s}}}`).join(", ")} —
                  ajoutez-les via{" "}
                  <Link href="/administration/gabarits/variables/nouveau" className="underline">
                    le catalogue de variables
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <FieldError>{error}</FieldError>
      </div>
    </FormShell>
  );
}
