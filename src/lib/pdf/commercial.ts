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
 * Génération contrat — familles A (prestation / abonnement, Articles 1–13) et
 * B (engagement / cahier des charges). Corps aligné sur les modèles réels MSK
 * (docs/CONTRAT DE PRESTATION DE SERVICES.pdf, docs/MODELE CONTRAT GESTION DES
 * RESEAUX SOCIAUX.pdf, docs/02_Contrat d'engagement Application Web.pdf,
 * docs/CONTRAT D'ENGAGEMENT.pdf — voir docs/commercial/ANALYSE-MODELES-CONTRATS.md).
 * Variables non fournies par le dossier ERP → place-holder "---" (jamais une
 * clause silencieusement omise). Articles juridiques socle (PI, confidentialité,
 * données personnelles, responsabilité/force majeure, droit applicable) : texte
 * fixe conforme aux modèles, avec délais/plafonds paramétrables (défauts = valeurs
 * du modèle de référence).
 */
export type ContractPdfLine = {
  label: string;
  qty: number;
  unitPrice: number;
};

export type ContractPdfModule = { name: string; features: string[] };
export type ContractPdfSitePage = { order?: number; name: string; description: string };
export type ContractPdfFeatureGroup = { group: string; items: string[] };
export type ContractPdfRole = { role: string; access: string; description: string };
export type ContractPdfPhase = {
  number?: string;
  name: string;
  content: string;
  duration: string;
};
export type ContractPdfResource = {
  resource: string;
  description: string;
  due: string;
};
export type ContractPdfComplementary = {
  type: string;
  tariff?: string;
  status?: string;
};

export type ContractPdfScope = {
  /** 01 — Contexte (famille B). */
  interlocutorName?: string;
  interlocutorTitle?: string;
  location?: string;
  currentTools?: string;
  contextProblems: string[];
  visionTarget?: string;
  /** 02 — Objectifs fonctionnels (famille B). */
  objectives: string[];
  /** 03 — Périmètre : modules (app) OU pages (site vitrine). */
  modules?: ContractPdfModule[];
  pages?: ContractPdfSitePage[];
  /** 04 — Fonctionnalités incluses, groupées. */
  includedFeatures?: ContractPdfFeatureGroup[];
  /** 05 — Rôles & accès (application uniquement). */
  roles?: ContractPdfRole[];
  /** Livrables (toujours présents, famille B). */
  deliverables: string[];
  /** 06 — Planning d'exécution. */
  planningPhases?: ContractPdfPhase[];
  totalDurationLabel?: string;
  delayRule?: string;
  /** 07 — Ressources à fournir par le client. */
  clientResources?: ContractPdfResource[];
  /** 08 — Critères de recette et validation. */
  acceptanceDays?: number;
  acceptanceChannel?: string;
  /** 09 — Hors périmètre. */
  outOfScope: string[];
  /** Mention contrat de maintenance (optionnelle). */
  maintenanceMention?: string;
};

export type ContractPdfInput = {
  number: string;
  family: "PRESTATION_ABONNEMENT" | "ENGAGEMENT_CDC";
  familyLabel: string;
  serviceKind?:
    | "RESEAUX_SOCIAUX"
    | "APPLICATION_WEB"
    | "SITE_VITRINE"
    | "CHARTE_GRAPHIQUE"
    | "AUTRE"
    | "BUNDLE";
  serviceKindLabel: string;
  title?: string;
  clientName: string;
  clientCompany?: string;
  clientLegalForm?: string;
  /** NINA / RCCM client. */
  clientRegistryId?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  contactName?: string;
  contactTitle?: string;
  issueDate?: string;
  startDate?: string;
  billingDay?: number;
  currency?: string;
  vatRate?: number;
  lines: ContractPdfLine[];
  paymentTerms?: string;
  renewalTerms?: string;
  terminationTerms?: string;
  /** Famille A — offre packagée réseaux sociaux (Article 2). */
  offerTier?: "STANDARD" | "PRO" | "PREMIUM" | "CUSTOM";
  complementaryServices?: ContractPdfComplementary[];
  /** Délais / plafonds contractuels — défauts = modèle MSK de référence. */
  validationHours?: number;
  adminAccessHours?: number;
  depositPercent?: number;
  latePenaltyPercentPerWeek?: number;
  noticeDays?: number;
  cureDays?: number;
  accessReturnHours?: number;
  confidentialityYears?: number;
  liabilityCapMonths?: number;
  amicableDays?: number;
  scope?: ContractPdfScope;
  /** Signature MVP : tampon MSK + date saisie (pas d'e-sign). */
  signedAt?: string;
  signaturePng?: Uint8Array | Buffer;
  signatureLabel?: string;
};

/** Grille d'offres packagées — Article 2 (modèle réseaux sociaux, valeurs fixes du gabarit MSK). */
const RS_OFFER_MATRIX: { label: string; standard: string; pro: string; premium: string }[] = [
  { label: "Publications / mois", standard: "8", pro: "12", premium: "16" },
  {
    label: "Reseaux couverts",
    standard: "Facebook + TikTok",
    pro: "FB + Insta + TikTok",
    premium: "Tous + YouTube",
  },
  {
    label: "Visuels / videos",
    standard: "7 visuels / 1 video",
    pro: "9 visuels / 3 videos",
    premium: "10 visuels / 6 videos",
  },
  {
    label: "Community management",
    standard: "2x / semaine",
    pro: "3x / semaine",
    premium: "4x / semaine",
  },
  {
    label: "Rapport mensuel",
    standard: "Simple",
    pro: "Detaille",
    premium: "Detaille + recommandations",
  },
  {
    label: "Audit + appel strategique",
    standard: "Non inclus",
    pro: "Audit M1 + 1 appel/mois",
    premium: "Audit M1 + 2 appels/mois",
  },
  {
    label: "Gestion Ads (budget separe)",
    standard: "Non inclus",
    pro: "Non inclus",
    premium: "Inclus",
  },
];

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
  const FOOTER_SAFE = 78;
  const WHITE = rgb(1, 1, 1);

  const currency = input.currency ?? "FCFA";
  const vatRate = input.vatRate ?? 18;
  const issued = input.issueDate ?? formatDateFr();
  const isFamilyA = input.family === "PRESTATION_ABONNEMENT";
  const scope = input.scope;

  // Defauts alignes sur le modele MSK de reference (ANALYSE §1.3 / §6.3).
  const validationHours = input.validationHours ?? 48;
  const adminAccessHours = input.adminAccessHours ?? 48;
  const depositPercent = input.depositPercent ?? 50;
  const latePenaltyPercentPerWeek = input.latePenaltyPercentPerWeek ?? 1;
  const noticeDays = input.noticeDays ?? 30;
  const cureDays = input.cureDays ?? 15;
  const accessReturnHours = input.accessReturnHours ?? 48;
  const confidentialityYears = input.confidentialityYears ?? 5;
  const liabilityCapMonths = input.liabilityCapMonths ?? 3;
  const amicableDays = input.amicableDays ?? 30;

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 48;

  function drawDashedHLine(atY: number, x0 = margin, x1 = PAGE_W - margin) {
    const dash = 4;
    const gap = 3;
    let x = x0;
    while (x < x1) {
      const end = Math.min(x + dash, x1);
      page.drawLine({
        start: { x, y: atY },
        end: { x: end, y: atY },
        thickness: 0.8,
        color: BLUE,
      });
      x = end + gap;
    }
  }

  function drawCentered(text: string, size: number, f: PDFFont, color: ReturnType<typeof rgb>) {
    const t = toWinAnsi(text);
    const tw = f.widthOfTextAtSize(t, size);
    page.drawText(t, {
      x: (PAGE_W - tw) / 2,
      y,
      size,
      font: f,
      color,
    });
  }

  /** En-tête compact des pages suivantes (tagline + filet). */
  function drawContinuationHeader() {
    drawCentered(company.tagline, 8, fontOblique, MUTED);
    y -= 12;
    drawDashedHLine(y);
    y -= 22;
  }

  function newPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - 48;
    drawContinuationHeader();
  }

  function ensureSpace(h: number) {
    if (y - h < FOOTER_SAFE) newPage();
  }

  function sectionTitle(text: string) {
    ensureSpace(32);
    draw(page, text, { x: margin, y, size: 10.5, font: fontBold, color: INK });
    y -= 6;
    page.drawRectangle({
      x: margin,
      y: y - 2,
      width: contentW,
      height: 1.2,
      color: BLUE,
    });
    y -= 16;
  }

  /**
   * Tableau titre + lignes libellé | valeur (réf. modèle réseaux sociaux).
   * Colonne libellé fond bleu clair, valeurs fond blanc.
   */
  function keyValueTable(
    title: string,
    rows: Array<[string, string]>,
    opts?: { labelW?: number },
  ) {
    const labelW = opts?.labelW ?? 130;
    const valueW = contentW - labelW;
    const rowSize = 8.5;
    ensureSpace(28 + rows.length * 16);
    // Titre de bloc
    page.drawRectangle({
      x: margin,
      y: y - 4,
      width: contentW,
      height: 16,
      color: BLUE,
    });
    draw(page, title, {
      x: margin + 8,
      y: y + 1,
      size: 8,
      font: fontBold,
      color: WHITE,
    });
    y -= 18;
    for (const [label, value] of rows) {
      const valueLines = wrapParagraph(
        value?.trim() ? value : "—",
        font,
        rowSize,
        valueW - 12,
      );
      const n = Math.max(valueLines.length, 1);
      const rowH = n * 11 + 6;
      ensureSpace(rowH + 2);
      page.drawRectangle({
        x: margin,
        y: y - rowH + 8,
        width: labelW,
        height: rowH,
        color: LIGHT_BLUE,
      });
      page.drawRectangle({
        x: margin + labelW,
        y: y - rowH + 8,
        width: valueW,
        height: rowH,
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 0.4,
        color: WHITE,
      });
      draw(page, label, {
        x: margin + 6,
        y: y - 2,
        size: 7.5,
        font: fontBold,
        color: BLUE,
        maxWidth: labelW - 10,
      });
      valueLines.forEach((line, li) => {
        draw(page, line, {
          x: margin + labelW + 6,
          y: y - 2 - li * 11,
          size: rowSize,
          font,
          color: INK,
        });
      });
      y -= rowH;
    }
    y -= 10;
  }

  function subTitle(text: string) {
    ensureSpace(16);
    draw(page, text, { x: margin, y, size: 9, font: fontBold, color: INK });
    y -= 13;
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
      draw(page, "- ---", { x: margin, y, size, font, color: MUTED });
      y -= 13;
    }
  }

  /** Table generique multi-colonnes (pagination + alternance de fond). */
  function table(headers: string[], widths: number[], rows: string[][]) {
    ensureSpace(22);
    page.drawRectangle({ x: margin, y: y - 4, width: contentW, height: 18, color: BLUE });
    let hx = margin;
    headers.forEach((h, i) => {
      draw(page, h, { x: hx + 6, y: y + 1, size: 7.5, font: fontBold, color: WHITE });
      hx += widths[i];
    });
    y -= 20;
    rows.forEach((row, ri) => {
      const cellLines = row.map((text, i) =>
        wrapParagraph(text?.trim() ? text : "---", font, 8, widths[i] - 10),
      );
      const nLines = Math.max(...cellLines.map((l) => l.length), 1);
      const rowH = nLines * 10 + 6;
      ensureSpace(rowH + 2);
      if (ri % 2 === 1) {
        page.drawRectangle({
          x: margin,
          y: y - rowH + 8,
          width: contentW,
          height: rowH,
          color: ROW_ALT,
        });
      }
      let cx = margin;
      cellLines.forEach((lines, i) => {
        lines.forEach((line, li) => {
          draw(page, line, { x: cx + 6, y: y - li * 10, size: 8, font, color: INK });
        });
        cx += widths[i];
      });
      y -= rowH;
    });
    y -= 10;
  }

  // ---- Couverture / en-tête (aligné modèle MSK réseaux sociaux) ----
  if (logo) {
    const maxW = 150;
    const scale = maxW / logo.width;
    const h = logo.height * scale;
    page.drawImage(logo, {
      x: (PAGE_W - maxW) / 2,
      y: y - h,
      width: maxW,
      height: h,
    });
    y -= h + 8;
  } else {
    drawCentered(company.legalName, 16, fontBold, BLUE);
    y -= 18;
  }
  drawCentered(company.tagline, 9, fontOblique, MUTED);
  y -= 14;
  drawDashedHLine(y);
  y -= 28;

  const mainTitle = isFamilyA
    ? "CONTRAT DE PRESTATION DE SERVICES"
    : "CONTRAT D'ENGAGEMENT";
  const subTitleText =
    input.title?.trim() ||
    input.serviceKindLabel ||
    input.familyLabel;
  drawCentered(mainTitle, 14, fontBold, INK);
  y -= 16;
  drawCentered(subTitleText, 11, fontBold, BLUE);
  y -= 12;
  drawCentered(`Réf. ${input.number}`, 8.5, font, MUTED);
  y -= 22;

  const durationLabel = isFamilyA
    ? `3 mois — renouvelable par mois (préavis ${noticeDays} jours)`
    : input.renewalTerms?.trim()
      ? input.renewalTerms.trim().slice(0, 90)
      : "Selon cahier des charges";
  keyValueTable("MÉTA-DONNÉES DU CONTRAT", [
    ["Date d'effet", input.startDate?.trim() || issued],
    ["Durée initiale", durationLabel],
    ["Droit applicable", "Droit malien — Juridictions de Bamako"],
  ]);

  // ---- Parties (tableaux libellé / valeur, comme la référence) ----
  drawCentered("ENTRE LES SOUSSIGNÉS", 11, fontBold, INK);
  y -= 18;

  keyValueTable("LE PRESTATAIRE", [
    ["Raison sociale", company.legalName],
    ["Forme juridique", company.legalForm.split(" - ")[1] ?? "SARL"],
    ["NIF / SIRET", company.fiscalId],
    ["Siège social", company.addressOneLine],
    [
      "Représentant légal",
      `${company.managerName} — ${company.managerTitle}`,
    ],
    ["E-mail", company.email],
    ["Téléphone", company.phones],
  ]);

  keyValueTable("LE CLIENT", [
    ["Nom / Raison sociale", input.clientCompany ?? input.clientName],
    ["Forme juridique", input.clientLegalForm?.trim() || "—"],
    ["NINA / RCCM", input.clientRegistryId?.trim() || "—"],
    ["Adresse", input.clientAddress?.trim() || "—"],
    [
      "Représentant légal",
      input.contactName
        ? `${input.contactName}${input.contactTitle ? ` — ${input.contactTitle}` : ""}`
        : "—",
    ],
    ["E-mail", input.clientEmail?.trim() || "—"],
    ["Téléphone", input.clientPhone?.trim() || "—"],
  ]);

  paragraph(
    "Ci-après désignés ensemble « les Parties » et individuellement « la Partie ». Il a été convenu et arrêté ce qui suit :",
    8.5,
    INK,
  );
  y -= 10;

  // Largeur utile pour les signatures (2 colonnes)
  const partyColW = contentW / 2 - 10;
  const clientX = margin + partyColW + 20;

  if (isFamilyA) {
    y = renderFamilyAArticles();
  } else {
    y = renderFamilyBSections();
  }

  // ---- Droit applicable et litiges (socle commun) ----
  if (isFamilyA) {
    sectionTitle("ARTICLE 12 - DROIT APPLICABLE ET REGLEMENT DES LITIGES");
    paragraph(
      `Le present contrat est soumis exclusivement au droit malien. En cas de litige, les Parties recherchent en priorite une solution amiable dans un delai de ${amicableDays} jours. A defaut, tout litige sera porte devant les juridictions competentes de Bamako, Republique du Mali.`,
    );
    y -= 4;
    paragraph(
      "Toute modification du present contrat doit faire l'objet d'un avenant ecrit signe par les deux Parties. La nullite d'une clause n'entraine pas la nullite du reste du contrat.",
      8.5,
    );
    y -= 10;
    sectionTitle("ARTICLE 13 - SIGNATURES");
    paragraph(
      "Les soussignes declarent avoir pris connaissance de l'ensemble des stipulations du present contrat et les accepter sans reserve. Le present contrat est conclu avec l'Annexe 1 (devis signe), dont il est inseparable.",
    );
    y -= 10;
  } else {
    sectionTitle("CONDITIONS CONTRACTUELLES");
    paragraph(
      "La presente prestation est regie par les Conditions Generales de Vente (CGV) de MSK CREATION SARL, qui definissent notamment les modalites de paiement, les conditions de realisation de la prestation, les responsabilites des parties ainsi que les conditions de resiliation et de maintenance.",
    );
    y -= 4;
    paragraph(
      "Le client reconnait avoir pris connaissance des CGV et les accepter sans reserve. En cas de contradiction entre le present cahier des charges et les CGV, les CGV prevaudront.",
    );
    y -= 4;
    paragraph(
      scope?.maintenanceMention ??
        "Un contrat de maintenance sera propose pour assurer les mises a jour mineures. Toute evolution, modification ou developpement de nouveaux modules fera l'objet d'un devis complementaire.",
      8.5,
    );
    y -= 4;
    paragraph(
      `Le present document est etabli dans le cadre du contrat ${input.number}. Le droit malien s'applique a titre supplementaire ; les juridictions de Bamako sont competentes pour tout litige non resolu par voie amiable.`,
      8.5,
    );
    y -= 10;
    sectionTitle("VALIDATION ET APPROBATION DU CAHIER DES CHARGES");
    paragraph(
      "En signant ce document, les deux parties s'engagent a respecter les specifications definies ci-dessus.",
    );
    y -= 10;
  }

  // ---- Signatures (tampon MSK + date saisie — pas d'e-sign) ----
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
  draw(page, `${input.contactName ?? input.clientName}${input.contactTitle ? ` (${input.contactTitle})` : ""}`, {
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
  draw(page, `Fait a Bamako, le ${input.signedAt ?? "____________"}, en deux (2) exemplaires originaux.`, {
    x: margin,
    y,
    size: 8,
    font,
    color: MUTED,
    maxWidth: contentW,
  });

  // ---- Pied de page + pagination (post-traitement, toutes les pages) ----
  const pages = pdf.getPages();
  pages.forEach((p, idx) => {
    // Filet pointillé au-dessus du pied (charte référence)
    const dashY = 52;
    const dash = 4;
    const gap = 3;
    let dx = margin;
    while (dx < PAGE_W - margin) {
      const end = Math.min(dx + dash, PAGE_W - margin);
      p.drawLine({
        start: { x: dx, y: dashY },
        end: { x: end, y: dashY },
        thickness: 0.7,
        color: BLUE,
      });
      dx = end + gap;
    }
    const footer1 = `Adresse : ${company.addressOneLine}`;
    const footer2 = `Numéro d'identifiant fiscal : ${company.fiscalId}  ·  E-mail : ${company.email}`;
    const footer3 = `Tél : ${company.phones}`;
    const center = (text: string, atY: number, size: number) => {
      const t = toWinAnsi(text);
      p.drawText(t, {
        x: (PAGE_W - font.widthOfTextAtSize(t, size)) / 2,
        y: atY,
        size,
        font,
        color: MUTED,
      });
    };
    center(footer1, 40, 6.5);
    center(footer2, 28, 6.5);
    center(footer3, 16, 6.5);
    drawRight(p, `Page ${idx + 1}/${pages.length}`, {
      right: PAGE_W - margin,
      y: 16,
      size: 7,
      font: fontOblique,
      color: MUTED,
    });
  });

  // ============================================================
  // Famille A — Articles 1 a 11 (prestation / abonnement)
  // ============================================================
  function renderFamilyAArticles(): number {
    sectionTitle("ARTICLE 1 - OBJET");
    const objet =
      input.serviceKind === "RESEAUX_SOCIAUX"
        ? "la gestion professionnelle des reseaux sociaux du Client par MSK CREATION"
        : `la realisation, pour le compte du Client, de la prestation « ${input.serviceKindLabel} » par MSK CREATION`;
    paragraph(
      `Le present contrat a pour objet ${objet}, conformement a l'offre souscrite definie a l'Article 2. Il encadre les conditions d'execution, de validation des contenus, de remuneration et de responsabilite des Parties.`,
      9,
      INK,
    );
    y -= 6;

    sectionTitle("ARTICLE 2 - OFFRE SOUSCRITE ET PRESTATIONS");
    paragraph(
      "Le Client a selectionne l'offre ci-dessous parmi les offres proposees par MSK CREATION. Le detail complet des prestations figure dans le devis joint en Annexe 1 ; en cas de contradiction entre le present article et le devis, le devis prevaut.",
    );
    y -= 4;

    if (input.serviceKind === "RESEAUX_SOCIAUX") {
      const tierMark = (tier: "STANDARD" | "PRO" | "PREMIUM") =>
        input.offerTier === tier ? "OUI (retenue)" : "—";
      table(
        ["", "STANDARD", "PRO", "PREMIUM"],
        [148, (contentW - 148) / 3, (contentW - 148) / 3, (contentW - 148) / 3],
        [
          [
            "Offre souscrite",
            tierMark("STANDARD"),
            tierMark("PRO"),
            tierMark("PREMIUM"),
          ],
          ...RS_OFFER_MATRIX.map((r) => [r.label, r.standard, r.pro, r.premium]),
        ],
      );
    }

    subTitle("Composition commerciale retenue :");
    ensureSpace(24);
    page.drawRectangle({ x: margin, y: y - 4, width: contentW, height: 18, color: BLUE });
    draw(page, "PRESTATION", { x: margin + 8, y: y + 1, size: 8, font: fontBold, color: WHITE });
    draw(page, "QTE", { x: margin + 340, y: y + 1, size: 8, font: fontBold, color: WHITE });
    drawRight(page, "MONTANT", {
      right: margin + contentW - 8,
      y: y + 1,
      size: 8,
      font: fontBold,
      color: WHITE,
    });
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
    y -= 22;

    subTitle("2.1 Prestations complementaires");
    paragraph(
      "Les tournages, captations photo/video et deplacements sur site ne sont pas inclus dans l'abonnement. Ils sont factures separement sur presentation d'un bon de commande valide par ecrit par le Client avant toute execution.",
      8.5,
    );
    if (input.complementaryServices?.length) {
      y -= 2;
      table(
        ["TYPE DE PRESTATION", "TARIF", "STATUT"],
        [contentW - 260, 130, 130],
        input.complementaryServices.map((c) => [
          c.type,
          c.tariff ?? "---",
          c.status ?? "Sur bon de commande",
        ]),
      );
    }
    y -= 4;

    sectionTitle("ARTICLE 3 - PROCESSUS DE VALIDATION ET ACCES");
    paragraph(
      "Chaque livrable est soumis a une validation finale par le Client via un dossier dedie sur l'infrastructure cloud de MSK CREATION. Le Client dispose d'un acces permanent a ce dossier.",
    );
    y -= 4;
    paragraph(
      `Le Client peut, par ecrit, deleguer la responsabilite de validation des contenus a MSK CREATION. A defaut, le Client s'engage a valider les contenus sous ${validationHours} heures ouvrees ; passe ce delai, les contenus seront reputes valides.`,
    );
    y -= 4;
    paragraph(
      `Le Client fournit les acces administrateurs aux comptes concernes dans les ${adminAccessHours} heures suivant la signature.`,
    );
    y -= 10;

    sectionTitle("ARTICLE 4 - DUREE ET RESILIATION");
    subTitle("4.1 Duree");
    paragraph(
      input.renewalTerms ??
        `Le contrat est conclu pour une duree initiale de trois (3) mois a compter du ${input.startDate ?? "---"}. A l'issue, il est renouvele automatiquement par periodes d'un (1) mois, sauf denonciation par l'une des Parties.`,
    );
    y -= 4;
    subTitle("4.2 Resiliation ordinaire");
    paragraph(
      `Chaque Partie peut resilier le contrat, a l'issue de la periode initiale, par preavis ecrit de ${noticeDays} jours. Le mois de preavis en cours reste integralement du.`,
    );
    y -= 4;
    subTitle("4.3 Resiliation pour manquement grave");
    paragraph(
      `En cas de manquement grave (non-paiement, publication non autorisee, donnees frauduleuses), la Partie lesee peut resilier sans indemnite, apres mise en demeure restee sans effet pendant ${cureDays} jours.`,
    );
    y -= 4;
    subTitle("4.4 Effets de la resiliation");
    paragraph(
      input.terminationTerms ??
        `A la resiliation : MSK CREATION restitue les acces sous ${accessReturnHours} heures ; les sommes dues jusqu'a la date effective restent exigibles ; les contenus produits et regles restent acquis au Client.`,
    );
    y -= 10;

    sectionTitle("ARTICLE 5 - REMUNERATION ET MODALITES DE PAIEMENT");
    table(
      ["", ""],
      [160, contentW - 160],
      [
        ["Montant mensuel", "Selon offre souscrite (cf. Article 2)"],
        ["Facturation", `Mensuelle - avant le ${input.billingDay ?? 5} de chaque mois`],
        [
          "Acompte au demarrage",
          `${depositPercent} % du premier mois - exige avant tout demarrage`,
        ],
        ["Modes de paiement", input.paymentTerms ?? "Virement bancaire | Orange Money | Wave | Cheque"],
        [
          "Retard de paiement",
          `Penalite de ${latePenaltyPercentPerWeek} % par semaine - suspension possible des prestations`,
        ],
        ["Resiliation anticipee", "Le mois de preavis en cours reste integralement du"],
      ],
    );

    sectionTitle("ARTICLE 6 - OBLIGATIONS DU PRESTATAIRE");
    paragraph("MSK CREATION s'engage a :", 9, INK);
    bulletList([
      "Executer les prestations avec diligence et professionnalisme",
      "Respecter l'identite visuelle et la ligne editoriale du Client",
      "Soumettre les contenus a validation prealable avant publication",
      "Informer le Client de toute difficulte affectant l'execution du contrat",
      "Maintenir la confidentialite des informations obtenues dans le cadre de la mission",
    ]);
    y -= 4;
    paragraph(
      "MSK CREATION est soumise a une obligation de moyens et non de resultat en ce qui concerne les performances commerciales.",
      8.5,
    );
    y -= 10;

    sectionTitle("ARTICLE 7 - OBLIGATIONS DU CLIENT");
    paragraph("Le Client s'engage a :", 9, INK);
    bulletList([
      "Fournir les visuels, informations, acces et elements necessaires dans des delais raisonnables",
      "Valider ou refuser les contenus dans un delai de 48 heures ouvrees",
      "Regler les sommes dues dans les delais convenus",
      "Ne pas modifier unilateralement la strategie definie sans en informer MSK CREATION",
    ]);
    y -= 10;

    sectionTitle("ARTICLE 8 - PROPRIETE INTELLECTUELLE");
    paragraph(
      "Les contenus crees par MSK CREATION restent sa propriete jusqu'au reglement integral des sommes dues. Apres paiement complet, le Client beneficie d'un droit d'utilisation pour ses besoins de communication. Les elements fournis par le Client (visuels, marques, textes) demeurent sa propriete exclusive.",
    );
    y -= 8;

    sectionTitle("ARTICLE 9 - CONFIDENTIALITE");
    paragraph(
      `Chaque Partie s'engage a garder strictement confidentielles toutes les informations commerciales, financieres et strategiques obtenues dans le cadre du present contrat, pendant sa duree et pendant ${confidentialityYears} ans apres sa cessation.`,
    );
    y -= 8;

    sectionTitle("ARTICLE 10 - PROTECTION DES DONNEES PERSONNELLES");
    paragraph(
      "Le traitement des donnees personnelles est soumis a la loi n. 2013-015 du 21 mai 2013 relative a la protection des donnees a caractere personnel au Mali (APDP). Le Client agit en qualite de Responsable du traitement ; MSK CREATION en qualite de Sous-traitant, traitant les donnees uniquement sur instruction du Client.",
    );
    y -= 4;
    paragraph(
      "MSK CREATION s'engage a mettre en oeuvre des mesures de securite appropriees et a notifier le Client sans delai en cas d'incident de securite affectant des donnees personnelles.",
      8.5,
    );
    y -= 8;

    sectionTitle("ARTICLE 11 - RESPONSABILITE ET FORCE MAJEURE");
    paragraph(
      `La responsabilite de MSK CREATION est limitee aux sommes percues au cours des ${liabilityCapMonths} derniers mois precedant le fait generateur. MSK CREATION ne saurait etre tenue responsable des resultats commerciaux du Client, des changements d'algorithmes des plateformes ou de cas de force majeure.`,
    );
    y -= 4;
    paragraph(
      "En cas de force majeure, la Partie concernee en informe l'autre sous 48 heures. Si l'evenement persiste au-dela de 30 jours, chaque Partie peut resilier sans indemnite.",
      8.5,
    );
    y -= 10;
    return y;
  }

  // ============================================================
  // Famille B — Cahier des charges (engagement)
  // ============================================================
  function renderFamilyBSections(): number {
    const ctx = scope ?? {
      contextProblems: [],
      objectives: [],
      deliverables: [],
      outOfScope: [],
    };

    sectionTitle("01 - CONTEXTE DU PROJET");
    table(
      ["", ""],
      [140, contentW - 140],
      [
        ["Client", input.clientCompany ?? input.clientName],
        [
          "Interlocuteur",
          [ctx.interlocutorName, ctx.interlocutorTitle].filter(Boolean).join(" - ") || "---",
        ],
        ["Localisation", ctx.location ?? "---"],
        ["Outils actuels", ctx.currentTools ?? "---"],
        ["Prestataire", `${company.legalName} SARL`],
      ],
    );
    subTitle("Problemes identifies avec l'outil actuel :");
    bulletList(ctx.contextProblems);
    y -= 4;
    subTitle("Vision cible :");
    paragraph(ctx.visionTarget ?? "---");
    y -= 10;

    sectionTitle("02 - OBJECTIFS FONCTIONNELS");
    bulletList(ctx.objectives);
    y -= 10;

    if (ctx.modules?.length) {
      sectionTitle("03 - MODULES FONCTIONNELS");
      paragraph(
        "L'application couvre les modules essentiels suivants, livres en une seule phase. Toute fonctionnalite supplementaire fera l'objet d'un devis complementaire.",
        8.5,
      );
      y -= 4;
      ctx.modules.forEach((m, idx) => {
        subTitle(`MODULE ${idx + 1} - ${m.name}`);
        bulletList(m.features);
        y -= 4;
      });
    } else if (ctx.pages?.length) {
      sectionTitle("03 - STRUCTURE DU SITE");
      table(
        ["N", "PAGE", "CONTENU"],
        [30, 110, contentW - 140],
        ctx.pages.map((p, idx) => [String(p.order ?? idx + 1), p.name, p.description]),
      );
    } else {
      sectionTitle("03 - PERIMETRE DU PROJET");
      paragraph("Perimetre detaille en Annexe 1 / devis — à préciser.", 8.5);
      y -= 4;
    }

    sectionTitle("04 - FONCTIONNALITES INCLUSES");
    if (ctx.includedFeatures?.length) {
      ctx.includedFeatures.forEach((g) => {
        subTitle(g.group);
        bulletList(g.items);
        y -= 4;
      });
    } else {
      paragraph("--- (fonctionnalites a preciser en Annexe 1 / devis) ---", 8.5);
      y -= 4;
    }

    if (ctx.roles?.length) {
      sectionTitle("05 - GESTION DES ACCES ET ROLES UTILISATEURS");
      table(
        ["ROLE", "ACCES", "DESCRIPTION"],
        [100, 100, contentW - 200],
        ctx.roles.map((r) => [r.role, r.access, r.description]),
      );
    }

    sectionTitle("LIVRABLES");
    bulletList(ctx.deliverables);
    y -= 10;

    sectionTitle("06 - PLANNING D'EXECUTION");
    if (ctx.planningPhases?.length) {
      table(
        ["N", "ETAPE", "CONTENU", "DUREE"],
        [25, 90, contentW - 115 - 70, 70],
        ctx.planningPhases.map((p, idx) => [
          p.number ?? String(idx + 1).padStart(2, "0"),
          p.name,
          p.content,
          p.duration,
        ]),
      );
    } else {
      paragraph("Planning detaille en Annexe 1 / devis — à préciser.", 8.5);
      y -= 4;
    }
    paragraph(
      `Duree totale estimee : ${ctx.totalDurationLabel ?? "---"}. ${
        ctx.delayRule ??
        "Tout retard dans les validations ou la fourniture des ressources decalera automatiquement le planning."
      }`,
      8.5,
    );
    y -= 10;

    sectionTitle("07 - RESSOURCES A FOURNIR PAR LE CLIENT");
    if (ctx.clientResources?.length) {
      table(
        ["RESSOURCE", "DESCRIPTION", "DELAI"],
        [140, contentW - 140 - 110, 110],
        ctx.clientResources.map((r) => [r.resource, r.description, r.due]),
      );
    } else {
      paragraph("Ressources requises precisees en Annexe 1 / devis — à préciser.", 8.5);
      y -= 4;
    }

    sectionTitle("08 - CRITERES DE RECETTE ET VALIDATION");
    paragraph(
      `Une recette formelle est realisee en fin de developpement, avant la mise en production. Le Client dispose de ${ctx.acceptanceDays ?? 7} jours ouvres pour valider ou transmettre ses reserves motivees. Sans retour dans ce delai, la prestation est reputee validee et acceptee sans reserve.`,
    );
    y -= 4;
    paragraph(
      `Les echanges de recette s'effectuent via ${ctx.acceptanceChannel ?? "le dossier partage MSK CREATION"}. Toute demande de fonctionnalite supplementaire hors perimetre fera l'objet d'un devis complementaire specifique.`,
      8.5,
    );
    y -= 10;

    sectionTitle("09 - HORS PERIMETRE - NON INCLUS");
    bulletList(ctx.outOfScope);
    return y - 10;
  }

  return pdf.save();
}
