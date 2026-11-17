"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldHint, FieldLabel } from "@/components/ui/field-label";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { textToBlocks } from "@/lib/studio/dsl";
import {
  PLAYGROUND_PREVIEW_CSS,
  renderBlocksToHtml,
} from "@/lib/studio/render-blocks-html";
import type { OfficialPdfPayload } from "@/lib/studio/official-payload";
import {
  applyVariableOverrides,
  extractVariableSlugs,
} from "@/lib/studio/variables";

type LogoAlign = "left" | "center" | "right";

export type PlaygroundVariableDef = {
  slug: string;
  label: string;
  sampleValue: string | null;
};

type TabId = "variables" | "dsl" | "mise_en_page" | "structure";

type Props = {
  templateId: string;
  templateName: string;
  templateCode: string;
  initialBodyText: string;
  signatureDefaultOff: boolean;
  editable: boolean;
  variableDefs: PlaygroundVariableDef[];
  hasComposite: boolean;
  /** Exemplaire métier — peuplent les régions `[[COMPOSITE]]` HTML = PDF. */
  samplePayload?: OfficialPdfPayload;
};

function detectComposite(body: string): boolean {
  return /\[\[COMPOSITE:\s*[a-z0-9_]+\s*\]\]/i.test(body);
}

function sectionOutline(body: string): string[] {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("# "))
    .map((l) => l.slice(2).trim());
}

