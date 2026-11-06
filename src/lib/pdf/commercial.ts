import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { company } from "@/lib/company";
import {
  formatDateFr,
  formatMoneyFr,
  toWinAnsi,
  toWinAnsiLines,
} from "@/lib/pdf/winansi";

/** Charte MSK — couleurs PDF (exemples devis / facture). */
const BLUE = rgb(29 / 255, 115 / 255, 188 / 255);
const INK = rgb(13 / 255, 19 / 255, 48 / 255);
const MUTED = rgb(100 / 255, 110 / 255, 130 / 255);
const ROW_ALT = rgb(0.96, 0.97, 0.98);
const LIGHT_BLUE = rgb(0.9, 0.94, 0.98);
const LIGHT_GREEN = rgb(0.88, 0.95, 0.9);

export type CommercialLine = {
  label: string;
  qty: number;
  unitPrice: number;
  date?: string;
  vatRate?: number;
};

export type CommercialPdfInput = {
  type: "DEVIS" | "FACTURE";
  number: string;
  clientName: string;
  clientCompany?: string;
  clientAddress?: string;
  clientPhone?: string;
  issueDate?: string;
  validityDate?: string;
  object?: string;
  missionNote?: string;
  lines: CommercialLine[];
  currency?: string;
  vatRate?: number;
  /** PNG signature (idéalement fond transparent). */
  signaturePng?: Uint8Array | Buffer;
  signatureLabel?: string;
};

function draw(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
    maxWidth?: number;
  },
) {
  const { maxWidth, ...rest } = opts;
  let t = toWinAnsi(text);
  if (maxWidth) {
    while (rest.font.widthOfTextAtSize(t, rest.size) > maxWidth && t.length > 3) {
      t = t.slice(0, -2);
    }
    if (t !== toWinAnsi(text) && t.length > 0) t = `${t}...`;
  }
  page.drawText(t, rest);
}

function drawRight(
  page: PDFPage,
  text: string,
  opts: {
    right: number;
    y: number;
    size: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
  },
) {
  const t = toWinAnsi(text);
  const w = opts.font.widthOfTextAtSize(t, opts.size);
  page.drawText(t, {
    x: opts.right - w,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color,
  });
}

/** Coupe un texte WinAnsi-safe en lignes qui tiennent dans maxWidth. */
function wrapParagraph(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const paragraphs = toWinAnsiLines(text);
  const out: string[] = [];
  for (const para of paragraphs.length ? paragraphs : [toWinAnsi(text)]) {
    const words = para.split(" ").filter(Boolean);
    let cur = "";
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && cur) {
        out.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) out.push(cur);
  }
  return out.length ? out : [""];
}

