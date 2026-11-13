/**
 * OCR / parsing factures charges (Orange, EDM, Loyer, Autre).
 * Seed était one-shot ad hoc → parsers réutilisables ici.
 */
import type { SvExpenseCategory } from "@/generated/prisma/client";

export type ExpenseOcrFields = {
  category: SvExpenseCategory;
  vendorName: string;
  vendorRef: string;
  number: string;
  issuedAt: string;
  dueAt: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  totalHt: number;
  totalVat: number;
  totalTtc: number;
  object: string;
  notes: string;
};

export type ExpenseOcrResult = {
  ok: true;
  fields: ExpenseOcrFields;
  detected: SvExpenseCategory | "UNKNOWN";
  source: "pdf-text" | "ocr-image" | "ocr-pdf-scan";
  confidence: "high" | "medium" | "low";
  warnings: string[];
};

export type ExpenseOcrFailure = {
  ok: false;
  error: string;
};

const MIN_TEXT_CHARS = 40;

/** JJ/MM/AAAA → YYYY-MM-DD (UTC date-only). */
export function parseFrDateToIso(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Montants FR (« 65 600 », « 85149 », « 47.615 ») → entier FCFA. */
export function parseFrAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/\u00a0/g, " ")
    .replace(/FCFA|F\.?\s*CFA|F\b/gi, "")
    .replace(/\s+/g, "")
    .replace(/,(?=\d{3}\b)/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Math.round(Number(cleaned));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function monthLabelFr(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return "";
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function emptyFields(
  partial: Partial<ExpenseOcrFields> & { category: SvExpenseCategory },
): ExpenseOcrFields {
  return {
    category: partial.category,
    vendorName: partial.vendorName ?? "",
    vendorRef: partial.vendorRef ?? "",
    number: partial.number ?? "",
    issuedAt: partial.issuedAt ?? "",
    dueAt: partial.dueAt ?? "",
    periodStart: partial.periodStart ?? "",
    periodEnd: partial.periodEnd ?? "",
    periodLabel: partial.periodLabel ?? "",
    totalHt: partial.totalHt ?? 0,
    totalVat: partial.totalVat ?? 0,
    totalTtc: partial.totalTtc ?? 0,
    object: partial.object ?? "",
    notes: partial.notes ?? "",
  };
}

export function detectExpenseVendor(
  text: string,
): SvExpenseCategory | "UNKNOWN" {
  const t = text.toLowerCase();
  if (
    /orange\s+mali|facture\s+orange|orangemali|internet\s+fo\s+b2b/.test(t)
  ) {
    return "ORANGE_INTERNET";
  }
  if (
    /energie\s+du\s+mali|énergie\s+du\s+mali|edm[-\s]?s\.?a|edm\b/.test(t) &&
    /facture|kwh|électricité|electricite/.test(t)
  ) {
    return "EDM_ELECTRICITE";
  }
  if (
    /loyer|gamby|modibo\s+hamaye|location\s+appartement|periode\s*\(1\s*mois\)/.test(
      t,
    )
  ) {
    return "LOYER";
  }
  return "UNKNOWN";
}

function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m?.[1]?.trim() ?? null;
}

function firstAmount(text: string, re: RegExp): number | null {
  const raw = firstMatch(text, re);
  return raw ? parseFrAmount(raw) : null;
}

function firstDate(text: string, re: RegExp): string | null {
  const raw = firstMatch(text, re);
  return raw ? parseFrDateToIso(raw) : null;
}

/** Totaux Orange : HT + TVA18% + Facture + FDS10% + Total (pdftotext ou unpdf). */
function findOrangeAmountBlock(text: string): {
  ht: number;
  vat: number;
  ttc: number;
} | null {
  const labeledHt = firstAmount(text, /Montant\s+HT\s*:\s*([\d\s.,]+)/i);
  const labeledVat = firstAmount(text, /TVA\s*18\s*%\s*:\s*([\d\s.,]+)/i);
  const labeledTotal =
    firstAmount(text, /Pr[ée]l[èe]vement[\s\S]{0,120}?Total\s*:\s*([\d\s.,]+)/i) ??
    firstAmount(text, /(?:^|\n)\s*Total\s*:\s*([\d\s.,]+)\s*FCFA/im);
  if (labeledHt && labeledVat && labeledTotal) {
    return { ht: labeledHt, vat: labeledVat, ttc: labeledTotal };
  }

  const amounts: number[] = [];
  for (const m of text.matchAll(/(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)\s*FCFA/gi)) {
    const n = parseFrAmount(m[1]!);
    if (n != null && n >= 1000) amounts.push(n);
  }
  for (let i = 0; i < amounts.length - 4; i++) {
    const ht = amounts[i]!;
    const vat = amounts[i + 1]!;
    const facture = amounts[i + 2]!;
    const fds = amounts[i + 3]!;
    const total = amounts[i + 4]!;
    if (Math.abs(ht + vat - facture) > 2) continue;
    if (Math.abs(Math.round(facture * 0.1) - fds) > 5) continue;
    if (Math.abs(facture + fds - total) > 2) continue;
    return { ht, vat, ttc: total };
  }
  return null;
}

/** Parser Orange Mali (couche texte PDF — pdftotext ou unpdf). */
export function parseOrangeExpenseText(text: string): ExpenseOcrFields {
  const number = firstMatch(text, /\b(CB\d{10,})\b/) ?? "";
  const client =
    firstMatch(text, /\b(A\d{11,})\b/) ??
    firstMatch(text, /Client\s*:\s*([A-Z0-9]+)/i) ??
    "";
  const compte =
    firstMatch(text, /\b(CB\d{4,6})\b(?!\d)/) ??
    firstMatch(text, /Compte\s*:\s*([A-Z0-9]+)/i) ??
    "";

  const periodPair = text.match(
    /du\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\s+au\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})/i,
  );
  const periodStart = periodPair ? parseFrDateToIso(periodPair[1]!) ?? "" : "";
  const periodEnd = periodPair ? parseFrDateToIso(periodPair[2]!) ?? "" : "";

  const dueAt =
    firstDate(
      text,
      /Date\s+limite\s+de\s+Paye?ment\s*:\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})/i,
    ) ??
    (() => {
      const re = /Date\s+limite\s+de\s+Paye?ment/gi;
      let lastIdx = -1;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) lastIdx = m.index;
      if (lastIdx < 0) return null;
      const slice = text.slice(lastIdx, lastIdx + 700);
      const dates = [...slice.matchAll(/(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})/g)]
        .map((d) => parseFrDateToIso(d[1]!))
        .filter(
          (d): d is string =>
            !!d && d !== periodStart && d !== periodEnd,
        );
      return dates.at(-1) ?? null;
    })() ??
    "";

  const issuedAt =
    firstDate(text, /(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\s*R[ée]gime\s+Fiscal/i) ??
    firstDate(
      text,
      /FACTURE\s+ORANGE[\s\S]{0,160}?(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})/i,
    ) ??
    (() => {
      const idx = text.search(/FACTURE\s+ORANGE/i);
      if (idx < 0) return null;
      const before = text.slice(Math.max(0, idx - 1600), idx);
      const dates = [...before.matchAll(/(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})/g)];
      const last = dates.at(-1);
      return last ? parseFrDateToIso(last[1]!) : null;
    })() ??
    "";

  const block = findOrangeAmountBlock(text);
  const totalHt = block?.ht ?? 0;
  const totalVat = block?.vat ?? 0;
  const totalTtc = block?.ttc ?? 0;

  const periodLabel = periodStart ? monthLabelFr(periodStart) : "";
  const object = periodLabel
    ? `Orange Internet FO B2B — ${periodLabel.toLowerCase()}`
    : "Orange Internet FO B2B";

  return emptyFields({
    category: "ORANGE_INTERNET",
    vendorName: "Orange Mali",
    vendorRef: [compte, client].filter(Boolean).join(" / "),
    number,
    issuedAt,
    dueAt,
    periodStart,
    periodEnd,
    periodLabel,
    totalHt,
    totalVat,
    totalTtc,
    object,
    notes: "Extrait automatiquement (Orange).",
  });
}