export function TemplatePlaygroundForm({
  templateId,
  templateName,
  templateCode,
  initialBodyText,
  signatureDefaultOff,
  editable,
  variableDefs,
  hasComposite: initialHasComposite,
  samplePayload,
}: Props) {
  const [tab, setTab] = useState<TabId>("variables");
  const [headerTitle, setHeaderTitle] = useState(templateName);
  const [logoAlign, setLogoAlign] = useState<LogoAlign>("left");
  const [bodyText, setBodyText] = useState(initialBodyText);
  const [signaturePreview, setSignaturePreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [lastPdfAt, setLastPdfAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const initialVars = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of variableDefs) {
      map[d.slug] = d.sampleValue ?? "";
    }
    return map;
  }, [variableDefs]);

  const [variables, setVariables] = useState<Record<string, string>>(initialVars);
  const pdfUrlRef = useRef<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const activeSlugs = useMemo(() => extractVariableSlugs(bodyText), [bodyText]);
  const hasComposite = useMemo(
    () => detectComposite(bodyText) || initialHasComposite,
    [bodyText, initialHasComposite],
  );
  const headings = useMemo(() => sectionOutline(bodyText), [bodyText]);

  const visibleDefs = useMemo(() => {
    const bySlug = new Map(variableDefs.map((d) => [d.slug, d]));
    const ordered: PlaygroundVariableDef[] = [];
    for (const slug of activeSlugs) {
      ordered.push(
        bySlug.get(slug) ?? { slug, label: slug, sampleValue: variables[slug] ?? "" },
      );
    }
    for (const d of variableDefs) {
      if (!activeSlugs.includes(d.slug)) ordered.push(d);
    }
    return ordered;
  }, [activeSlugs, variableDefs, variables]);

  const htmlPreview = useMemo(() => {
    const blocks = textToBlocks(bodyText);
    const context = applyVariableOverrides({}, variables);
    return renderBlocksToHtml(blocks, {
      title: headerTitle || templateName,
      context,
      signatureEnabled: signaturePreview,
      logoAlign,
      compositePayload: samplePayload,
    });
  }, [
    bodyText,
    variables,
    headerTitle,
    templateName,
    signaturePreview,
    logoAlign,
    samplePayload,
  ]);

  const markDirty = useCallback(() => setDirty(true), []);

  const revokePdf = useCallback(() => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
    setPdfUrl(null);
  }, []);

  useEffect(() => () => revokePdf(), [revokePdf]);

  const insertSlug = (slug: string) => {
    if (!editable) return;
    const el = bodyRef.current;
    const token = `{{${slug}}}`;
    if (!el) {
      setBodyText((prev) => `${prev}${prev.endsWith("\n") ? "" : "\n"}${token}`);
      markDirty();
      setTab("dsl");
      return;
    }
    const start = el.selectionStart ?? bodyText.length;
    const end = el.selectionEnd ?? start;
    const next = bodyText.slice(0, start) + token + bodyText.slice(end);
    setBodyText(next);
    markDirty();
    setTab("dsl");
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const resetAll = () => {
    setBodyText(initialBodyText);
    setHeaderTitle(templateName);
    setLogoAlign("left");
    setSignaturePreview(false);
    setVariables(initialVars);
    setDirty(false);
    setError(null);
    revokePdf();
    setPdfOpen(false);
  };

  const generatePdf = async () => {
    setPdfLoading(true);
    setError(null);
    try {
      const slugs = extractVariableSlugs(bodyText);
      const overrides: Record<string, string> = {};
      for (const slug of slugs) {
        if (slug in variables) overrides[slug] = variables[slug];
      }

      const res = editable
        ? await fetch(`/api/administration/gabarits/${templateId}/exemplaire`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bodyText,
              headerTitle,
              logoAlign,
              signaturePreview,
              variableOverrides: overrides,
            }),
          })
        : await fetch(
            `/api/administration/gabarits/${templateId}/exemplaire${
              signaturePreview ? "?signature=1" : ""
            }`,
            { method: "GET" },
          );

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? `Erreur PDF (${res.status})`);
      }
      const blob = await res.blob();
      revokePdf();
      const url = URL.createObjectURL(blob);
      pdfUrlRef.current = url;
      setPdfUrl(url);
      setPdfOpen(true);
      setLastPdfAt(
        new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Génération PDF impossible");
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `playground_${templateCode.replace(/[^a-z0-9_-]+/gi, "_")}.pdf`;
    a.click();
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "variables", label: "Données test" },
    { id: "dsl", label: "Contenu DSL" },
    { id: "structure", label: "Structure" },
    { id: "mise_en_page", label: "Mise en page" },
  ];

  return (
    <div className="grid w-full gap-4 lg:grid-cols-12 lg:items-start">
      <div className="space-y-3 lg:col-span-5">
        <Surface className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-msk-ink">Studio Playground</h2>
            {editable ? (
              <Badge tone="success">Édition locale</Badge>
            ) : (
              <Badge tone="muted">Lecture seule</Badge>
            )}
            {hasComposite ? <Badge tone="blue">Composite métier</Badge> : null}
            {dirty ? <Badge tone="muted">Modifié</Badge> : null}
          </div>
          <p className="text-xs leading-relaxed text-msk-ink/55">
            Prévisualisation HTML live (même DSL / variables que le PDF). Les changements ne sont{" "}
            <strong className="font-medium text-msk-ink/70">pas enregistrés</strong> — publiez depuis
            l&apos;éditeur pour persister.
          </p>
          {hasComposite ? (
            <p className="rounded-lg border border-msk-blue/15 bg-msk-blue/4 px-3 py-2 text-xs leading-relaxed text-msk-ink/70">
              Région <code className="text-[11px]">[[COMPOSITE]]</code> : tableau / grille métier
              rendu dans le même pipeline que le PDF officiel (DSL + région). HTML live et PDF à
              la demande partagent cette source.
            </p>
          ) : null}

          <div
            className="flex flex-wrap gap-1 border-b border-msk-ink/8 pb-2"
            role="tablist"
            aria-label="Sections Playground"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? "bg-msk-blue text-white"
                    : "text-msk-ink/60 hover:bg-msk-chalk hover:text-msk-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "variables" ? (
            <div className="space-y-3" role="tabpanel">
              <div className="flex items-baseline justify-between gap-2">
                <FieldLabel>Variables du document</FieldLabel>
                <span className="text-[11px] text-msk-ink/45">
                  {activeSlugs.length} active{activeSlugs.length > 1 ? "s" : ""}
                </span>
              </div>
              {visibleDefs.length === 0 ? (
                <p className="text-xs text-msk-ink/45">
                  Aucune variable <code className="text-[11px]">{`{{slug}}`}</code> dans le corps.
                </p>
              ) : (
                <ul className="max-h-[min(56vh,32rem)] space-y-3 overflow-y-auto pr-1">
                  {visibleDefs.map((d) => {
                    const active = activeSlugs.includes(d.slug);
                    return (
                      <li key={d.slug} className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <FieldLabel htmlFor={`pg-var-${d.slug}`}>
                            {d.label}
                            {!active ? (
                              <span className="ml-1 text-[10px] font-normal text-msk-ink/40">
                                (hors corps)
                              </span>
                            ) : null}
                          </FieldLabel>
                          {editable ? (
                            <button
                              type="button"
                              className="text-[11px] font-medium text-msk-blue hover:underline"
                              onClick={() => insertSlug(d.slug)}
                            >
                              Insérer
                            </button>
                          ) : null}
                        </div>
                        <Input
                          id={`pg-var-${d.slug}`}
                          value={variables[d.slug] ?? ""}
                          disabled={!editable}
                          placeholder={d.sampleValue ?? d.slug}
                          onChange={(e) => {
                            const v = e.target.value;
                            setVariables((prev) => ({ ...prev, [d.slug]: v }));
                            markDirty();
                          }}
                        />
                        <p className="font-mono text-[10px] text-msk-ink/40">{`{{${d.slug}}}`}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <FieldHint>
                Formulaire type Documentero / test data PDFMonkey : chaque champ met à jour la
                visionneuse HTML immédiatement.
              </FieldHint>
            </div>
          ) : null}

          {tab === "dsl" ? (
            <div className="space-y-2" role="tabpanel">
              {editable ? (
                <>
                  <FieldLabel htmlFor="pg-body">Sections (DSL)</FieldLabel>
                  <Textarea
                    id="pg-body"
                    ref={bodyRef}
                    value={bodyText}
                    onChange={(e) => {
                      setBodyText(e.target.value);
                      markDirty();
                    }}
                    rows={22}
                    className="min-h-80 font-mono text-xs"
                    spellCheck={false}
                  />
                  <FieldHint>
                    <code className="text-[11px]"># Titre</code> ·{" "}
                    <code className="text-[11px]">{`> encadré`}</code> ·{" "}
                    <code className="text-[11px]">---</code> ·{" "}
                    <code className="text-[11px]">{`{{slug}}`}</code> ·{" "}
                    <code className="text-[11px]">[[SIGNATURE: G | D]]</code> ·{" "}
                    <code className="text-[11px]">[[COMPOSITE:…]]</code>
                  </FieldHint>
                </>
              ) : (
                <p className="text-xs leading-relaxed text-msk-ink/55">
                  Publiez une version Studio pour éditer le DSL ici.
                </p>
              )}
            </div>
          ) : null}

          {tab === "structure" ? (
            <div className="space-y-3" role="tabpanel">
              <FieldLabel>Plan du document ({headings.length} titres)</FieldLabel>
              {headings.length === 0 ? (
                <p className="text-xs text-msk-ink/45">Aucun titre <code>#</code> détecté.</p>
              ) : (
                <ol className="max-h-[min(52vh,28rem)] list-decimal space-y-1.5 overflow-y-auto pl-5 text-xs text-msk-ink/75">
                  {headings.map((h, i) => (
                    <li key={`${i}-${h}`}>{h}</li>
                  ))}
                </ol>
              )}
              <FieldHint>
                En-tête logo / tagline et pied légal MSK sont toujours rendus (chrome document) —
                alignés PDF.
              </FieldHint>
            </div>
          ) : null}

          {tab === "mise_en_page" ? (
            <div className="space-y-4" role="tabpanel">
              <div className="space-y-2">
                <FieldLabel htmlFor="pg-title">Titre d&apos;en-tête</FieldLabel>
                <Input
                  id="pg-title"
                  value={headerTitle}
                  onChange={(e) => {
                    setHeaderTitle(e.target.value);
                    markDirty();
                  }}
                  disabled={!editable}
                  placeholder={templateName}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Position du logo / marque</FieldLabel>
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
                      onClick={() => {
                        setLogoAlign(opt.value);
                        markDirty();
                      }}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-msk-ink/8 bg-msk-chalk/50 px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={signaturePreview}
                  onChange={(e) => {
                    setSignaturePreview(e.target.checked);
                    markDirty();
                  }}
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
            </div>
          ) : null}

          {error ? <p className="text-xs text-msk-coral">{error}</p> : null}
        </Surface>

        <Surface className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 border border-msk-ink/8 bg-white/95 p-3 shadow-sm backdrop-blur">
          <Button type="button" disabled={pdfLoading} onClick={() => void generatePdf()}>
            {pdfLoading ? "PDF…" : "Voir le PDF"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!pdfUrl || pdfLoading}
            onClick={downloadPdf}
          >
            Télécharger PDF
          </Button>
          <Button type="button" variant="secondary" disabled={pdfLoading} onClick={resetAll}>
            Réinitialiser
          </Button>
          <Link
            href={`/administration/gabarits/${templateId}`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
          >
            Fiche gabarit
          </Link>
          <span className="ml-auto text-[11px] text-msk-ink/40">
            {pdfLoading
              ? "Génération PDF…"
              : lastPdfAt
                ? `PDF ${lastPdfAt}`
                : "HTML live · PDF à la demande"}
          </span>
        </Surface>
      </div>

      <div className="lg:col-span-7 lg:sticky lg:top-4">
        <Surface className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b border-msk-ink/6 bg-msk-chalk/60 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-msk-ink">{templateName}</p>
              <p className="truncate font-mono text-[11px] text-msk-ink/45">{templateCode}</p>
            </div>
            <Badge tone="success">Preview HTML</Badge>
          </div>
          <div className="max-h-[min(85vh,52rem)] overflow-y-auto bg-msk-chalk/40 p-3 sm:p-4">
            <style dangerouslySetInnerHTML={{ __html: PLAYGROUND_PREVIEW_CSS }} />
            <div
              className="msk-playground-html"
              // Contenu issu du DSL résolu — pas de HTML utilisateur brut.
              dangerouslySetInnerHTML={{ __html: htmlPreview }}
            />
          </div>
        </Surface>
      </div>

      {pdfOpen && pdfUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-msk-ink/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu PDF"
          onClick={() => setPdfOpen(false)}
        >
          <div
            className="flex h-[min(90vh,52rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-msk-ink/8 px-4 py-3">
              <p className="text-sm font-semibold text-msk-ink">PDF — mêmes mods que la preview</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={downloadPdf}>
                  Télécharger
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setPdfOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
            <iframe title="PDF Playground" src={pdfUrl} className="min-h-0 flex-1 w-full border-0" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