async function embedLogo(pdf: PDFDocument) {
  try {
    const logoPath = path.join(process.cwd(), "public/brand/lockup.png");
    const bytes = await readFile(logoPath);
    return pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

export async function generateCommercialPdf(
  input: CommercialPdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const { width, height } = page.getSize();
  const margin = 42;

  const currency = input.currency ?? company.currency;
  const vatRate = input.vatRate ?? 18;
  const issued = input.issueDate ?? formatDateFr();
  const valid =
    input.validityDate ?? formatDateFr(addMonths(new Date(), 1));
  const docLabel = input.type === "DEVIS" ? "DEVIS" : "FACTURE";
  const shortNumber = input.number.replace(/^(DEVIS|FACTURE|D|F)[-\s]*/i, "");

  const logo = await embedLogo(pdf);
  if (logo) {
    const maxW = 130;
    const scale = maxW / logo.width;
    const h = logo.height * scale;
    page.drawImage(logo, {
      x: margin,
      y: height - 48 - h,
      width: maxW,
      height: h,
    });
  } else {
    draw(page, company.legalName, {
      x: margin,
      y: height - 52,
      size: 14,
      font: fontBold,
      color: INK,
    });
  }

  // Titre | DEVIS - N / | FACTURE - N
  const title = `| ${docLabel} - ${shortNumber}`;
  drawRight(page, title, {
    right: width - margin,
    y: height - 48,
    size: 18,
    font: fontBold,
    color: INK,
  });
  // Barre bleue verticale à gauche du titre
  const titleW = fontBold.widthOfTextAtSize(toWinAnsi(title), 18);
  page.drawRectangle({
    x: width - margin - titleW - 8,
    y: height - 52,
    width: 2.5,
    height: 22,
    color: BLUE,
  });

  drawRight(page, `Date d'emission : ${issued}`, {
    right: width - margin,
    y: height - 68,
    size: 9,
    font,
    color: MUTED,
  });
  drawRight(page, `Date de validite : ${valid}`, {
    right: width - margin,
    y: height - 80,
    size: 9,
    font,
    color: MUTED,
  });

  // Émetteur / client
  let y = height - 130;
  draw(page, `${company.legalName},`, {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: INK,
  });
  y -= 13;
  for (const line of company.addressLines) {
    draw(page, line, { x: margin, y, size: 9, font, color: MUTED });
    y -= 12;
  }

  let cy = height - 130;
  const clientX = width / 2 + 20;
  draw(page, input.clientName, {
    x: clientX,
    y: cy,
    size: 10,
    font: fontBold,
    color: INK,
    maxWidth: width - clientX - margin,
  });
  cy -= 13;
  if (input.clientCompany) {
    draw(page, input.clientCompany, {
      x: clientX,
      y: cy,
      size: 9,
      font,
      color: MUTED,
      maxWidth: width - clientX - margin,
    });
    cy -= 12;
  }
  if (input.clientAddress) {
    draw(page, input.clientAddress, {
      x: clientX,
      y: cy,
      size: 9,
      font,
      color: MUTED,
      maxWidth: width - clientX - margin,
    });
    cy -= 12;
  }
  if (input.clientPhone) {
    draw(page, `Contact: ${input.clientPhone}`, {
      x: clientX,
      y: cy,
      size: 9,
      font,
      color: MUTED,
    });
  }

  y = Math.min(y, cy) - 28;

  if (input.type === "DEVIS") {
    y = drawDevisBody(page, {
      y,
      margin,
      width,
      font,
      fontBold,
      input,
      currency,
      vatRate,
    });
  } else {
    y = drawFactureBody(page, {
      y,
      margin,
      width,
      font,
      fontBold,
      fontOblique,
      input,
      currency,
      vatRate,
      issued,
    });
  }

  // Bloc signature (bas de page, au-dessus du footer)
  if (input.signaturePng) {
    try {
      const sig = await pdf.embedPng(input.signaturePng);
      const maxW = 140;
      const maxH = 56;
      const scale = Math.min(maxW / sig.width, maxH / sig.height);
      const sw = sig.width * scale;
      const sh = sig.height * scale;
      const sigY = 58;
      draw(page, "Signature", {
        x: margin,
        y: sigY + sh + 10,
        size: 8,
        font: fontBold,
        color: MUTED,
      });
      page.drawImage(sig, {
        x: margin,
        y: sigY,
        width: sw,
        height: sh,
      });
      if (input.signatureLabel) {
        draw(page, input.signatureLabel, {
          x: margin,
          y: sigY - 12,
          size: 7.5,
          font: fontOblique,
          color: MUTED,
          maxWidth: 180,
        });
      }
    } catch (e) {
      console.error("[pdf] signature embed échoué", e);
    }
  }

  // Pied de page
  const footer1 = company.legalForm;
  const footer2 = `${company.addressOneLine}. Identifiant Fiscal : ${company.fiscalId}`;
  draw(page, footer1, {
    x: (width - fontOblique.widthOfTextAtSize(toWinAnsi(footer1), 8)) / 2,
    y: 36,
    size: 8,
    font: fontOblique,
    color: MUTED,
  });
  draw(page, footer2, {
    x: (width - fontOblique.widthOfTextAtSize(toWinAnsi(footer2), 7.5)) / 2,
    y: 24,
    size: 7.5,
    font: fontOblique,
    color: MUTED,
  });

  return pdf.save();
}

function drawDevisBody(
  page: PDFPage,
  ctx: {
    y: number;
    margin: number;
    width: number;
    font: PDFFont;
    fontBold: PDFFont;
    input: CommercialPdfInput;
    currency: string;
    vatRate: number;
  },
) {
  let { y } = ctx;
  const { margin, width, font, fontBold, input, currency, vatRate } = ctx;
  const contentW = width - margin * 2;

  draw(page, "1. PRESENTATION DE LA MISSION", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: INK,
  });
  y -= 18;

  const objet =
    input.object ??
    "Prestation professionnelle selon le detail ci-dessous.";
  const note =
    input.missionNote ??
    "Cette proposition precise le perimetre, les livrables et les conditions commerciales.";

  const maxTextW = contentW - 20;
  const objetLines = wrapParagraph(`Objet : ${objet}`, fontBold, 9, maxTextW);
  const noteLines = wrapParagraph(note, font, 8.5, maxTextW);
  const lineGap = 11;
  const boxPadTop = 10;
  const boxPadBottom = 10;
  const boxH =
    boxPadTop +
    objetLines.length * lineGap +
    4 +
    noteLines.length * lineGap +
    boxPadBottom;

  page.drawRectangle({
    x: margin,
    y: y - boxH + 12,
    width: contentW,
    height: boxH,
    color: LIGHT_BLUE,
  });
  let ty = y - 2;
  for (const line of objetLines) {
    draw(page, line, {
      x: margin + 10,
      y: ty,
      size: 9,
      font: fontBold,
      color: INK,
    });
    ty -= lineGap;
  }
  ty -= 4;
  for (const line of noteLines) {
    draw(page, line, {
      x: margin + 10,
      y: ty,
      size: 8.5,
      font,
      color: MUTED,
    });
    ty -= lineGap;
  }
  y -= boxH + 16;

  draw(page, "2. DETAIL DES PRESTATIONS", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: INK,
  });
  y -= 22;

  // En-têtes colonnes
  const cols = {
    label: margin,
    qty: margin + 320,
    pu: margin + 380,
    total: width - margin,
  };
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: contentW,
    height: 20,
    color: BLUE,
  });
  draw(page, "PRESTATIONS", {
    x: cols.label + 8,
    y: y + 2,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  draw(page, "QTE", {
    x: cols.qty,
    y: y + 2,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  draw(page, "P.U.", {
    x: cols.pu,
    y: y + 2,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  drawRight(page, "MONTANT", {
    right: cols.total - 8,
    y: y + 2,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  y -= 24;

  let ht = 0;
  input.lines.forEach((line, i) => {
    const lineTotal = line.qty * line.unitPrice;
    ht += lineTotal;
    if (i % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - 4,
        width: contentW,
        height: 18,
        color: ROW_ALT,
      });
    }
    draw(page, line.label, {
      x: cols.label + 8,
      y,
      size: 9,
      font,
      color: INK,
      maxWidth: 300,
    });
    draw(page, String(line.qty), {
      x: cols.qty,
      y,
      size: 9,
      font,
      color: INK,
    });
    draw(page, formatMoneyFr(line.unitPrice), {
      x: cols.pu,
      y,
      size: 9,
      font,
      color: INK,
    });
    drawRight(page, `${formatMoneyFr(lineTotal)} ${currency}`, {
      right: cols.total - 8,
      y,
      size: 9,
      font: fontBold,
      color: INK,
    });
    y -= 18;
  });

  // Bandeau accent (rappel charte / premium)
  y -= 8;
  page.drawRectangle({
    x: margin,
    y: y - 2,
    width: contentW,
    height: 14,
    color: LIGHT_GREEN,
  });
  draw(page, "Conditions : validite 30 jours · facturation selon echeancier convenu", {
    x: margin + 8,
    y: y + 2,
    size: 8,
    font,
    color: INK,
  });
  y -= 28;

  const vat = Math.round(ht * (vatRate / 100));
  const ttc = ht + vat;
  const totalsX = width - margin - 200;
  draw(page, `Total HT`, { x: totalsX, y, size: 10, font, color: INK });
  drawRight(page, `${formatMoneyFr(ht)} ${currency}`, {
    right: width - margin,
    y,
    size: 10,
    font,
    color: INK,
  });
  y -= 14;
  draw(page, `TVA ${vatRate}%`, { x: totalsX, y, size: 10, font, color: MUTED });
  drawRight(page, `${formatMoneyFr(vat)} ${currency}`, {
    right: width - margin,
    y,
    size: 10,
    font,
    color: MUTED,
  });
  y -= 10;
  page.drawRectangle({
    x: totalsX,
    y: y + 2,
    width: width - margin - totalsX,
    height: 1.2,
    color: BLUE,
  });
  y -= 14;
  draw(page, `Total TTC`, {
    x: totalsX,
    y,
    size: 11,
    font: fontBold,
    color: BLUE,
  });
  drawRight(page, `${formatMoneyFr(ttc)} ${currency}`, {
    right: width - margin,
    y,
    size: 11,
    font: fontBold,
    color: BLUE,
  });

  return y - 28;
}

function drawFactureBody(
  page: PDFPage,
  ctx: {
    y: number;
    margin: number;
    width: number;
    font: PDFFont;
    fontBold: PDFFont;
    fontOblique: PDFFont;
    input: CommercialPdfInput;
    currency: string;
    vatRate: number;
    issued: string;
  },
) {
  let { y } = ctx;
  const {
    margin,
    width,
    font,
    fontBold,
    fontOblique,
    input,
    currency,
    vatRate,
    issued,
  } = ctx;
  const contentW = width - margin * 2;

  // Colonnes facture : Description, Date, Qté, P.U., TVA, Montant
  const c = {
    desc: margin,
    date: margin + 220,
    qty: margin + 290,
    pu: margin + 330,
    tva: margin + 410,
    montant: width - margin,
  };

  page.drawRectangle({
    x: margin,
    y: y - 4,
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
    draw(page, label, {
      x,
      y: y + 2,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  }
  y -= 26;

  let ht = 0;
  input.lines.forEach((line, i) => {
    const lineTotal = line.qty * line.unitPrice;
    ht += lineTotal;
    const rowH = 28;
    if (i % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - 8,
        width: contentW,
        height: rowH,
        color: ROW_ALT,
      });
    }
    draw(page, line.label, {
      x: c.desc + 6,
      y,
      size: 8.5,
      font: fontOblique,
      color: INK,
      maxWidth: 200,
    });
    draw(page, line.date ?? issued, {
      x: c.date,
      y,
      size: 8.5,
      font,
      color: INK,
    });
    draw(page, String(line.qty), {
      x: c.qty,
      y,
      size: 8.5,
      font,
      color: INK,
    });
    draw(page, formatMoneyFr(line.unitPrice), {
      x: c.pu,
      y,
      size: 8.5,
      font,
      color: INK,
    });
    draw(page, `${line.vatRate ?? vatRate}%`, {
      x: c.tva,
      y,
      size: 8.5,
      font,
      color: INK,
    });
    drawRight(page, `${formatMoneyFr(lineTotal)} F`, {
      right: c.montant - 6,
      y,
      size: 9,
      font: fontBold,
      color: INK,
    });
    y -= rowH;
  });

  y -= 12;
  const vat = Math.round(ht * (vatRate / 100));
  const ttc = ht + vat;

  // IBAN à gauche
  draw(page, `IBAN : ${company.iban}`, {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: INK,
  });
  y -= 14;
  draw(page, `Montant Total a Payer : ${formatMoneyFr(ttc)} F CFA`, {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: INK,
  });

  // Totaux à droite
  let ty = y + 28;
  const tx = width - margin - 180;
  draw(page, "Total HT", { x: tx, y: ty, size: 10, font, color: INK });
  drawRight(page, `${formatMoneyFr(ht)} ${currency}`, {
    right: width - margin,
    y: ty,
    size: 10,
    font,
    color: INK,
  });
  ty -= 14;
  draw(page, `TVA ${vatRate}%`, { x: tx, y: ty, size: 10, font, color: MUTED });
  drawRight(page, `${formatMoneyFr(vat)} ${currency}`, {
    right: width - margin,
    y: ty,
    size: 10,
    font,
    color: MUTED,
  });
  ty -= 8;
  page.drawRectangle({
    x: tx,
    y: ty + 2,
    width: width - margin - tx,
    height: 1.5,
    color: BLUE,
  });
  ty -= 14;
  draw(page, "Total TTC", {
    x: tx,
    y: ty,
    size: 11,
    font: fontBold,
    color: BLUE,
  });
  drawRight(page, `${formatMoneyFr(ttc)} ${currency}`, {
    right: width - margin,
    y: ty,
    size: 11,
    font: fontBold,
    color: BLUE,
  });
  ty -= 6;
  page.drawRectangle({
    x: tx,
    y: ty,
    width: width - margin - tx,
    height: 1.5,
    color: BLUE,
  });

  return Math.min(y, ty) - 30;
}

/**
 * P4 — fondation génération contrat (plan docs/commercial/PLAN-CLIENT-CONTRAT.md
 * §Phase P4, analyse docs/commercial/ANALYSE-MODELES-CONTRATS.md §6.2/§6.3).
 * Couvre les sections socle communes (A+B) + blocs famille B (périmètre CDC) —
 * pas l’intégralité des articles juridiques sources (fondation honnête, pas un
 * copier-coller des 4 PDF analysés).
 */
export type ContractPdfLine = {
  label: string;
  qty: number;
  unitPrice: number;
};

export type ContractPdfScope = {
  contextProblems: string[];
  objectives: string[];
  deliverables: string[];
  outOfScope: string[];
};

export type ContractPdfInput = {
  number: string;
  family: "PRESTATION_ABONNEMENT" | "ENGAGEMENT_CDC";
  familyLabel: string;
  serviceKindLabel: string;
  title?: string;
  clientName: string;
  clientCompany?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  contactName?: string;
  issueDate?: string;
  startDate?: string;
  billingDay?: number;
  currency?: string;
  vatRate?: number;
  lines: ContractPdfLine[];
  paymentTerms?: string;
  renewalTerms?: string;
  terminationTerms?: string;
  scope?: ContractPdfScope;
  /** P4.4 — signature MVP : tampon MSK + date saisie (pas d’e-sign). */
  signedAt?: string;
  signaturePng?: Uint8Array | Buffer;
  signatureLabel?: string;
};

export async function generateContractPdf(
  input: ContractPdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await embedLogo(pdf);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const margin = 42;
  const contentW = PAGE_W - margin * 2;
  const FOOTER_SAFE = 70;

  const currency = input.currency ?? "FCFA";
  const vatRate = input.vatRate ?? 18;
  const issued = input.issueDate ?? formatDateFr();

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 60;

  function newPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - 60;
  }

  function ensureSpace(h: number) {
    if (y - h < FOOTER_SAFE) newPage();
  }

  function sectionTitle(text: string) {
    ensureSpace(32);
    draw(page, text, { x: margin, y, size: 11, font: fontBold, color: INK });
    y -= 8;
    page.drawRectangle({
      x: margin,
      y: y - 4,
      width: contentW,
      height: 1,
      color: BLUE,
    });
    y -= 18;
  }

  function paragraph(text: string, size = 9, color = MUTED) {
    const lines = wrapParagraph(text, font, size, contentW);
    for (const l of lines) {
      ensureSpace(14);
      draw(page, l, { x: margin, y, size, font, color });
      y -= 13;
    }
  }

  function bulletList(items: string[], size = 9) {
    for (const item of items) {
      const lines = wrapParagraph(`- ${item}`, font, size, contentW - 10);
      for (const [i, l] of lines.entries()) {
        ensureSpace(14);
        draw(page, l, {
          x: margin + (i === 0 ? 0 : 10),
          y,
          size,
          font,
          color: INK,
        });
        y -= 13;
      }
    }
    if (items.length === 0) {
      ensureSpace(14);
      draw(page, "- (a preciser)", { x: margin, y, size, font, color: MUTED });
      y -= 13;
    }
  }

  // ---- Couverture / en-tête ----
  if (logo) {
    const maxW = 130;
    const scale = maxW / logo.width;
    const h = logo.height * scale;
    page.drawImage(logo, { x: margin, y: y - h + 20, width: maxW, height: h });
  } else {
    draw(page, company.legalName, {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: INK,
    });
  }
  const title = `| CONTRAT - ${input.number}`;
  drawRight(page, title, {
    right: PAGE_W - margin,
    y,
    size: 16,
    font: fontBold,
    color: INK,
  });
  y -= 24;
  drawRight(page, `${input.familyLabel} - ${input.serviceKindLabel}`, {
    right: PAGE_W - margin,
    y,
    size: 9,
    font,
    color: MUTED,
  });
  y -= 14;
  drawRight(page, `Date d'etablissement : ${issued}`, {
    right: PAGE_W - margin,
    y,
    size: 9,
    font,
    color: MUTED,
  });
  y -= 36;

  if (input.title) {
    draw(page, input.title, { x: margin, y, size: 13, font: fontBold, color: BLUE });
    y -= 26;
  }

  // ---- Parties ----
  sectionTitle("ENTRE LES SOUSSIGNES");
  const partyColW = contentW / 2 - 10;
  const partyTopY = y;
  draw(page, `${company.legalName} (${company.legalForm.split(" - ")[1] ?? "SARL"})`, {
    x: margin,
    y,
    size: 9.5,
    font: fontBold,
    color: INK,
    maxWidth: partyColW,
  });
  y -= 13;
  for (const line of company.addressLines) {
    draw(page, line, { x: margin, y, size: 8.5, font, color: MUTED, maxWidth: partyColW });
    y -= 11;
  }
  draw(page, `NIF : ${company.fiscalId}`, { x: margin, y, size: 8.5, font, color: MUTED });
  y -= 11;
  draw(page, `Represente par ${company.managerName}, ${company.managerTitle}`, {
    x: margin,
    y,
    size: 8.5,
    font,
    color: MUTED,
    maxWidth: partyColW,
  });
  y -= 11;
  draw(page, `${company.email} - ${company.phones}`, {
    x: margin,
    y,
    size: 8,
    font,
    color: MUTED,
    maxWidth: partyColW,
  });
  const providerBottom = y;

  let cy = partyTopY;
  const clientX = margin + partyColW + 20;
  draw(page, input.clientCompany ?? input.clientName, {
    x: clientX,
    y: cy,
    size: 9.5,
    font: fontBold,
    color: INK,
    maxWidth: partyColW,
  });
  cy -= 13;
  if (input.clientAddress) {
    draw(page, input.clientAddress, { x: clientX, y: cy, size: 8.5, font, color: MUTED, maxWidth: partyColW });
    cy -= 11;
  }
  if (input.contactName) {
    draw(page, `Represente par ${input.contactName}`, {
      x: clientX,
      y: cy,
      size: 8.5,
      font,
      color: MUTED,
      maxWidth: partyColW,
    });
    cy -= 11;
  }
  const contactLine = [input.clientEmail, input.clientPhone].filter(Boolean).join(" - ");
  if (contactLine) {
    draw(page, contactLine, { x: clientX, y: cy, size: 8, font, color: MUTED, maxWidth: partyColW });
    cy -= 11;
  }

  y = Math.min(providerBottom, cy) - 20;

  // ---- Objet / periode ----
  sectionTitle("ARTICLE 1 - OBJET ET DUREE");
  paragraph(
    `Le present contrat a pour objet la prestation « ${input.serviceKindLabel} » decrite a l'article 2, selon la composition commerciale convenue entre les parties.`,
    9,
    INK,
  );
  if (input.startDate) paragraph(`Date d'effet : ${input.startDate}.`);
  if (input.billingDay) paragraph(`Facturation periodique le jour ${input.billingDay} de chaque mois (si applicable).`);
  y -= 6;

  // ---- Composition commerciale ----
  sectionTitle("ARTICLE 2 - COMPOSITION COMMERCIALE");
  ensureSpace(24);
  page.drawRectangle({ x: margin, y: y - 4, width: contentW, height: 18, color: BLUE });
  draw(page, "PRESTATION", { x: margin + 8, y: y + 1, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  draw(page, "QTE", { x: margin + 340, y: y + 1, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  drawRight(page, "MONTANT", { right: margin + contentW - 8, y: y + 1, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  y -= 22;
  let totalHt = 0;
  input.lines.forEach((l, i) => {
    ensureSpace(18);
    const lineTotal = l.qty * l.unitPrice;
    totalHt += lineTotal;
    if (i % 2 === 1) {
      page.drawRectangle({ x: margin, y: y - 4, width: contentW, height: 16, color: ROW_ALT });
    }
    draw(page, l.label, { x: margin + 8, y, size: 8.5, font, color: INK, maxWidth: 320 });
    draw(page, String(l.qty), { x: margin + 340, y, size: 8.5, font, color: INK });
    drawRight(page, `${formatMoneyFr(lineTotal)} ${currency}`, {
      right: margin + contentW - 8,
      y,
      size: 8.5,
      font: fontBold,
      color: INK,
    });
    y -= 16;
  });
  y -= 6;
  const vat = Math.round(totalHt * (vatRate / 100));
  ensureSpace(32);
  drawRight(page, `Total HT : ${formatMoneyFr(totalHt)} ${currency}`, {
    right: margin + contentW,
    y,
    size: 9,
    font,
    color: INK,
  });
  y -= 13;
  drawRight(page, `TTC (TVA ${vatRate}%) : ${formatMoneyFr(totalHt + vat)} ${currency}`, {
    right: margin + contentW,
    y,
    size: 10,
    font: fontBold,
    color: BLUE,
  });
  y -= 24;

  // ---- Conditions (paiement / reconduction / resiliation) ----
  sectionTitle("ARTICLE 3 - CONDITIONS CONTRACTUELLES");
  if (input.paymentTerms) {
    draw(page, "Paiement :", { x: margin, y, size: 9, font: fontBold, color: INK });
    y -= 13;
    paragraph(input.paymentTerms);
    y -= 4;
  }
  if (input.renewalTerms) {
    ensureSpace(14);
    draw(page, "Reconduction :", { x: margin, y, size: 9, font: fontBold, color: INK });
    y -= 13;
    paragraph(input.renewalTerms);
    y -= 4;
  }
  if (input.terminationTerms) {
    ensureSpace(14);
    draw(page, "Resiliation :", { x: margin, y, size: 9, font: fontBold, color: INK });
    y -= 13;
    paragraph(input.terminationTerms);
    y -= 4;
  }
  y -= 10;

  // ---- Perimetre projet (famille B uniquement) ----
  if (input.family === "ENGAGEMENT_CDC" && input.scope) {
    sectionTitle("ARTICLE 4 - PERIMETRE DU PROJET (CAHIER DES CHARGES)");
    ensureSpace(14);
    draw(page, "Contexte / problemes identifies :", { x: margin, y, size: 9, font: fontBold, color: INK });
    y -= 13;
    bulletList(input.scope.contextProblems);
    y -= 6;
    ensureSpace(14);
    draw(page, "Objectifs :", { x: margin, y, size: 9, font: fontBold, color: INK });
    y -= 13;
    bulletList(input.scope.objectives);
    y -= 6;
    ensureSpace(14);
    draw(page, "Livrables :", { x: margin, y, size: 9, font: fontBold, color: INK });
    y -= 13;
    bulletList(input.scope.deliverables);
    y -= 6;
    ensureSpace(14);
    draw(page, "Hors perimetre :", { x: margin, y, size: 9, font: fontBold, color: INK });
    y -= 13;
    bulletList(input.scope.outOfScope);
    y -= 10;
    paragraph(
      "Les Conditions Generales de Vente MSK CREATION (CGV) s'appliquent et prevalent en cas de contradiction avec le present cahier des charges.",
      8.5,
    );
    y -= 10;
  }

  // ---- Clauses socle (droit applicable) ----
  sectionTitle("ARTICLE 5 - DROIT APPLICABLE ET LITIGES");
  paragraph(
    "Le present contrat est soumis au droit malien. En cas de litige, les parties s'efforcent de trouver une solution amiable sous 30 jours avant saisine des juridictions competentes de Bamako. Traitement des donnees personnelles conforme a la loi n. 2013-015 du 21 mai 2013 (APDP).",
  );
  y -= 16;

  // ---- Signatures (P4.4 MVP : tampon + date saisie) ----
  sectionTitle("SIGNATURES");
  ensureSpace(90);
  draw(page, "Pour le Prestataire,", { x: margin, y, size: 9, font: fontBold, color: INK });
  draw(page, "Pour le Client,", { x: clientX, y, size: 9, font: fontBold, color: INK });
  y -= 13;
  draw(page, `${company.managerName} (${company.managerTitle})`, {
    x: margin,
    y,
    size: 8.5,
    font,
    color: MUTED,
  });
  draw(page, input.contactName ?? input.clientName, {
    x: clientX,
    y,
    size: 8.5,
    font,
    color: MUTED,
    maxWidth: partyColW,
  });
  y -= 50;

  if (input.signaturePng) {
    try {
      const sig = await pdf.embedPng(input.signaturePng);
      const maxW = 120;
      const maxH = 48;
      const scale = Math.min(maxW / sig.width, maxH / sig.height);
      page.drawImage(sig, { x: margin, y: y + 10, width: sig.width * scale, height: sig.height * scale });
    } catch (e) {
      console.error("[pdf] signature contrat embed echoue", e);
    }
  } else {
    draw(page, "[ Tampon MSK CREATION ]", { x: margin, y: y + 20, size: 9, font: fontOblique, color: MUTED });
  }
  draw(page, "[ Signature client ]", { x: clientX, y: y + 20, size: 9, font: fontOblique, color: MUTED });
  draw(page, "Lu et approuve", { x: margin, y, size: 8, font: fontOblique, color: MUTED });
  draw(page, "Lu et approuve", { x: clientX, y, size: 8, font: fontOblique, color: MUTED });
  y -= 14;
  draw(page, `Fait a Bamako, le ${input.signedAt ?? "____________"}`, {
    x: margin,
    y,
    size: 8,
    font,
    color: MUTED,
  });

  // ---- Pied de page + pagination (post-traitement, toutes les pages) ----
  const pages = pdf.getPages();
  pages.forEach((p, idx) => {
    const footer1 = company.legalForm;
    const footer2 = `${company.addressOneLine}. NIF : ${company.fiscalId}`;
    draw(p, footer1, {
      x: (PAGE_W - fontOblique.widthOfTextAtSize(toWinAnsi(footer1), 8)) / 2,
      y: 36,
      size: 8,
      font: fontOblique,
      color: MUTED,
    });
    draw(p, footer2, {
      x: (PAGE_W - fontOblique.widthOfTextAtSize(toWinAnsi(footer2), 7.5)) / 2,
      y: 24,
      size: 7.5,
      font: fontOblique,
      color: MUTED,
    });
    drawRight(p, `Page ${idx + 1}/${pages.length}`, {
      right: PAGE_W - margin,
      y: 24,
      size: 7.5,
      font: fontOblique,
      color: MUTED,
    });
  });

  return pdf.save();
}
