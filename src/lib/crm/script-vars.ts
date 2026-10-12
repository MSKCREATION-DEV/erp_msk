/** Remplace {{prenom}}, {{entreprise}}, {{offre}}, {{commercial}} et variantes [PRÉNOM]. */
export function fillScriptTemplate(
  body: string,
  vars: {
    prenom?: string;
    entreprise?: string;
    offre?: string;
    commercial?: string;
  },
): string {
  const map: Record<string, string> = {
    prenom: vars.prenom ?? "",
    entreprise: vars.entreprise ?? "",
    offre: vars.offre ?? "",
    commercial: vars.commercial ?? "",
  };

  let out = body;
  for (const [k, v] of Object.entries(map)) {
    const reBrace = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "gi");
    const reBracket = new RegExp(`\\[\\s*${k}\\s*\\]`, "gi");
    out = out.replace(reBrace, v).replace(reBracket, v);
  }
  // Variantes FR
  out = out
    .replace(/\{\{\s*prénom\s*\}\}/gi, map.prenom)
    .replace(/\[\s*PRÉNOM\s*\]/gi, map.prenom)
    .replace(/\[\s*ENTREPRISE\s*\]/gi, map.entreprise)
    .replace(/\[\s*OFFRE\s*\]/gi, map.offre)
    .replace(/\[\s*COMMERCIAL\s*\]/gi, map.commercial);
  return out;
}
