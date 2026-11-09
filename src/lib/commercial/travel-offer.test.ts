import assert from "node:assert/strict";
import {
  buildTravelLineFromOffers,
  DEFAULT_TRAVEL_SKU,
  DEFAULT_TRAVEL_UNIT_PRICE,
  findDefaultTravelOffer,
  isCatalogTravelOffer,
} from "./travel-offer";

assert.equal(
  isCatalogTravelOffer({ sku: "OPS-DEPL-1M" }),
  true,
);
assert.equal(
  isCatalogTravelOffer({ sku: "CNT-RS-PRO" }),
  false,
);
assert.equal(
  isCatalogTravelOffer({ sku: "X", billing: "COMPLEMENTAIRE" }),
  true,
);

const offers = [
  {
    id: "a",
    sku: "CNT-RS-PRO",
    name: "RS Pro",
    priceXof: 150_000,
    billing: "MONTHLY",
  },
  {
    id: "b",
    sku: "OPS-DEPL-1M",
    name: "Déplacement / captation — 1 mois",
    priceXof: 25_000,
    billing: "ONE_SHOT",
  },
];

assert.equal(findDefaultTravelOffer(offers)?.sku, DEFAULT_TRAVEL_SKU);

const line = buildTravelLineFromOffers(offers);
assert.equal(line.isTravel, true);
assert.equal(line.catalogOfferId, "b");
assert.equal(line.unitPrice, 25_000);
assert.ok(line.label.includes("OPS-DEPL-1M"));

const fallback = buildTravelLineFromOffers([]);
assert.equal(fallback.catalogOfferId, null);
assert.equal(fallback.unitPrice, DEFAULT_TRAVEL_UNIT_PRICE);
assert.equal(fallback.isTravel, true);

console.log("travel-offer.test.ts OK");
