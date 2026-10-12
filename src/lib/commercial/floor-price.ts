/**
 * Plancher catalogue (XOF) — garde devis.
 * En régime FR/EUR le plancher XOF n’est pas comparable : on skip côté EUR.
 */

export type FloorLine = {
  label: string;
  unitPrice: number;
  catalogOfferId?: string | null;
};

export type FloorOffer = {
  id: string;
  name: string;
  floorPriceXof: number | null;
};

export function assertLinesAboveFloor(opts: {
  lines: FloorLine[];
  offers: FloorOffer[];
  currency: string;
}): { ok: true } | { ok: false; error: string } {
  if (opts.currency !== "XOF") return { ok: true };
  const floorById = new Map(opts.offers.map((o) => [o.id, o]));
  for (const l of opts.lines) {
    if (!l.catalogOfferId) continue;
    const offer = floorById.get(l.catalogOfferId);
    if (offer?.floorPriceXof != null && l.unitPrice < offer.floorPriceXof) {
      return {
        ok: false,
        error: `Plancher : « ${offer.name} » ≥ ${offer.floorPriceXof.toLocaleString("fr-FR")} FCFA (saisi ${l.unitPrice.toLocaleString("fr-FR")}).`,
      };
    }
  }
  return { ok: true };
}
