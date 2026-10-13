/** Clés supportées dans les modèles ({{…}} et […]). */
export type ScriptVars = {
  prenom?: string;
  commercial?: string;
  entreprise?: string;
  secteur?: string;
  ville?: string;
  resultat?: string;
  source?: string;
  jour?: string;
  offre?: string;
  exemple?: string;
  date?: string;
  montant?: string;
};

export const SCRIPT_VAR_KEYS = [
  "prenom",
  "commercial",
  "entreprise",
  "secteur",
  "ville",
  "resultat",
  "source",
  "jour",
  "offre",
  "exemple",
  "date",
  "montant",
] as const satisfies readonly (keyof ScriptVars)[];

export const SCRIPT_VAR_LABELS: Record<keyof ScriptVars, string> = {
  prenom: "Prénom",
  commercial: "Commercial",
  entreprise: "Entreprise",
  secteur: "Secteur",
  ville: "Ville",
  resultat: "Résultat concret",
  source: "Origine / source",
  jour: "Jour (relance)",
  offre: "Offre / service",
  exemple: "Exemple réalisation",
  date: "Date",
  montant: "Montant",
};

/** Remplace {{var}} et variantes Excel [PRÉNOM], [VOTRE NOM], etc. */
export function fillScriptTemplate(
  body: string,
  vars: ScriptVars,
): string {
  const map: Record<string, string> = {};
  for (const k of SCRIPT_VAR_KEYS) {
    map[k] = (vars[k] ?? "").trim();
  }

  let out = body;
  for (const [k, v] of Object.entries(map)) {
    const reBrace = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "gi");
    const reBracket = new RegExp(`\\[\\s*${k}\\s*\\]`, "gi");
    out = out.replace(reBrace, v).replace(reBracket, v);
  }

  // Alias FR / Excel GUIDE
  const aliases: [RegExp, string][] = [
    [/\{\{\s*prénom\s*\}\}/gi, map.prenom],
    [/\[\s*PRÉNOM\s*\]/gi, map.prenom],
    [/\[\s*VOTRE\s+NOM\s*\]/gi, map.commercial],
    [/\[\s*COMMERCIAL\s*\]/gi, map.commercial],
    [/\[\s*ENTREPRISE\s*\]/gi, map.entreprise],
    [/\[\s*SECTEUR(?:\s*\/\s*DOMAINE)?\s*\]/gi, map.secteur],
    [/\[\s*SECTEUR\s+SIMILAIRE\s*\]/gi, map.secteur],
    [/\[\s*VILLE\s*\]/gi, map.ville],
    [/\[\s*RÉSULTAT\s+CONCRET[^\]]*\]/gi, map.resultat],
    [/\[\s*SOURCE[^\]]*\]/gi, map.source],
    [/\[\s*JOUR\s*\]/gi, map.jour],
    [/\[\s*OFFRE\s*\]/gi, map.offre],
    [/\[\s*SERVICE\s*\]/gi, map.offre],
    [/\[\s*SUJET(?:\s*\/\s*SERVICE)?\s*\]/gi, map.offre],
    [/\[\s*EXEMPLE\s+DE\s+RÉALISATION\s+RÉCENTE\s*\]/gi, map.exemple],
    [/\[\s*DATE\s*\]/gi, map.date],
    [/\[\s*MONTANT\s*\]/gi, map.montant],
  ];
  for (const [re, v] of aliases) {
    out = out.replace(re, v);
  }

  return out;
}
