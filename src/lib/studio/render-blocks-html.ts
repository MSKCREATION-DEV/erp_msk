/**
 * Preview HTML des gabarits `ENGINE_BLOCKS` — même DSL / blocs / variables
 * que `renderBlocksToPdf`. Utilisable côté client (Playground live).
 * Les blocs `composite` utilisent `compositeHtmlModel` quand un payload
 * exemplaire est fourni (même source que le PDF métier).
 */
import { company } from "@/lib/company";
import type { CompositeRenderer } from "@/lib/studio/composite";
import {
  compositeHtmlModel,
  type CompositeHtmlModel,
} from "@/lib/studio/composite-html-model";
import type { OfficialPdfPayload } from "@/lib/studio/official-payload";
import type { TemplateBlock } from "@/lib/studio/types";
import { resolveTemplateString } from "@/lib/studio/variables";

export type RenderBlocksHtmlOptions = {
  title: string;
  context: Record<string, unknown>;
  signatureEnabled: boolean;
  logoAlign?: "left" | "center" | "right";
  /** Affiche le chrome en-tête / pied (défaut true). */
  showChrome?: boolean;
  /** Payload exemplaire — régions composites fidèles au PDF. */
  compositePayload?: OfficialPdfPayload;
};

const COMPOSITE_LABELS: Record<CompositeRenderer, string> = {
  commercial_devis:
    "Tableau des prestations (désignation, qté, PU, montant) + totaux HT / TVA / TTC",
  commercial_facture:
    "Lignes facturées + TVA + totaux + mentions de règlement",
  commercial_contract: "Annexe prestations / BDC (lignes contrat)",
  rh_contract_travail: "Corps contrat de travail (DSL)",
  rh_contract_stage: "Corps contrat de stage (DSL)",
  rh_contract_presta: "Récap parties (Client / Prestataire)",
  rh_payslip: "Grille bulletin (brut, cotisations, net)",
};

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolve(
  text: string,
  context: Record<string, unknown>,
): string {
  return resolveTemplateString(text, context, { strict: false });
}

function alignClass(align: "left" | "center" | "right" | undefined): string {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function renderModelHtml(model: CompositeHtmlModel): string {
  if (model.kind === "lines") {
    const head = model.headers
      .map((h) => `<th>${escapeHtml(h)}</th>`)
      .join("");
    const body = model.rows
      .map(
        (r) =>
          `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`,
      )
      .join("");
    return [
      `<table class="msk-sample-table" aria-label="Région composite">`,
      `<thead><tr>${head}</tr></thead>`,
      `<tbody>${body}</tbody>`,
      `</table>`,
      model.footer
        ? `<p class="msk-composite-footer">${escapeHtml(model.footer)}</p>`
        : "",
    ].join("");
  }
  if (model.kind === "kv") {
    return model.sections
      .map((sec) => {
        const rows = sec.rows
          .filter(([, v]) => v)
          .map(
            ([k, v]) =>
              `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`,
          )
          .join("");
        return [
          `<h3 class="msk-composite-sub">${escapeHtml(sec.title)}</h3>`,
          `<table class="msk-sample-table msk-kv-table"><tbody>${rows}</tbody></table>`,
        ].join("");
      })
      .join("");
  }
  const cotisRows = model.rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.rate)}</td><td>${escapeHtml(r.amount)}</td></tr>`,
    )
    .join("");
  return [
    `<table class="msk-sample-table" aria-label="Cotisations">`,
    `<thead><tr><th>Rubrique</th><th>Taux</th><th>Montant</th></tr></thead>`,
    `<tbody>`,
    `<tr><td>Salaire brut</td><td></td><td>${escapeHtml(model.brut)}</td></tr>`,
    cotisRows,
    `<tr><td colspan="2"><strong>Total charges</strong></td><td><strong>${escapeHtml(model.totalCotis)}</strong></td></tr>`,
    `<tr class="msk-net-row"><td colspan="2"><strong>Net à payer</strong></td><td><strong>${escapeHtml(model.net)}</strong></td></tr>`,
    `</tbody></table>`,
  ].join("");
}

function renderCompositeHtml(
  renderer: string,
  payload: OfficialPdfPayload | undefined,
): string {
  const label =
    (COMPOSITE_LABELS as Record<string, string>)[renderer] ??
    `Section composite « ${renderer} »`;
  const model = compositeHtmlModel(
    renderer as CompositeRenderer,
    payload,
  );
  return [
    `<section class="msk-composite" data-renderer="${escapeHtml(renderer)}">`,
    `<p class="msk-composite-kicker">Région métier · [[COMPOSITE: ${escapeHtml(renderer)}]]</p>`,
    `<p class="msk-composite-label">${escapeHtml(label)}</p>`,
    model
      ? renderModelHtml(model)
      : [
          `<table class="msk-sample-table" aria-label="Aperçu structurel">`,
          `<thead><tr><th>Désignation</th><th>Qté</th><th>PU</th><th>Montant</th></tr></thead>`,
          `<tbody>`,
          `<tr><td>Ligne d'exemple 1</td><td>1</td><td>—</td><td>—</td></tr>`,
          `<tr><td>Ligne d'exemple 2</td><td>1</td><td>—</td><td>—</td></tr>`,
          `</tbody></table>`,
          `<p class="msk-composite-hint">Chargez un exemplaire métier pour peupler cette région (mêmes données que le PDF).</p>`,
        ].join(""),
    `</section>`,
  ].join("");
}