/** Un seul montant FCFA (évite « 37 796 6 803 » → TVA OCR). */
function firstSingleAmount(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m?.[1]) return null;
  const token = m[1].trim().match(/^(\d{1,3}(?:[ \u00a0]\d{3}){0,2}|\d{1,7})/);
  return token ? parseFrAmount(token[1]!) : null;
}

/** Parser EDM (souvent scan OCR). */
export function parseEdmExpenseText(text: string): ExpenseOcrFields {
  const number =
    firstMatch(text, /FACTURE\s*N[°º]?\s*(\d+)/i) ??
    firstMatch(text, /Facture\s*N[°º]?\s*(\d+)/i) ??
    "";
  const issuedAt =
    firstDate(text, /FACTURE\s*N[°º]?\s*\d+\s+du\s+(\d{2}\/\d{2}\/\d{4})/i) ??
    firstDate(
      text,
      /(\d{2}\/\d{2}\/\d{4})[\s\S]{0,100}?FACTURE\s*N[°º]?\s*\d+/i,
    ) ??
    "";
  const dueAt =
    firstDate(text, /Payable\s+avant\s+le\s+(\d{2}\/\d{2}\/\d{4})/i) ??
    firstDate(
      text,
      /Date\s+limite[\s\S]{0,80}?(\d{2}\/\d{2}\/\d{4})/i,
    ) ??
    firstDate(text, /(\d{2}\/\d{2}\/\d{4})\s+47\s*615/) ??
    "";
  const periodStart =
    firstDate(
      text,
      /P[ée]riode\s+de\s+consommation\s+du\s+(\d{2}\/\d{2}\/\d{4})/i,
    ) ?? "";
  const periodEnd =
    firstDate(
      text,
      /P[ée]riode\s+de\s+consommation\s+du\s+\d{2}\/\d{2}\/\d{4}\s+au\s+(\d{2}\/\d{2}\/\d{4})/i,
    ) ?? "";
  const periodLabel =
    firstMatch(text, /P[ée]riode\s+de\s+facturation\s+(\d{1,2}\/\d{4})/i) ??
    (periodStart ? monthLabelFr(periodStart) : "");
  const clientRef =
    firstMatch(text, /N[°º]\s*Client\s*([0-9\s]+)/i)?.replace(/\s+/g, " ").trim() ??
    "";
  const totalHt =
    firstSingleAmount(text, /Montant\s+HT\s*([\d\s.,]+)/i) ?? 0;
  const totalVat =
    firstSingleAmount(text, /Taxes\s+([\d\s.,]+)/i) ??
    firstSingleAmount(text, /TVA\s*18\s*%[^\d\n]{0,40}?([\d\s.,]+)/i) ??
    0;
  // Préférer montant chèque (sans timbre) quand présent
  const totalTtc =
    firstSingleAmount(
      text,
      /Montant\s+de\s+la\s+facture\s*([\d\s.,]+)[\s\S]{0,80}si\s+paiement\s+par\s+ch[eè]que/i,
    ) ??
    firstSingleAmount(text, /TTC\s*([\d\s.,]+)/i) ??
    firstSingleAmount(text, /Montant\s+de\s+la\s+facture\s*([\d\s.,]+)/i) ??
    0;

  return emptyFields({
    category: "EDM_ELECTRICITE",
    vendorName: "Énergie du Mali (EDM-S.A.)",
    vendorRef: clientRef,
    number,
    issuedAt,
    dueAt,
    periodStart,
    periodEnd,
    periodLabel,
    totalHt,
    totalVat,
    totalTtc,
    object: periodLabel
      ? `EDM électricité — ${periodLabel}`
      : "EDM électricité",
    notes: "Extrait automatiquement (EDM).",
  });
}

