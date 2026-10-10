import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { company } from "@/lib/company";
import { formatDateFr, formatMoneyFr, toWinAnsi } from "@/lib/pdf/winansi";

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

  const boxH = 58;
  page.drawRectangle({
    x: margin,
    y: y - boxH + 12,
    width: contentW,
    height: boxH,
    color: LIGHT_BLUE,
  });
  draw(page, `Objet : ${objet}`, {
    x: margin + 10,
    y: y - 2,
    size: 9,
    font: fontBold,
    color: INK,
    maxWidth: contentW - 20,
  });
  draw(page, note, {
    x: margin + 10,
    y: y - 18,
    size: 8.5,
    font,
    color: MUTED,
    maxWidth: contentW - 20,
  });
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
