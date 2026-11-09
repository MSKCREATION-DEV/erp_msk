import type { CatalogBilling } from "@/generated/prisma/client";

/** SKU catalogue déplacement / captation (seed MSK). */
export const DEFAULT_TRAVEL_SKU = "OPS-DEPL-1M";

/** Fallback si l’offre catalogue n’est pas chargée. */
export const DEFAULT_TRAVEL_UNIT_PRICE = 25_000;

export type TravelOfferLike = {
  id: string;
  sku: string;
  name: string;
  priceXof: number | null;
  billing?: CatalogBilling | string | null;
};

/**
 * Offre catalogue = frais de déplacement (ligne complémentaire tarifée).
 * Pas un flag magique sur une autre ligne.
 */
export function isCatalogTravelOffer(offer: {
  sku: string;
  billing?: CatalogBilling | string | null;
}): boolean {
  const sku = offer.sku.trim().toUpperCase();
  if (sku.startsWith("OPS-DEPL")) return true;
  return offer.billing === "COMPLEMENTAIRE";
}

export function findDefaultTravelOffer<T extends TravelOfferLike>(
  offers: T[],
): T | undefined {
  return (
    offers.find((o) => o.sku.toUpperCase() === DEFAULT_TRAVEL_SKU) ??
    offers.find((o) => isCatalogTravelOffer(o))
  );
}

export function buildTravelLineFromOffers<T extends TravelOfferLike>(
  offers: T[],
): {
  label: string;
  qty: number;
  unitPrice: number;
  catalogOfferId: string | null;
  isTravel: true;
} {
  const offer = findDefaultTravelOffer(offers);
  if (offer) {
    return {
      label: `${offer.sku} · ${offer.name}`,
      qty: 1,
      unitPrice: offer.priceXof ?? DEFAULT_TRAVEL_UNIT_PRICE,
      catalogOfferId: offer.id,
      isTravel: true,
    };
  }
  return {
    label: "Frais de déplacement",
    qty: 1,
    unitPrice: DEFAULT_TRAVEL_UNIT_PRICE,
    catalogOfferId: null,
    isTravel: true,
  };
}
