import assert from "node:assert/strict";
import { assertLinesAboveFloor } from "./floor-price";

const offers = [
  { id: "o1", name: "Pack Photo", floorPriceXof: 50_000 },
  { id: "o2", name: "Sans plancher", floorPriceXof: null },
];

assert.equal(
  assertLinesAboveFloor({
    lines: [{ label: "Pack", unitPrice: 40_000, catalogOfferId: "o1" }],
    offers,
    currency: "XOF",
  }).ok,
  false,
);

assert.equal(
  assertLinesAboveFloor({
    lines: [{ label: "Pack", unitPrice: 50_000, catalogOfferId: "o1" }],
    offers,
    currency: "XOF",
  }).ok,
  true,
);

assert.equal(
  assertLinesAboveFloor({
    lines: [{ label: "Pack", unitPrice: 1, catalogOfferId: "o1" }],
    offers,
    currency: "EUR",
  }).ok,
  true,
);

assert.equal(
  assertLinesAboveFloor({
    lines: [{ label: "Libre", unitPrice: 1, catalogOfferId: null }],
    offers,
    currency: "XOF",
  }).ok,
  true,
);

console.log("floor-price.test.ts OK");
