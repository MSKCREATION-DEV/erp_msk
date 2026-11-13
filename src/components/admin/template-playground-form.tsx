"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldHint, FieldLabel } from "@/components/ui/field-label";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";

type LogoAlign = "left" | "center" | "right";

type Props = {
  templateId: string;
  templateName: string;
  initialBodyText: string;
  signatureDefaultOff: boolean;
  editable: boolean;
};

export function TemplatePlaygroundForm({
  templateId,
  templateName,
  initialBodyText,
  signatureDefaultOff,
  editable,
}: Props) {
  const [headerTitle, setHeaderTitle] = useState(templateName);
  const [logoAlign, setLogoAlign] = useState<LogoAlign>("left");
  const [bodyText, setBodyText] = useState(initialBodyText);
  const [signaturePreview, setSignaturePreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const exemplaireGet = useMemo(
    () => `/api/administration/gabarits/${templateId}/exemplaire`,
    [templateId],
  );

  const refreshPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);

    try {
      const res = editable
        ? await fetch(`/api/administration/gabarits/${templateId}/exemplaire`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bodyText,
              headerTitle,
              logoAlign,
              signaturePreview,
            }),
          })
        : await fetch(
            `${exemplaireGet}${signaturePreview ? "?signature=1" : ""}`,
            { method: "GET" },
          );

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? `Aperçu impossible (${res.status})`);
      }
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur aperçu");
    } finally {
      setLoading(false);
    }
  }, [bodyText, editable, exemplaireGet, headerTitle, logoAlign, signaturePreview, templateId]);

  useEffect(() => {
    void refreshPreview();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial uniquement
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="grid w-full gap-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-5">
        <Surface className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-msk-ink">Réglages aperçu</h2>
            {editable ? (
              <Badge tone="success">Édition locale</Badge>
            ) : (
              <Badge tone="muted">Lecture seule</Badge>
            )}
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="pg-title">Titre d&apos;en-tête</FieldLabel>
            <Input
              id="pg-title"
              value={headerTitle}
              onChange={(e) => setHeaderTitle(e.target.value)}
              disabled={!editable}
              placeholder={templateName}
            />
            <FieldHint>Affiché sous le logo charte MSK.</FieldHint>
          </div>

          <div className="space-y-2">
            <FieldLabel>Position du logo</FieldLabel>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Position du logo">
              {(
                [
                  { value: "left" as const, label: "Gauche" },
                  { value: "center" as const, label: "Centré" },
                  { value: "right" as const, label: "Droite" },
                ] as const
              ).map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={logoAlign === opt.value ? "primary" : "secondary"}
                  disabled={!editable}
                  onClick={() => setLogoAlign(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {editable ? (
            <div className="space-y-2">
              <FieldLabel htmlFor="pg-body">Sections (DSL)</FieldLabel>
              <Textarea
                id="pg-body"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={16}
                className="font-mono text-xs"
              />
              <FieldHint>
                <code className="text-[11px]"># Titre</code> ·{" "}
                <code className="text-[11px]">{`> encadré`}</code> ·{" "}
                <code className="text-[11px]">---</code> · variables{" "}
                <code className="text-[11px]">{`{{slug}}`}</code>
              </FieldHint>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-msk-ink/55">
              Publiez une version Studio pour éditer le DSL ici. En attendant, aperçu et téléchargement
              d&apos;exemplaire restent disponibles.
            </p>
          )}

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-msk-ink/8 bg-msk-chalk/50 px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={signaturePreview}
              onChange={(e) => setSignaturePreview(e.target.checked)}
              className="h-4 w-4 rounded border-msk-ink/20 text-msk-blue focus:ring-msk-blue"
            />
            <span>
              Aperçu signature <strong>{signaturePreview ? "ON" : "OFF"}</strong>
              {signatureDefaultOff && !signaturePreview ? (
                <span className="block text-xs text-msk-ink/45">
                  Gabarit enregistré : OFF (règle absolue).
                </span>
              ) : null}
            </span>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" disabled={loading} onClick={() => void refreshPreview()}>
              {loading ? "Rafraîchissement…" : "Rafraîchir l’aperçu"}
            </Button>
            <Link
              href={`/administration/gabarits/${templateId}`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
            >
              Fiche gabarit
            </Link>
          </div>
          {error ? <p className="text-xs text-msk-coral">{error}</p> : null}
        </Surface>
      </div>

      <Surface className="overflow-hidden p-0 lg:col-span-7">
        {previewUrl ? (
          <iframe
            key={previewKey}
            title="Aperçu Playground"
            src={previewUrl}
            className="h-[min(80vh,48rem)] w-full border-0 bg-white"
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-msk-ink/45">
            {loading ? "Génération de l’aperçu…" : "Aucun aperçu"}
          </div>
        )}
      </Surface>
    </div>
  );
}
