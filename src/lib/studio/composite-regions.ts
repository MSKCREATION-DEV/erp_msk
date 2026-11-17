/**
 * Régions composites — tableaux / grilles rendus **dans** le flux
 * `renderBlocksToPdf` (Option A). Charte MSK alignée sur les générateurs
 * historiques ; le corps textuel reste le DSL.
 */
import { rgb } from "pdf-lib";
import { company } from "@/lib/company";
import type { CommercialPdfInput, ContractPdfInput } from "@/lib/pdf/commercial";
import {
  BLUE,
  draw,
  ensureSpace,
  LIGHT,
  MARGIN,
  MUTED,
  INK,
  type Ctx,
} from "@/lib/pdf/rh";
import type { RhContractPdfInput, RhPayslipInput } from "@/lib/pdf/rh";
import { formatDateFr, formatMoneyFr } from "@/lib/pdf/winansi";
import type { CompositeRenderer } from "@/lib/studio/composite";
import { SOCIAL_CONTRIBUTIONS } from "@/lib/studio/composite-html-model";
import type { OfficialPdfPayload } from "@/lib/studio/official-payload";

export { SOCIAL_CONTRIBUTIONS } from "@/lib/studio/composite-html-model";
export {
  compositeHtmlModel,
  type CompositeHtmlModel,
} from "@/lib/studio/composite-html-model";

const ROW_ALT = rgb(0.96, 0.97, 0.98);

const TOTAL_CONTRIBUTION_RATE = SOCIAL_CONTRIBUTIONS.reduce(
  (sum, c) => sum + c.rate,
  0,
);

function drawRight(
  ctx: Ctx,
  text: string,
  opts: { right: number; y: number; size: number; bold?: boolean },
) {
  const font = opts.bold ? ctx.fontBold : ctx.font;
  const t = text;
  const w = font.widthOfTextAtSize(
    // WinAnsi via draw() — largeur approx sur texte brut OK pour alignement
    t.replace(/[^\x00-\xff]/g, "?"),
    opts.size,
  );
  draw(ctx.page, t, {
    x: opts.right - w,
    y: opts.y,
    size: opts.size,
    font,
    color: INK,
  });
}

function drawKeyValueRegion(
  ctx: Ctx,
  heading: string,
  rows: Array<[string, string]>,
) {
  const visible = rows.filter(([, v]) => v && v.trim().length > 0);
  if (visible.length === 0) return;
  const tableW = ctx.width - MARGIN * 2;
  const labelW = 150;
  const rowH = 16;
  const headingH = 18;
  ensureSpace(ctx, headingH + visible.length * rowH + 10);

  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - headingH + 3,
    width: tableW,
    height: headingH,
    color: BLUE,
  });
  draw(ctx.page, heading, {
    x: MARGIN + 8,
    y: ctx.y - headingH + 8,
    size: 9,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  ctx.y -= headingH;

  visible.forEach(([label, value], i) => {
    const y0 = ctx.y - rowH + 4;
    if (i % 2 === 1) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: y0,
        width: tableW,
        height: rowH,
        color: LIGHT,
      });
    }
    draw(ctx.page, label, {
      x: MARGIN + 8,
      y: ctx.y - rowH + 9,
      size: 8.5,
      font: ctx.fontBold,
      color: INK,
    });
    draw(ctx.page, value, {
      x: MARGIN + labelW,
      y: ctx.y - rowH + 9,
      size: 8.5,
      font: ctx.font,
      color: INK,
      maxWidth: tableW - labelW - 10,
    });
    ctx.y -= rowH;
  });
  ctx.y -= 10;
}

