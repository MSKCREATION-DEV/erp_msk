/** Affichage numéro document : officiel sinon brouillon. */
export function displayDocNumber(
  number: string | null | undefined,
  draftCode?: string | null,
): string {
  if (number && number.trim()) return number;
  if (draftCode && draftCode.trim()) return draftCode;
  return "—";
}
