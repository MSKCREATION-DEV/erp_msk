/**
 * Helvetica / polices standard pdf-lib = encodage WinAnsi (Windows-1252).
 * Intl `fr-FR` injecte U+202F (espace fine insécable) → crash "WinAnsi cannot encode".
 * @see https://github.com/Hopding/pdf-lib/issues/217
 */
export function toWinAnsi(input: string): string {
  return input
    .normalize("NFC")
    // Espaces Unicode → espace ASCII
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u2008]/g, " ")
    // Tirets / quotes typographiques → équivalents WinAnsi sûrs
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2026/g, "...")
    // Tout code point hors Latin-1 / WinAnsi courant → ?
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

export function formatMoneyFr(n: number): string {
  return toWinAnsi(
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n),
  );
}

export function formatDateFr(d = new Date()): string {
  return toWinAnsi(d.toLocaleDateString("fr-FR"));
}