function drawCommercialLinesRegion(
  ctx: Ctx,
  input: CommercialPdfInput,
  mode: "devis" | "facture",
) {
  const currency = input.currency ?? company.currency;
  const vatRate = input.vatRate ?? 18;
  const contentW = ctx.width - MARGIN * 2;
  const issued = input.issueDate ?? formatDateFr();

  if (mode === "devis") {
    const cols = {
      label: MARGIN,
      qty: MARGIN + 320,
      pu: MARGIN + 380,
      total: ctx.width - MARGIN,
    };
    ensureSpace(ctx, 40 + input.lines.length * 18 + 80);
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - 4,
      width: contentW,
      height: 20,
      color: BLUE,
    });
    draw(ctx.page, "PRESTATIONS", {
      x: cols.label + 8,
      y: ctx.y + 2,
      size: 8,
      font: ctx.fontBold,
      color: rgb(1, 1, 1),
    });
    draw(ctx.page, "QTE", {
      x: cols.qty,
      y: ctx.y + 2,
      size: 8,
      font: ctx.fontBold,
      color: rgb(1, 1, 1),
    });
    draw(ctx.page, "P.U.", {
      x: cols.pu,
      y: ctx.y + 2,
      size: 8,
      font: ctx.fontBold,
      color: rgb(1, 1, 1),
    });
    drawRight(ctx, "MONTANT", {
      right: cols.total - 8,
      y: ctx.y + 2,
      size: 8,
      bold: true,
    });
    // redraw header MONTANT in white
    {
      const label = "MONTANT";
      const w = ctx.fontBold.widthOfTextAtSize(label, 8);
      draw(ctx.page, label, {
        x: cols.total - 8 - w,
        y: ctx.y + 2,
        size: 8,
        font: ctx.fontBold,
        color: rgb(1, 1, 1),
      });
    }
    ctx.y -= 24;

    let ht = 0;
    input.lines.forEach((line, i) => {
      const lineTotal = line.qty * line.unitPrice;
      ht += lineTotal;
      if (i % 2 === 1) {
        ctx.page.drawRectangle({
          x: MARGIN,
          y: ctx.y - 4,
          width: contentW,
          height: 18,
          color: ROW_ALT,
        });
      }
      draw(ctx.page, line.label, {
        x: cols.label + 8,
        y: ctx.y,
        size: 9,
        font: ctx.font,
        color: INK,
        maxWidth: 300,
      });
      draw(ctx.page, String(line.qty), {
        x: cols.qty,
        y: ctx.y,
        size: 9,
        font: ctx.font,
      });
      draw(ctx.page, formatMoneyFr(line.unitPrice), {
        x: cols.pu,
        y: ctx.y,
        size: 9,
        font: ctx.font,
      });
      drawRight(ctx, `${formatMoneyFr(lineTotal)} ${currency}`, {
        right: cols.total - 8,
        y: ctx.y,
        size: 9,
        bold: true,
      });
      ctx.y -= 18;
    });

    ctx.y -= 8;
    const vat = Math.round(ht * (vatRate / 100));
    const ttc = ht + vat;
    const totalsX = ctx.width - MARGIN - 200;
    draw(ctx.page, "Total HT", {
      x: totalsX,
      y: ctx.y,
      size: 10,
      font: ctx.font,
    });
    drawRight(ctx, `${formatMoneyFr(ht)} ${currency}`, {
      right: ctx.width - MARGIN,
      y: ctx.y,
      size: 10,
    });
    ctx.y -= 14;
    draw(ctx.page, `TVA ${vatRate}%`, {
      x: totalsX,
      y: ctx.y,
      size: 10,
      font: ctx.font,
      color: MUTED,
    });
    drawRight(ctx, `${formatMoneyFr(vat)} ${currency}`, {
      right: ctx.width - MARGIN,
      y: ctx.y,
      size: 10,
    });
    ctx.y -= 10;
    ctx.page.drawRectangle({
      x: totalsX,
      y: ctx.y + 2,
      width: ctx.width - MARGIN - totalsX,
      height: 1.2,
      color: BLUE,
    });
    ctx.y -= 14;
    draw(ctx.page, "Total TTC", {
      x: totalsX,
      y: ctx.y,
      size: 11,
      font: ctx.fontBold,
      color: BLUE,
    });
    draw(ctx.page, `${formatMoneyFr(ttc)} ${currency}`, {
      x: totalsX + 90,
      y: ctx.y,
      size: 11,
      font: ctx.fontBold,
      color: BLUE,
    });
    ctx.y -= 28;
    return;
  }

  // Facture
  const c = {
    desc: MARGIN,
    date: MARGIN + 220,
    qty: MARGIN + 290,
    pu: MARGIN + 330,
    tva: MARGIN + 410,
    montant: ctx.width - MARGIN,
  };
  ensureSpace(ctx, 40 + input.lines.length * 28 + 90);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 4,
    width: contentW,
    height: 22,
    color: BLUE,
  });
  const headers: [string, number][] = [
    ["Description", c.desc + 6],
    ["Date", c.date],
    ["Qte", c.qty],
    ["P. Unitaire", c.pu],
    ["TVA", c.tva],
    ["Montant", c.montant - 50],
  ];
  for (const [label, x] of headers) {
    draw(ctx.page, label, {
      x,
      y: ctx.y + 2,
      size: 8,
      font: ctx.fontBold,
      color: rgb(1, 1, 1),
    });
  }
  ctx.y -= 26;

  let ht = 0;
  input.lines.forEach((line, i) => {
    const lineTotal = line.qty * line.unitPrice;
    ht += lineTotal;
    const rowH = 28;
    if (i % 2 === 1) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: ctx.y - 8,
        width: contentW,
        height: rowH,
        color: ROW_ALT,
      });
    }
    draw(ctx.page, line.label, {
      x: c.desc + 6,
      y: ctx.y,
      size: 8.5,
      font: ctx.fontOblique,
      color: INK,
      maxWidth: 200,
    });
    draw(ctx.page, line.date ?? issued, {
      x: c.date,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
    });
    draw(ctx.page, String(line.qty), {
      x: c.qty,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
    });
    draw(ctx.page, formatMoneyFr(line.unitPrice), {
      x: c.pu,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
    });
    draw(ctx.page, `${line.vatRate ?? vatRate}%`, {
      x: c.tva,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
    });
    drawRight(ctx, `${formatMoneyFr(lineTotal)} F`, {
      right: c.montant - 6,
      y: ctx.y,
      size: 9,
      bold: true,
    });
    ctx.y -= rowH;
  });

  ctx.y -= 12;
  const vat = Math.round(ht * (vatRate / 100));
  const ttc = ht + vat;
  draw(ctx.page, `IBAN : ${company.iban}`, {
    x: MARGIN,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
  });
  ctx.y -= 14;
  draw(ctx.page, `Montant Total a Payer : ${formatMoneyFr(ttc)} F CFA`, {
    x: MARGIN,
    y: ctx.y,
    size: 10,
    font: ctx.fontBold,
  });
  const tx = ctx.width - MARGIN - 180;
  let ty = ctx.y + 28;
  draw(ctx.page, "Total HT", { x: tx, y: ty, size: 10, font: ctx.font });
  drawRight(ctx, `${formatMoneyFr(ht)} ${currency}`, {
    right: ctx.width - MARGIN,
    y: ty,
    size: 10,
  });
  ty -= 14;
  draw(ctx.page, `TVA ${vatRate}%`, {
    x: tx,
    y: ty,
    size: 10,
    font: ctx.font,
    color: MUTED,
  });
  drawRight(ctx, `${formatMoneyFr(vat)} ${currency}`, {
    right: ctx.width - MARGIN,
    y: ty,
    size: 10,
  });
  ty -= 8;
  ctx.page.drawRectangle({
    x: tx,
    y: ty + 2,
    width: ctx.width - MARGIN - tx,
    height: 1.5,
    color: BLUE,
  });
  ty -= 14;
  draw(ctx.page, "Total TTC", {
    x: tx,
    y: ty,
    size: 11,
    font: ctx.fontBold,
    color: BLUE,
  });
  draw(ctx.page, `${formatMoneyFr(ttc)} ${currency}`, {
    x: tx + 70,
    y: ty,
    size: 11,
    font: ctx.fontBold,
    color: BLUE,
  });
  ctx.y = Math.min(ctx.y, ty) - 30;
}