/** Parser loyer / GAMBY (souvent scan OCR). */
export function parseLoyerExpenseText(text: string): ExpenseOcrFields {
  const number =
    firstMatch(text, /FACTURE\s*N[°º]?\s*([0-9/]+)/i) ?? "";
  const issuedAt =
    firstDate(text, /Bamako,?\s*le\s+(\d{2}\/\d{2}\/\d{4})/i) ?? "";
  const periodStart =
    firstDate(text, /du\s+(\d{2}\/\d{2}\/\d{4})\s+au\s+\d{2}\/\d{2}\/\d{4}/i) ??
    "";
  const periodEnd =
    firstDate(text, /du\s+\d{2}\/\d{2}\/\d{4}\s+au\s+(\d{2}\/\d{2}\/\d{4})/i) ??
    "";
  const nif = firstMatch(text, /NIF\s*:\s*([A-Z0-9]+)/i) ?? "";
  const addr =
    firstMatch(text, /(GAMBYLA[^\n]+)/i)?.replace(/\s+/g, "") ?? "";
  const amount =
    firstAmount(text, /Montant\s*:\s*([\d\s.,]+)/i) ??
    firstAmount(text, /=\s*([\d\s.,]+)\s*F\.?CFA/i) ??
    0;
  const dueAt = issuedAt
    ? addDaysIso(issuedAt, 5)
    : "";

  const periodLabel = periodStart ? monthLabelFr(periodStart) : "";
  const vendorBits = [nif ? `NIF ${nif}` : "", addr].filter(Boolean);

  return emptyFields({
    category: "LOYER",
    vendorName: "Modibo Hamaye GAMBY",
    vendorRef: vendorBits.join(" · "),
    number,
    issuedAt,
    dueAt,
    periodStart,
    periodEnd,
    periodLabel,
    totalHt: amount,
    totalVat: 0,
    totalTtc: amount,
    object: periodLabel
      ? `Loyer appartement — ${periodLabel.toLowerCase()}`
      : "Loyer appartement",
    notes:
      "Extrait automatiquement (loyer). Échéance = émission + 5 j si « après réception ».",
  });
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Parser générique (peu de champs). */
export function parseAutreExpenseText(text: string): ExpenseOcrFields {
  const number =
    firstMatch(text, /FACTURE\s*N[°º]?\s*([A-Z0-9/.-]+)/i) ??
    firstMatch(text, /N[°º]\s*[:\s]+([A-Z0-9/.-]+)/i) ??
    "";
  const issuedAt =
    firstDate(text, /(?:le|du)\s+(\d{2}\/\d{2}\/\d{4})/i) ??
    firstDate(text, /(\d{2}\/\d{2}\/\d{4})/) ??
    "";
  const dueAt =
    firstDate(text, /(?:[ée]ch[ée]ance|payable|limite)[^\d]*(\d{2}\/\d{2}\/\d{4})/i) ??
    "";
  const totalTtc =
    firstAmount(text, /(?:TOTAL|TTC|Montant)[^\d]{0,20}([\d\s.,]+)/i) ?? 0;

  return emptyFields({
    category: "AUTRE",
    number,
    issuedAt,
    dueAt,
    totalTtc,
    totalHt: totalTtc,
    notes: "Extraction partielle — vérifiez et complétez.",
  });
}

export function parseExpenseText(
  text: string,
  forcedCategory?: SvExpenseCategory,
): {
  fields: ExpenseOcrFields;
  detected: SvExpenseCategory | "UNKNOWN";
  confidence: "high" | "medium" | "low";
  warnings: string[];
} {
  const detected = detectExpenseVendor(text);
  const category = forcedCategory ?? (detected === "UNKNOWN" ? "AUTRE" : detected);
  const warnings: string[] = [];

  let fields: ExpenseOcrFields;
  switch (category) {
    case "ORANGE_INTERNET":
      fields = parseOrangeExpenseText(text);
      break;
    case "EDM_ELECTRICITE":
      fields = parseEdmExpenseText(text);
      break;
    case "LOYER":
      fields = parseLoyerExpenseText(text);
      break;
    default:
      fields = parseAutreExpenseText(text);
      warnings.push("Type non reconnu automatiquement — classé en Autre.");
  }

  if (!fields.totalTtc) {
    warnings.push("Montant TTC non trouvé — saisissez-le à la main.");
  }
  if (!fields.number) {
    warnings.push("N° de facture non trouvé.");
  }
  if (!fields.dueAt && !fields.issuedAt) {
    warnings.push("Dates non trouvées.");
  }

  const filled = [
    fields.number,
    fields.issuedAt,
    fields.dueAt,
    fields.totalTtc > 0,
    fields.vendorName,
  ].filter(Boolean).length;
  const confidence =
    filled >= 4 ? "high" : filled >= 2 ? "medium" : "low";

  return { fields, detected, confidence, warnings };
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function ocrImageBytes(bytes: Buffer | Uint8Array): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("fra+eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(Buffer.from(bytes));
    return text ?? "";
  } finally {
    await worker.terminate();
  }
}

/**
 * Extrait le texte d’un PDF (couche texte) ou d’une image (OCR).
 * PDF scanné sans texte → OCR image page 1 si `@napi-rs/canvas` dispo, sinon erreur claire.
 */
export async function extractExpenseDocumentText(input: {
  bytes: Buffer;
  mime: string;
}): Promise<
  | { ok: true; text: string; source: ExpenseOcrResult["source"] }
  | ExpenseOcrFailure
> {
  const mime = input.mime.toLowerCase();
  const bytes = input.bytes;

  if (mime.startsWith("image/")) {
    try {
      const text = await ocrImageBytes(bytes);
      if (text.trim().length < MIN_TEXT_CHARS) {
        return {
          ok: false,
          error:
            "Lecture image trop faible. Essayez une photo plus nette ou un PDF texte.",
        };
      }
      return { ok: true, text, source: "ocr-image" };
    } catch {
      return {
        ok: false,
        error: "Impossible de lire l’image. Réessayez ou saisissez à la main.",
      };
    }
  }

  if (mime !== "application/pdf") {
    return {
      ok: false,
      error: "Format non supporté. Utilisez un PDF ou une image (JPEG/PNG/WebP).",
    };
  }

  try {
    const text = await extractPdfText(new Uint8Array(bytes));
    if (text.trim().length >= MIN_TEXT_CHARS) {
      return { ok: true, text, source: "pdf-text" };
    }
  } catch {
    // continue vers OCR scan
  }

  // PDF scanné : rendu page 1 + OCR (nécessite @napi-rs/canvas en Node)
  try {
    const { renderPageAsImage } = await import("unpdf");
    const png = await renderPageAsImage(new Uint8Array(bytes), 1, {
      canvasImport: () => import("@napi-rs/canvas"),
      scale: 1.5,
    });
    const text = await ocrImageBytes(new Uint8Array(png));
    if (text.trim().length < MIN_TEXT_CHARS) {
      return {
        ok: false,
        error:
          "PDF scanné illisible. Déposez une photo JPEG/PNG nette de la facture.",
      };
    }
    return { ok: true, text, source: "ocr-pdf-scan" };
  } catch {
    return {
      ok: false,
      error:
        "Ce PDF semble scanné (sans texte). Déposez une photo JPEG/PNG, ou un PDF Orange numérique.",
    };
  }
}

/** Pipeline complet : bytes → champs formulaire. */
export async function parseExpenseDocument(input: {
  bytes: Buffer;
  mime: string;
  categoryHint?: SvExpenseCategory;
}): Promise<ExpenseOcrResult | ExpenseOcrFailure> {
  const extracted = await extractExpenseDocumentText(input);
  if (!extracted.ok) return extracted;

  const parsed = parseExpenseText(extracted.text, input.categoryHint);
  if (!parsed.fields.totalTtc && parsed.confidence === "low") {
    return {
      ok: false,
      error:
        "Impossible d’extraire les infos utiles. Vérifiez le document ou saisissez à la main.",
    };
  }

  return {
    ok: true,
    fields: parsed.fields,
    detected: parsed.detected,
    source: extracted.source,
    confidence: parsed.confidence,
    warnings: parsed.warnings,
  };
}
