/**
 * Coordonnées légales MSK — alignées contrats / devis / factures.
 * Accents restaurés (2026-11-08) pour coller aux documents de référence
 * réels (contrats / soldes hors dépôt Git) — WinAnsi (`toWinAnsi`)
 * supporte le Latin-1 accentué sans problème, aucune contrainte technique
 * ne justifiait l'absence d'accents.
 */
export const company = {
  legalName: "MSK CREATION",
  legalForm: "MSK CREATION - SARL",
  tagline: "Agence de communication et de création digitale",
  capital: "1.000.000 Francs CFA",
  rccm: "MA.BKO.2025 B 01",
  managerName: "Mathieu Diarra",
  managerTitle: "gérant",
  addressLines: [
    "ACI 2000, 2e étage, Porte B4",
    "Immeuble Gamby Lah, Bamako",
  ],
  addressOneLine:
    "ACI 2000, 2e étage, Porte B4, Immeuble Gamby Lah, Bamako",
  fiscalId: "085156924A",
  iban: "ML1810 1001 0043 9122 4101 57",
  email: "contact@mskcreation.net",
  phones: "+223 70 68 90 91 / +223 44 90 76 32 / +33 7 51 32 52 38",
  currency: "FCFA",
  weeklyHours: 40,
} as const;
