"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldHint, FieldLabel } from "@/components/ui/field-label";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { extractVariableSlugs } from "@/lib/studio/variables";

type LogoAlign = "left" | "center" | "right";

export type PlaygroundVariableDef = {
  slug: string;
  label: string;
  sampleValue: string | null;
};

type TabId = "variables" | "dsl" | "mise_en_page";

type Props = {
  templateId: string;
  templateName: string;
  templateCode: string;
  initialBodyText: string;
  signatureDefaultOff: boolean;
  editable: boolean;
  /** Catalogue filtré sur les slugs du corps (+ extras connus). */
  variableDefs: PlaygroundVariableDef[];
  /** True si le corps publié contient un `[[COMPOSITE:…]]`. */
  hasComposite: boolean;
};

const DEBOUNCE_MS = 650;

function detectComposite(body: string): boolean {
  return /\[\[COMPOSITE:\s*[a-z0-9_]+\s*\]\]/i.test(body);
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
}: Props) {
  const [tab, setTab] = useState<TabId>("variables");
  const [headerTitle, setHeaderTitle] = useState(templateName);
  const [logoAlign, setLogoAlign] = useState<LogoAlign>("left");
  const [bodyText, setBodyText] = useState(initialBodyText);
  const [signaturePreview, setSignaturePreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const initialVars = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of variableDefs) {
      map[d.slug] = d.sampleValue ?? "";
    }
    return map;
  }, [variableDefs]);

  const [variables, setVariables] = useState<Record<string, string>>(initialVars);
  const previewUrlRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const activeSlugs = useMemo(() => extractVariableSlugs(bodyText), [bodyText]);
  const hasComposite = useMemo(
    () => detectComposite(bodyText) || initialHasComposite,
    [bodyText, initialHasComposite],
  );

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

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const refreshPreview = useCallback(
    async (snapshot?: {
      bodyText: string;
      headerTitle: string;
      logoAlign: LogoAlign;
      signaturePreview: boolean;
      variables: Record<string, string>;
    }) => {
      const reqId = ++requestIdRef.current;
      const snap = snapshot ?? {
        bodyText,
        headerTitle,
        logoAlign,
        signaturePreview,
        variables,
      };
      setLoading(true);
      setError(null);

      try {
        const slugs = extractVariableSlugs(snap.bodyText);
        const overrides: Record<string, string> = {};
        for (const slug of slugs) {
          if (slug in snap.variables) overrides[slug] = snap.variables[slug];
        }

        const res = editable
          ? await fetch(`/api/administration/gabarits/${templateId}/exemplaire`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bodyText: snap.bodyText,
                headerTitle: snap.headerTitle,
                logoAlign: snap.logoAlign,
                signaturePreview: snap.signaturePreview,
                variableOverrides: overrides,
              }),
            })
          : await fetch(
              `/api/administration/gabarits/${templateId}/exemplaire${
                snap.signaturePreview ? "?signature=1" : ""
              }`,
              { method: "GET" },
            );

        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(json?.error ?? `Aperçu impossible (${res.status})`);
        }
        const blob = await res.blob();
        if (reqId !== requestIdRef.current) return;

        revokePreview();
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        setPreviewKey((k) => k + 1);
        setLastGeneratedAt(
          new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
        setDirty(false);
      } catch (e) {
        if (reqId !== requestIdRef.current) return;
        setError(e instanceof Error ? e.message : "Erreur aperçu");
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    },
    [
      bodyText,
      editable,
      headerTitle,
      logoAlign,
      revokePreview,
      signaturePreview,
      templateId,
      variables,
    ],
  );

  const schedulePreview = useCallback(() => {
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refreshPreview();
    }, DEBOUNCE_MS);
  }, [refreshPreview]);

  useEffect(() => {
    void refreshPreview();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      revokePreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montage uniquement
  }, []);

  const insertSlug = (slug: string) => {
    const token = `{{${slug}}}`;
    const el = document.getElementById("pg-body") as HTMLTextAreaElement | null;
    if (!el || !editable) {
      setBodyText((t) => `${t}${t.endsWith("\n") || t.length === 0 ? "" : "\n"}${token}`);
      schedulePreview();
      setTab("dsl");
      return;
    }
    const start = el.selectionStart ?? bodyText.length;
    const end = el.selectionEnd ?? start;
    const next = bodyText.slice(0, start) + token + bodyText.slice(end);
    setBodyText(next);
    schedulePreview();
    setTab("dsl");
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const resetAll = () => {
    const nextVars = { ...initialVars };
    setHeaderTitle(templateName);
    setLogoAlign("left");
    setBodyText(initialBodyText);
    setSignaturePreview(false);
    setVariables(nextVars);
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void refreshPreview({
      bodyText: initialBodyText,
      headerTitle: templateName,
      logoAlign: "left",
      signaturePreview: false,
      variables: nextVars,
    });
  };

  const downloadPreview = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `playground_${templateCode.replace(/[^a-z0-9_-]+/gi, "_")}.pdf`;
    a.click();
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "variables", label: "Données test" },
    { id: "dsl", label: "Contenu DSL" },
    { id: "mise_en_page", label: "Mise en page" },
  ];

  return (
    <div className="grid w-full gap-4 lg:grid-cols-12 lg:items-start">
      {/* Panneau contrôle — Documentero form + PDFMonkey test data */}
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
            {dirty && !loading ? <Badge tone="muted">Modifié</Badge> : null}
          </div>
          <p className="text-xs leading-relaxed text-msk-ink/55">
            Aperçu réel (même moteur que la génération officielle). Les changements ne sont{" "}
            <strong className="font-medium text-msk-ink/70">pas enregistrés</strong> — publiez
            depuis l&apos;éditeur pour persister.
          </p>
          {hasComposite ? (
            <p className="rounded-lg border border-msk-blue/15 bg-msk-blue/4 px-3 py-2 text-xs leading-relaxed text-msk-ink/70">
              Ce gabarit inclut un bloc <code className="text-[11px]">[[COMPOSITE]]</code> : le PDF
              d&apos;aperçu utilise le générateur métier (tableaux / multipages) pour la fidélité
              charte. Les variables du bandeau DSL s&apos;appliquent surtout aux gabarits textuels
              (attestations, contrats RH, solde…).
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
                  Aucune variable <code className="text-[11px]">{`{{slug}}`}</code> détectée dans le
                  corps.
                </p>
              ) : (
                <ul className="max-h-[min(52vh,28rem)] space-y-3 overflow-y-auto pr-1">
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
                            schedulePreview();
                          }}
                        />
                        <p className="font-mono text-[10px] text-msk-ink/40">{`{{${d.slug}}}`}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <FieldHint>
                Inspiré Documentero (formulaire champs) et PDFMonkey (test data) : éditez les valeurs
                d&apos;exemple, l&apos;aperçu se met à jour.
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
                    value={bodyText}
                    onChange={(e) => {
                      setBodyText(e.target.value);
                      schedulePreview();
                    }}
                    rows={18}
                    className="min-h-64 font-mono text-xs"
                    spellCheck={false}
                  />
                  <FieldHint>
                    <code className="text-[11px]"># Titre</code> ·{" "}
                    <code className="text-[11px]">{`> encadré`}</code> ·{" "}
                    <code className="text-[11px]">---</code> ·{" "}
                    <code className="text-[11px]">{`{{slug}}`}</code> ·{" "}
                    <code className="text-[11px]">[[SIGNATURE: G | D]]</code>
                  </FieldHint>
                </>
              ) : (
                <p className="text-xs leading-relaxed text-msk-ink/55">
                  Publiez une version Studio pour éditer le DSL ici. Aperçu et téléchargement restent
                  disponibles.
                </p>
              )}
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
                    schedulePreview();
                  }}
                  disabled={!editable}
                  placeholder={templateName}
                />
                <FieldHint>Affiché sous le logo charte MSK (gabarits blocs).</FieldHint>
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
                      onClick={() => {
                        setLogoAlign(opt.value);
                        schedulePreview();
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
                    schedulePreview();
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
          <Button type="button" disabled={loading} onClick={() => void refreshPreview()}>
            {loading ? "Génération…" : "Rafraîchir"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!previewUrl || loading}
            onClick={downloadPreview}
          >
            Télécharger PDF
          </Button>
          <Button type="button" variant="secondary" disabled={loading} onClick={resetAll}>
            Réinitialiser
          </Button>
          <Link
            href={`/administration/gabarits/${templateId}`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
          >
            Fiche gabarit
          </Link>
          <span className="ml-auto text-[11px] text-msk-ink/40">
            {loading
              ? "En cours…"
              : lastGeneratedAt
                ? `Aperçu ${lastGeneratedAt}`
                : "En attente"}
          </span>
        </Surface>
      </div>

      {/* Preview sticky — PDFMonkey / Efalia aperçu réel */}
      <div className="lg:col-span-7 lg:sticky lg:top-4">
        <Surface className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b border-msk-ink/6 bg-msk-chalk/60 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-msk-ink">{templateName}</p>
              <p className="truncate font-mono text-[11px] text-msk-ink/45">{templateCode}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {loading ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-msk-blue">
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-msk-blue"
                    aria-hidden
                  />
                  Génération
                </span>
              ) : (
                <Badge tone="success">PDF réel</Badge>
              )}
            </div>
          </div>
          {previewUrl ? (
            <iframe
              key={previewKey}
              title="Aperçu Playground"
              src={previewUrl}
              className="h-[min(85vh,52rem)] w-full border-0 bg-white"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-msk-ink/45">
              {loading ? "Génération de l’aperçu…" : "Aucun aperçu"}
            </div>
          )}
        </Surface>
      </div>
    </div>
  );
}
