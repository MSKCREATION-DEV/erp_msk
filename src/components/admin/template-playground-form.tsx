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
import {
  defaultDocumentChrome,
  mergeDocumentChrome,
  type DocAlign,
  type DocumentChrome,
} from "@/lib/studio/document-chrome";
import { updateTemplateChromeAction } from "@/actions/studio-templates";
import type { CharteLogoOption } from "@/lib/studio/charte-logo-types";
import { usePendingAction } from "@/hooks/use-pending-action";

export type PlaygroundVariableDef = {
  slug: string;
  label: string;
  sampleValue: string | null;
};

type TabId = "variables" | "dsl" | "structure" | "chrome";

type Props = {
  templateId: string;
  templateName: string;
  templateCode: string;
  initialBodyText: string;
  signatureDefaultOff: boolean;
  editable: boolean;
  variableDefs: PlaygroundVariableDef[];
  hasComposite: boolean;
  samplePayload?: OfficialPdfPayload;
  initialChrome: DocumentChrome;
  charteLogos: CharteLogoOption[];
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

const BLOCK_SNIPPETS: { label: string; insert: string }[] = [
  { label: "Titre section", insert: "\n# Nouvelle section\n\n" },
  { label: "Paragraphe", insert: "\nTexte du paragraphe…\n\n" },
  { label: "Encadré", insert: "\n> Point d’attention\n\n" },
  { label: "Espace", insert: "\n---\n\n" },
  { label: "Signature", insert: "\n[[SIGNATURE: Employeur | Collaborateur]]\n\n" },
  {
    label: "Composite devis",
    insert: "\n[[COMPOSITE: commercial_devis]]\n\n",
  },
];

function AlignButtons({
  value,
  onChange,
  disabled,
  label,
}: {
  value: DocAlign;
  onChange: (v: DocAlign) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
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
            variant={value === opt.value ? "primary" : "secondary"}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
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
  initialChrome,
  charteLogos,
}: Props) {
  const [tab, setTab] = useState<TabId>("chrome");
  const [chrome, setChrome] = useState<DocumentChrome>(() =>
    mergeDocumentChrome(defaultDocumentChrome(), initialChrome),
  );
  const [headerTitle, setHeaderTitle] = useState(
    initialChrome.headerTitle?.trim() || templateName,
  );
  const [bodyText, setBodyText] = useState(initialBodyText);
  const [signaturePreview, setSignaturePreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [lastPdfAt, setLastPdfAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const { pending: savePending, run: runSave } = usePendingAction();

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

  const selectedLogo = useMemo(() => {
    if (!chrome.logoId) {
      return charteLogos.find((l) => l.isDefaultDocuments) ?? charteLogos[0] ?? null;
    }
    return charteLogos.find((l) => l.id === chrome.logoId) ?? null;
  }, [chrome.logoId, charteLogos]);

  const logoPreviewUrl = selectedLogo?.previewUrl ?? null;

  const liveChrome = useMemo(
    () =>
      mergeDocumentChrome(chrome, {
        headerTitle,
      }),
    [chrome, headerTitle],
  );

  const htmlPreview = useMemo(() => {
    const blocks = textToBlocks(bodyText);
    const context = applyVariableOverrides({}, variables);
    return renderBlocksToHtml(blocks, {
      title: headerTitle || templateName,
      context,
      signatureEnabled: signaturePreview,
      chrome: liveChrome,
      logoPreviewUrl,
      compositePayload: samplePayload,
    });
  }, [
    bodyText,
    variables,
    headerTitle,
    templateName,
    signaturePreview,
    liveChrome,
    logoPreviewUrl,
    samplePayload,
  ]);

  const markDirty = useCallback(() => {
    setDirty(true);
    setSaveMsg(null);
  }, []);

  const patchChrome = useCallback(
    (patch: Partial<DocumentChrome>) => {
      setChrome((prev) => mergeDocumentChrome(prev, patch));
      markDirty();
    },
    [markDirty],
  );

  const revokePdf = useCallback(() => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
    setPdfUrl(null);
  }, []);

  useEffect(() => () => revokePdf(), [revokePdf]);

  const insertAtCursor = (snippet: string) => {
    if (!editable) return;
    const el = bodyRef.current;
    if (!el) {
      setBodyText((prev) => `${prev}${snippet}`);
      markDirty();
      setTab("dsl");
      return;
    }
    const start = el.selectionStart ?? bodyText.length;
    const end = el.selectionEnd ?? start;
    const next = bodyText.slice(0, start) + snippet + bodyText.slice(end);
    setBodyText(next);
    markDirty();
    setTab("dsl");
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const insertSlug = (slug: string) => insertAtCursor(`{{${slug}}}`);

  const resetAll = () => {
    setBodyText(initialBodyText);
    setChrome(mergeDocumentChrome(defaultDocumentChrome(), initialChrome));
    setHeaderTitle(initialChrome.headerTitle?.trim() || templateName);
    setSignaturePreview(false);
    setVariables(initialVars);
    setDirty(false);
    setError(null);
    setSaveMsg(null);
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

      const chromePayload = {
        ...liveChrome,
        headerTitle,
      };

      const res = editable
        ? await fetch(`/api/administration/gabarits/${templateId}/exemplaire`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bodyText,
              headerTitle,
              logoAlign: chrome.logoAlign,
              chrome: chromePayload,
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

  const saveChrome = () => {
    if (!editable) return;
    setError(null);
    setSaveMsg(null);
    const fd = new FormData();
    fd.set("templateId", templateId);
    fd.set(
      "chromeJson",
      JSON.stringify({
        ...liveChrome,
        headerTitle,
      }),
    );
    void runSave(async () => {
      const result = await updateTemplateChromeAction(null, fd);
      if (!result.ok) {
        setError(result.error ?? "Enregistrement impossible");
        return;
      }
      setSaveMsg(result.message ?? "Mise en page enregistrée");
      setDirty(false);
    });
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "chrome", label: "Chrome" },
    { id: "variables", label: "Données test" },
    { id: "dsl", label: "Contenu DSL" },
    { id: "structure", label: "Structure" },
  ];

  const panelClass = (id: TabId) =>
    tab === id ? "space-y-3" : "hidden";

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
            Preview HTML live = même chrome / DSL / variables que le PDF. Enregistrez le{" "}
            <strong className="font-medium text-msk-ink/70">chrome</strong> pour le
            publier sur le gabarit ; le corps DSL se publie depuis l&apos;éditeur fiche.
          </p>
          {hasComposite ? (
            <p className="rounded-lg border border-msk-blue/15 bg-msk-blue/4 px-3 py-2 text-xs leading-relaxed text-msk-ink/70">
              Région <code className="text-[11px]">[[COMPOSITE]]</code> : même pipeline
              HTML / PDF officiel (DSL + région).
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

          {/* Panels toujours montés (évite removeChild / autofill). */}
          <div
            className={panelClass("variables")}
            role="tabpanel"
            aria-hidden={tab !== "variables"}
            {...(tab !== "variables" ? { inert: true } : {})}
          >
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
                Chaque champ met à jour la visionneuse HTML immédiatement.
              </FieldHint>
          </div>

          <div
            className={panelClass("dsl")}
            role="tabpanel"
            aria-hidden={tab !== "dsl"}
            {...(tab !== "dsl" ? { inert: true } : {})}
          >
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

          <div
            className={panelClass("structure")}
            role="tabpanel"
            aria-hidden={tab !== "structure"}
            {...(tab !== "structure" ? { inert: true } : {})}
          >
              <FieldLabel>Plan du document ({headings.length} titres)</FieldLabel>
              {headings.length === 0 ? (
                <p className="text-xs text-msk-ink/45">
                  Aucun titre <code>#</code> détecté.
                </p>
              ) : (
                <ol className="max-h-[min(40vh,20rem)] list-decimal space-y-1.5 overflow-y-auto pl-5 text-xs text-msk-ink/75">
                  {headings.map((h, i) => (
                    <li key={`${i}-${h}`}>{h}</li>
                  ))}
                </ol>
              )}
              {editable ? (
                <div className="space-y-2">
                  <FieldLabel>Insérer un bloc</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {BLOCK_SNIPPETS.map((s) => (
                      <Button
                        key={s.label}
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => insertAtCursor(s.insert)}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                  <FieldHint>
                    Modularité DSL : chaque snippet ajoute un bloc à la position du curseur.
                  </FieldHint>
                </div>
              ) : null}
          </div>

          <div
            className={panelClass("chrome")}
            role="tabpanel"
            aria-hidden={tab !== "chrome"}
            {...(tab !== "chrome" ? { inert: true } : {})}
          >
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

              <div className="flex flex-wrap gap-3">
                {(
                  [
                    { key: "showHeader" as const, label: "En-tête" },
                    { key: "showFooter" as const, label: "Pied" },
                    { key: "showLogo" as const, label: "Logo" },
                    { key: "showTagline" as const, label: "Tagline" },
                    { key: "showBrandLabel" as const, label: "Marque texte" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-msk-ink/8 bg-msk-chalk/50 px-2.5 py-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={chrome[opt.key]}
                      disabled={!editable}
                      onChange={(e) => patchChrome({ [opt.key]: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-msk-ink/20 text-msk-blue focus:ring-msk-blue"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>

              <AlignButtons
                label="Alignement logo / marque"
                value={chrome.logoAlign}
                disabled={!editable}
                onChange={(logoAlign) => patchChrome({ logoAlign })}
              />
              <AlignButtons
                label="Alignement titre"
                value={chrome.titleAlign}
                disabled={!editable}
                onChange={(titleAlign) => patchChrome({ titleAlign })}
              />
              <AlignButtons
                label="Alignement pied"
                value={chrome.footerAlign}
                disabled={!editable}
                onChange={(footerAlign) => patchChrome({ footerAlign })}
              />

              <div className="space-y-2">
                <FieldLabel htmlFor="pg-brand">Libellé marque</FieldLabel>
                <Input
                  id="pg-brand"
                  value={chrome.brandLabel ?? ""}
                  onChange={(e) => patchChrome({ brandLabel: e.target.value })}
                  disabled={!editable}
                  placeholder="MSK CREATION"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="pg-tagline">Tagline</FieldLabel>
                <Input
                  id="pg-tagline"
                  value={chrome.tagline ?? ""}
                  onChange={(e) => patchChrome({ tagline: e.target.value })}
                  disabled={!editable}
                  placeholder="Agence de communication…"
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <FieldLabel>Logo Charte</FieldLabel>
                  <Link
                    href="/administration/charte/logos"
                    className="text-[11px] font-medium text-msk-blue hover:underline"
                  >
                    Gérer la Charte
                  </Link>
                </div>
                {charteLogos.length === 0 ? (
                  <p className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-xs text-msk-ink/70">
                    Aucun logo ACTIVE en Charte. Ajoutez-en un avant de le choisir sur un
                    document.
                  </p>
                ) : (
                  <ul className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                    <li>
                      <button
                        type="button"
                        disabled={!editable}
                        onClick={() => patchChrome({ logoId: null })}
                        className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] ${
                          !chrome.logoId
                            ? "border-msk-blue bg-msk-blue/6 text-msk-blue"
                            : "border-msk-ink/10 text-msk-ink/60 hover:bg-msk-chalk"
                        }`}
                      >
                        Défaut Charte
                      </button>
                    </li>
                    {charteLogos.map((logo) => {
                      const selected = chrome.logoId === logo.id;
                      return (
                        <li key={logo.id}>
                          <button
                            type="button"
                            disabled={!editable}
                            onClick={() => patchChrome({ logoId: logo.id })}
                            className={`flex h-full w-full flex-col items-center gap-1.5 rounded-lg border px-2 py-2 text-left ${
                              selected
                                ? "border-msk-blue bg-msk-blue/6"
                                : "border-msk-ink/10 hover:bg-msk-chalk"
                            }`}
                          >
                            {logo.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={logo.previewUrl}
                                alt=""
                                className="h-8 max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[10px] text-msk-ink/40">Aperçu N/A</span>
                            )}
                            <span className="line-clamp-2 text-center text-[10px] font-medium text-msk-ink/75">
                              {logo.label}
                              {logo.isDefaultDocuments ? " · défaut" : ""}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <FieldHint>
                  Seuls les logos ACTIVE de la Charte sont listés — pas de choix fantôme.
                </FieldHint>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="pg-footer">Pied de page (1 ligne = 1 entrée)</FieldLabel>
                <Textarea
                  id="pg-footer"
                  value={(chrome.footerLines ?? []).join("\n")}
                  onChange={(e) => {
                    const footerLines = e.target.value
                      .split("\n")
                      .map((l) => l.trimEnd())
                      .slice(0, 5);
                    patchChrome({ footerLines });
                  }}
                  rows={4}
                  className="font-mono text-xs"
                  disabled={!editable}
                  placeholder={"Adresse : …\nNIF : …\nPUBLIC — MSK CREATION"}
                />
                <FieldHint>Maximum 5 lignes. Vide → coordonnées légales MSK.</FieldHint>
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

              {editable ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={savePending || !dirty}
                  onClick={saveChrome}
                >
                  {savePending ? "Enregistrement…" : "Enregistrer le chrome"}
                </Button>
              ) : null}
              {saveMsg ? (
                <p className="text-xs text-msk-blue">{saveMsg}</p>
              ) : null}
          </div>

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
          <Button
            type="button"
            variant="secondary"
            disabled={pdfLoading || savePending}
            onClick={resetAll}
          >
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
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedLogo ? (
                <Badge tone="muted">{selectedLogo.label}</Badge>
              ) : null}
              <Badge tone="success">Preview HTML</Badge>
            </div>
          </div>
          <div className="max-h-[min(85vh,52rem)] overflow-y-auto bg-msk-chalk/40 p-3 sm:p-4">
            <style dangerouslySetInnerHTML={{ __html: PLAYGROUND_PREVIEW_CSS }} />
            <div
              className="msk-playground-html"
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
              <p className="text-sm font-semibold text-msk-ink">
                PDF — chrome + DSL synchronisés
              </p>
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
