/** Aliases d’en-têtes Excel / CSV CRM MSK (FR). */

export type ImportField =
  | "orgName"
  | "contactName"
  | "jobTitle"
  | "phone"
  | "email"
  | "source"
  | "firstContact"
  | "stage"
  | "lastAction"
  | "nextAction"
  | "followUpAt"
  | "offerLabel"
  | "budget"
  | "notes"
  | "createdAt"
  | "proposition"
  | "probability"
  | "owner"
  | "lastActionAt"
  | "createdBy";

const ALIASES: Record<ImportField, string[]> = {
  orgName: ["entreprise", "societe", "société", "company", "org", "prospect"],
  contactName: ["nom contact", "contact", "personne"],
  jobTitle: ["poste", "fonction", "titre"],
  phone: ["telephone", "téléphone", "tel", "phone"],
  email: ["email", "e-mail", "mail"],
  source: ["source", "origine"],
  firstContact: ["1er contact", "premier contact", "1er contact"],
  stage: ["statut", "status", "etape", "étape"],
  lastAction: ["derniere action", "dernière action", "last action"],
  nextAction: ["prochaine action", "next action"],
  followUpAt: ["date relance", "relance", "follow"],
  offerLabel: ["offre proposee", "offre proposée", "offre"],
  budget: ["budget"],
  notes: ["notes", "note", "commentaire"],
  createdAt: ["date de creation", "date de création", "created"],
  proposition: ["proposition"],
  probability: ["probabilite", "probabilité"],
  owner: ["responsable", "suivi par", "owner"],
  lastActionAt: ["date derniere action", "date dernière action"],
  createdBy: ["cree par", "créé par", "origine createur", "created by"],
};

function normHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Mappe une ligne d’en-têtes → index de colonne par champ. */
export function mapHeaderRow(headers: string[]): Partial<Record<ImportField, number>> {
  const out: Partial<Record<ImportField, number>> = {};
  const used = new Set<number>();

  for (const [field, aliases] of Object.entries(ALIASES) as [
    ImportField,
    string[],
  ][]) {
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue;
      const h = normHeader(String(headers[i] ?? ""));
      if (!h) continue;
      if (aliases.some((a) => h.includes(normHeader(a)) || normHeader(a).includes(h))) {
        // Évite « date de création » capturé par « created » trop large sur owner
        if (field === "createdAt" && h.includes("cree par")) continue;
        if (field === "createdBy" && h.includes("date")) continue;
        if (field === "lastAction" && h.includes("date")) continue;
        if (field === "lastActionAt" && !h.includes("date")) continue;
        out[field] = i;
        used.add(i);
        break;
      }
    }
  }

  return out;
}

export function isLikelyHeaderRow(cells: string[]): boolean {
  const joined = cells.map(normHeader).join(" ");
  return (
    (joined.includes("entreprise") || joined.includes("societe")) &&
    (joined.includes("statut") || joined.includes("source") || joined.includes("contact"))
  );
}