function drawContractAnnexLines(ctx: Ctx, input: ContractPdfInput) {
  const currency = input.currency ?? company.currency;
  const vatRate = input.vatRate ?? 18;
  const contentW = ctx.width - MARGIN * 2;
  ensureSpace(ctx, 50 + input.lines.length * 18 + 60);

  draw(ctx.page, "Annexe — Prestations / BDC", {
    x: MARGIN,
    y: ctx.y,
    size: 10,
    font: ctx.fontBold,
    color: BLUE,
  });
  ctx.y -= 18;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 4,
    width: contentW,
    height: 18,
    color: BLUE,
  });
  draw(ctx.page, "Désignation", {
    x: MARGIN + 8,
    y: ctx.y,
    size: 8,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  draw(ctx.page, "Qté", {
    x: MARGIN + 340,
    y: ctx.y,
    size: 8,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  draw(ctx.page, "Montant", {
    x: MARGIN + 400,
    y: ctx.y,
    size: 8,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  ctx.y -= 22;

  let ht = 0;
  for (const line of input.lines) {
    const lineTotal = line.qty * line.unitPrice;
    ht += lineTotal;
    draw(ctx.page, line.label, {
      x: MARGIN + 8,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
      maxWidth: 320,
    });
    draw(ctx.page, String(line.qty), {
      x: MARGIN + 340,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
    });
    draw(ctx.page, `${formatMoneyFr(lineTotal)} ${currency}`, {
      x: MARGIN + 400,
      y: ctx.y,
      size: 8.5,
      font: ctx.fontBold,
    });
    ctx.y -= 16;
  }
  const vat = Math.round(ht * (vatRate / 100));
  ctx.y -= 6;
  draw(ctx.page, `Total HT ${formatMoneyFr(ht)} ${currency} · TVA ${vatRate}% ${formatMoneyFr(vat)} ${currency} · TTC ${formatMoneyFr(ht + vat)} ${currency}`, {
    x: MARGIN,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
    color: BLUE,
    maxWidth: contentW,
  });
  ctx.y -= 20;
}

function drawPrestaPartiesRegion(ctx: Ctx, input: RhContractPdfInput) {
  drawKeyValueRegion(ctx, "INFORMATIONS CLES", [
    ["Date d'effet", input.startDate],
    [
      "Durée",
      input.endDate
        ? `Du ${input.startDate} au ${input.endDate}`
        : "Durée indéterminée",
    ],
    ["Droit applicable", "Droit malien — Juridictions de Bamako"],
  ]);
  drawKeyValueRegion(ctx, "LE CLIENT", [
    ["Raison sociale", company.legalName],
    ["Forme juridique", company.legalForm],
    ["Identifiant fiscal", company.fiscalId],
    ["Siège social", company.addressOneLine],
    ["Représentant", `${company.managerName} — ${company.managerTitle}`],
  ]);
  drawKeyValueRegion(ctx, "LE PRESTATAIRE", [
    ["Nom", `${input.employee.civility ?? "M."} ${input.employee.firstName} ${input.employee.lastName}`],
    [
      "Qualité",
      `Prestataire indépendant${input.employee.jobTitle ? ` — ${input.employee.jobTitle}` : ""}`,
    ],
    ["Pièce d'identité", input.employee.idCard ?? ""],
    ["Adresse", input.employee.address ?? ""],
    ["E-mail", input.employee.email ?? ""],
    ["Téléphone", input.employee.phone ?? ""],
  ]);
}

function drawPayslipCotisationsRegion(ctx: Ctx, input: RhPayslipInput) {
  const net = input.netSalaryXof ?? input.baseSalaryXof;
  const base = Math.round(net / (1 - TOTAL_CONTRIBUTION_RATE));
  const contentW = ctx.width - MARGIN * 2;
  ensureSpace(ctx, 40 + SOCIAL_CONTRIBUTIONS.length * 14 + 80);

  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 4,
    width: contentW,
    height: 18,
    color: BLUE,
  });
  draw(ctx.page, "Rubrique", {
    x: MARGIN + 8,
    y: ctx.y,
    size: 8,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  draw(ctx.page, "Taux", {
    x: MARGIN + 280,
    y: ctx.y,
    size: 8,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  draw(ctx.page, "Montant", {
    x: MARGIN + 360,
    y: ctx.y,
    size: 8,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  });
  ctx.y -= 22;

  draw(ctx.page, "Salaire brut", {
    x: MARGIN + 8,
    y: ctx.y,
    size: 9,
    font: ctx.font,
  });
  draw(ctx.page, `${formatMoneyFr(base)} ${company.currency}`, {
    x: MARGIN + 360,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
  });
  ctx.y -= 16;

  let totalCotis = 0;
  for (const c of SOCIAL_CONTRIBUTIONS) {
    const amt = Math.round(base * c.rate);
    totalCotis += amt;
    draw(ctx.page, c.label, {
      x: MARGIN + 8,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
    });
    draw(ctx.page, `${(c.rate * 100).toFixed(2)} %`, {
      x: MARGIN + 280,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
    });
    draw(ctx.page, `${formatMoneyFr(amt)} ${company.currency}`, {
      x: MARGIN + 360,
      y: ctx.y,
      size: 8.5,
      font: ctx.font,
    });
    ctx.y -= 13;
  }
  ctx.y -= 6;
  draw(ctx.page, "Total charges sociales (indicatif)", {
    x: MARGIN + 8,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
  });
  draw(ctx.page, `${formatMoneyFr(totalCotis)} ${company.currency}`, {
    x: MARGIN + 360,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
  });
  ctx.y -= 20;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 8,
    width: contentW,
    height: 28,
    color: LIGHT,
  });
  draw(ctx.page, "Net à payer", {
    x: MARGIN + 8,
    y: ctx.y,
    size: 11,
    font: ctx.fontBold,
    color: BLUE,
  });
  draw(ctx.page, `${formatMoneyFr(net)} ${company.currency}`, {
    x: MARGIN + 360,
    y: ctx.y,
    size: 11,
    font: ctx.fontBold,
    color: BLUE,
  });
  ctx.y -= 36;
}

/**
 * Dessine la région composite à la position courante du contexte PDF.
 * Sans payload adapté → no-op (Playground `blocks_only` sans lignes).
 */
export function drawCompositeRegion(
  ctx: Ctx,
  renderer: CompositeRenderer,
  payload: OfficialPdfPayload | undefined,
): void {
  if (!payload) return;

  switch (renderer) {
    case "commercial_devis":
      if (payload.kind === "commercial" && payload.input.type === "DEVIS") {
        drawCommercialLinesRegion(ctx, payload.input, "devis");
      } else if (payload.kind === "commercial") {
        drawCommercialLinesRegion(ctx, payload.input, "devis");
      }
      break;
    case "commercial_facture":
      if (payload.kind === "commercial") {
        drawCommercialLinesRegion(ctx, payload.input, "facture");
      }
      break;
    case "commercial_contract":
      if (payload.kind === "commercial_contract") {
        drawContractAnnexLines(ctx, payload.input);
      }
      break;
    case "rh_contract_presta":
      if (payload.kind === "rh_contract" && payload.variant === "PRESTA") {
        drawPrestaPartiesRegion(ctx, payload.input);
      }
      break;
    case "rh_payslip":
      if (payload.kind === "rh_payslip") {
        drawPayslipCotisationsRegion(ctx, payload.input);
      }
      break;
    case "rh_contract_travail":
    case "rh_contract_stage":
      // Gabarits déjà DSL-only — marqueurs éventuels = no-op
      break;
    default:
      break;
  }
}

