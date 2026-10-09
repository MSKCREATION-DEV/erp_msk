import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatDateFr, formatMoneyFr, toWinAnsi } from "@/lib/pdf/winansi";

const MSK_BLUE = rgb(29 / 255, 115 / 255, 188 / 255);
const MSK_INK = rgb(13 / 255, 19 / 255, 48 / 255);
const MSK_MUTED = rgb(138 / 255, 147 / 255, 166 / 255);

export type CommercialPdfInput = {
  type: "DEVIS" | "FACTURE";
  number: string;
  clientName: string;
  clientAddress?: string;
  lines: { label: string; qty: number; unitPrice: number }[];
  currency?: string;
  vatRate?: number;
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
  },
) {
  page.drawText(toWinAnsi(text), opts);
}

export async function generateCommercialPdf(
  input: CommercialPdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  const currency = input.currency ?? "XOF";
  const vatRate = input.vatRate ?? 18;
  const title = input.type === "DEVIS" ? "DEVIS" : "FACTURE";

  page.drawRectangle({
    x: 0,
    y: height - 56,
    width,
    height: 56,
    color: MSK_BLUE,
  });
  draw(page, "MSK CREATION", {
    x: 40,
    y: height - 36,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  draw(page, title, {
    x: width - 140,
    y: height - 36,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  let y = height - 90;
  draw(page, `N° ${input.number}`, {
    x: 40,
    y,
    size: 11,
    font: fontBold,
    color: MSK_INK,
  });
  y -= 18;
  draw(page, `Date : ${formatDateFr()}`, {
    x: 40,
    y,
    size: 10,
    font,
    color: MSK_MUTED,
  });

  y -= 36;
  draw(page, "Client", {
    x: 40,
    y,
    size: 9,
    font: fontBold,
    color: MSK_BLUE,
  });
  y -= 16;
  draw(page, input.clientName, {
    x: 40,
    y,
    size: 12,
    font: fontBold,
    color: MSK_INK,
  });
  if (input.clientAddress) {
    y -= 14;
    draw(page, input.clientAddress, {
      x: 40,
      y,
      size: 10,
      font,
      color: MSK_MUTED,
    });
  }

  y -= 36;
  page.drawRectangle({
    x: 40,
    y: y - 4,
    width: width - 80,
    height: 22,
    color: rgb(0.95, 0.96, 0.98),
  });
  draw(page, "Désignation", {
    x: 48,
    y: y + 2,
    size: 9,
    font: fontBold,
    color: MSK_INK,
  });
  draw(page, "Qté", { x: 340, y: y + 2, size: 9, font: fontBold, color: MSK_INK });
  draw(page, "P.U.", { x: 400, y: y + 2, size: 9, font: fontBold, color: MSK_INK });
  draw(page, "Total", { x: 480, y: y + 2, size: 9, font: fontBold, color: MSK_INK });
  y -= 28;

  let ht = 0;
  for (const line of input.lines) {
    const lineTotal = line.qty * line.unitPrice;
    ht += lineTotal;
    draw(page, line.label.slice(0, 48), {
      x: 48,
      y,
      size: 10,
      font,
      color: MSK_INK,
    });
    draw(page, String(line.qty), {
      x: 340,
      y,
      size: 10,
      font,
      color: MSK_INK,
    });
    draw(page, formatMoneyFr(line.unitPrice), {
      x: 400,
      y,
      size: 10,
      font,
      color: MSK_INK,
    });
    draw(page, formatMoneyFr(lineTotal), {
      x: 480,
      y,
      size: 10,
      font,
      color: MSK_INK,
    });
    y -= 18;
  }

  const vat = Math.round(ht * (vatRate / 100));
  const ttc = ht + vat;
  y -= 20;
  draw(page, `Total HT : ${formatMoneyFr(ht)} ${currency}`, {
    x: 360,
    y,
    size: 10,
    font,
    color: MSK_INK,
  });
  y -= 16;
  draw(page, `TVA ${vatRate} % : ${formatMoneyFr(vat)} ${currency}`, {
    x: 360,
    y,
    size: 10,
    font,
    color: MSK_MUTED,
  });
  y -= 18;
  draw(page, `Total TTC : ${formatMoneyFr(ttc)} ${currency}`, {
    x: 360,
    y,
    size: 12,
    font: fontBold,
    color: MSK_BLUE,
  });

  y = 120;
  draw(page, "Signature", {
    x: 40,
    y,
    size: 9,
    font: fontBold,
    color: MSK_MUTED,
  });
  page.drawRectangle({
    x: 40,
    y: 50,
    width: 180,
    height: 60,
    borderColor: MSK_MUTED,
    borderWidth: 1,
  });
  draw(page, "MSK CREATION - document généré ERP", {
    x: 40,
    y: 28,
    size: 8,
    font,
    color: MSK_MUTED,
  });

  return pdf.save();
}
