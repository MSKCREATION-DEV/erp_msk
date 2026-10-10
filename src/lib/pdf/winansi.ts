/**
 * Helvetica / polices standard pdf-lib = encodage WinAnsi (Windows-1252).
 * Intl `fr-FR` injecte U+202F (espace fine insécable) → crash "WinAnsi cannot encode".
 * Retours chariot / sauts de ligne (0x0D, 0x0A) aussi refusés par pdf-lib drawText.
 * @see https://github.com/Hopding/pdf-lib/issues/217
 */
export function toWinAnsi(input: string): string {
  return input
    .normalize("NFC")
    // CR/LF/TAB → espace (drawText WinAnsi n’accepte pas 0x0D / 0x0A)
    .replace(/\r\n/g, " ")
    .replace(/[\r\n\t\f\v]/g, " ")
    // Espaces Unicode → espace ASCII
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u2008\u200B\uFEFF]/g, " ")
    // Tirets / quotes typographiques → équivalents WinAnsi sûrs
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2026/g, "...")
    // Compacte espaces multiples
    .replace(/ {2,}/g, " ")
    .trim()
    // Latin-1 imprimable uniquement (pas de contrôles)
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

/** Découpe un texte en lignes WinAnsi-safe (pour blocs objet / clauses). */
export function toWinAnsiLines(input: string): string[] {
  return input
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => toWinAnsi(line))
    .filter((line) => line.length > 0);
}

export function formatMoneyFr(n: number): string {
  return toWinAnsi(
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n),
  );
}

export function formatDateFr(d = new Date()): string {
  return toWinAnsi(d.toLocaleDateString("fr-FR"));
}