function renderBlockHtml(
  block: TemplateBlock,
  context: Record<string, unknown>,
  signatureEnabled: boolean,
  compositePayload: OfficialPdfPayload | undefined,
): string {
  switch (block.kind) {
    case "heading":
      return `<h2 class="msk-doc-h">${escapeHtml(resolve(block.text, context))}</h2>`;
    case "paragraph":
      return `<p class="msk-doc-p">${escapeHtml(resolve(block.text, context))}</p>`;
    case "highlight":
      return `<blockquote class="msk-doc-hl">${escapeHtml(resolve(block.text, context))}</blockquote>`;
    case "spacer":
      return `<div class="msk-doc-spacer" aria-hidden="true"></div>`;
    case "signature":
      if (!signatureEnabled) {
        return `<p class="msk-doc-sig-off">Signature désactivée sur ce gabarit (aperçu OFF).</p>`;
      }
      return [
        `<div class="msk-doc-sig">`,
        `<div><strong>${escapeHtml(resolve(block.leftLabel, context))}</strong><div class="msk-sig-line"></div></div>`,
        `<div><strong>${escapeHtml(resolve(block.rightLabel, context))}</strong><div class="msk-sig-line"></div></div>`,
        `</div>`,
      ].join("");
    case "composite":
      return renderCompositeHtml(block.renderer, compositePayload);
    default:
      return "";
  }
}

