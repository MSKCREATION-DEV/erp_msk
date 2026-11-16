/**
 * Modes de paiement Suivi (ChoiceCards / OptionPicker — jamais `<select>` natif).
 *
 * Pattern « Autre » (absolu sur ces formulaires) :
 * si l’utilisateur choisit `Autre`, un champ texte libre s’ouvre pour préciser
 * (ex. « Western Union », « Carte bancaire »). La valeur persistée = le détail
 * (ou « Autre » si le détail est vide et non requis).
 */

export const SV_PAYMENT_MODES = [
  "Espèces",
  "Orange Money",
  "Wave",
  "Virement",
  "Chèque",
  "Autre",
] as const;

export type SvPaymentMode = (typeof SV_PAYMENT_MODES)[number];

export const SV_PAYMENT_MODE_OTHER = "Autre" as const;

export function isSvPaymentModeOther(mode: string | null | undefined): boolean {
  return (mode ?? "").trim() === SV_PAYMENT_MODE_OTHER;
}

/**
 * Résout la valeur à stocker (paymentMethod / method).
 * Mode connu hors Autre → libellé mode.
 * Autre → détail trimé (obligatoire côté UI/Zod si Autre).
 */
export function resolveSvPaymentMethod(
  mode: string,
  otherDetail?: string | null,
): string {
  const m = mode.trim();
  if (!m) return "";
  if (isSvPaymentModeOther(m)) {
    return (otherDetail ?? "").trim();
  }
  return m;
}