/** Styles isolés injectés dans le conteneur preview (charte MSK, pas iframe). */
export const PLAYGROUND_PREVIEW_CSS = `
.msk-doc-sheet{font-family:Jost,system-ui,sans-serif;color:#0D1330;background:#fff;border:1px solid rgba(13,19,48,.08);border-radius:12px;overflow:hidden}
.msk-doc-chrome-header{padding:1.25rem 1.5rem 1rem;background:linear-gradient(180deg,rgba(29,115,188,.06),#fff 70%);border-bottom:1px solid rgba(13,19,48,.06)}
.msk-doc-tagline{font-size:11px;color:rgba(13,19,48,.45);font-style:italic;margin:0 0 .35rem}
.msk-doc-brand{font-size:13px;font-weight:700;color:#1D73BC;letter-spacing:.04em;text-transform:uppercase;margin:0}
.msk-doc-title{font-size:1.15rem;font-weight:700;margin:.65rem 0 0;color:#0D1330}
.msk-doc-body{padding:1.25rem 1.5rem 1.5rem;min-height:12rem}
.msk-doc-h{font-size:.95rem;font-weight:700;margin:1.1rem 0 .45rem;padding-bottom:.3rem;border-bottom:2px solid #1D73BC;color:#0D1330}
.msk-doc-h:first-child{margin-top:0}
.msk-doc-p{font-size:.8125rem;line-height:1.55;margin:0 0 .65rem;color:rgba(13,19,48,.78);white-space:pre-wrap}
.msk-doc-hl{margin:.75rem 0;padding:.75rem 1rem;background:rgba(29,115,188,.06);border-left:3px solid #1D73BC;font-size:.8125rem;font-weight:600;color:#1D73BC;white-space:pre-wrap}
.msk-doc-spacer{height:.75rem}
.msk-doc-sig{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:1.75rem;font-size:.75rem}
.msk-sig-line{margin-top:2.5rem;border-bottom:1px solid rgba(13,19,48,.25);height:1px}
.msk-doc-sig-off{font-size:.75rem;color:rgba(13,19,48,.4);font-style:italic}
.msk-composite{margin:1rem 0;padding:1rem;border:1px dashed rgba(29,115,188,.35);border-radius:10px;background:rgba(29,115,188,.03)}
.msk-composite-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#1D73BC;font-weight:600;margin:0 0 .25rem}
.msk-composite-label{font-size:.8125rem;font-weight:600;margin:0 0 .75rem}
.msk-composite-sub{font-size:.75rem;font-weight:700;margin:.75rem 0 .35rem;color:#1D73BC}
.msk-sample-table{width:100%;border-collapse:collapse;font-size:.75rem;margin-bottom:.5rem}
.msk-sample-table th{background:#1D73BC;color:#fff;text-align:left;padding:.4rem .5rem;font-weight:600}
.msk-sample-table td{border-bottom:1px solid rgba(13,19,48,.08);padding:.4rem .5rem}
.msk-kv-table th{background:transparent;color:rgba(13,19,48,.55);font-weight:600;width:9rem}
.msk-composite-footer{font-size:11px;font-weight:600;color:#1D73BC;margin:.35rem 0 0}
.msk-composite-hint{font-size:11px;color:rgba(13,19,48,.45);margin:0}
.msk-net-row td{background:rgba(29,115,188,.06);color:#1D73BC}
.msk-doc-chrome-footer{padding:.85rem 1.5rem 1rem;border-top:1px dashed rgba(29,115,188,.35);background:#F5F3EF;text-align:center;font-size:10px;line-height:1.45;color:rgba(13,19,48,.55)}
.text-left{text-align:left}.text-center{text-align:center}.text-right{text-align:right}
`.trim();

/**
 * Rend les blocs en HTML (feuille A4-like) — source de vérité Playground.
 */
export function renderBlocksToHtml(
  blocks: TemplateBlock[],
  opts: RenderBlocksHtmlOptions,
): string {
  const showChrome = opts.showChrome !== false;
  const align = alignClass(opts.logoAlign);
  const body = blocks
    .map((b) =>
      renderBlockHtml(
        b,
        opts.context,
        opts.signatureEnabled,
        opts.compositePayload,
      ),
    )
    .join("\n");

  const header = showChrome
    ? [
        `<header class="msk-doc-chrome-header ${align}">`,
        `<p class="msk-doc-brand">${escapeHtml(company.legalName)}</p>`,
        `<p class="msk-doc-tagline">${escapeHtml(company.tagline)}</p>`,
        `<h1 class="msk-doc-title">${escapeHtml(opts.title)}</h1>`,
        `</header>`,
      ].join("")
    : "";

  const footer = showChrome
    ? [
        `<footer class="msk-doc-chrome-footer">`,
        `<div>Adresse : ${escapeHtml(company.addressOneLine)}</div>`,
        `<div>NIF : ${escapeHtml(company.fiscalId)} · ${escapeHtml(company.email)} · ${escapeHtml(company.phones)}</div>`,
        `<div>PUBLIC — ${escapeHtml(company.legalName)}</div>`,
        `</footer>`,
      ].join("")
    : "";

  return [
    `<article class="msk-doc-sheet" data-msk-preview="1">`,
    header,
    `<div class="msk-doc-body">${body || `<p class="msk-doc-p">Aucun contenu — saisissez le DSL à gauche.</p>`}</div>`,
    footer,
    `</article>`,
  ].join("");
}
