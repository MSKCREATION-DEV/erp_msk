import assert from "node:assert/strict";
import { nextStockQuantity } from "./stock";
import {
  SV_SEED_STOCK,
  SV_SEED_STOCK_EXCEL_ARCHIVED_CODES,
} from "./seed-data";

assert.equal(SV_SEED_STOCK.length, 18, "18 articles Direction (décision H)");

const codes = SV_SEED_STOCK.map((s) => s.code);
assert.equal(new Set(codes).size, codes.length, "codes uniques");
for (const code of codes) {
  assert.ok(
    !(SV_SEED_STOCK_EXCEL_ARCHIVED_CODES as readonly string[]).includes(code),
    `${code} ne doit pas être dans la liste Excel archivée`,
  );
}

const allowed = new Set(["pièce", "paquet", "paire", "pack", "sachet"]);
for (const s of SV_SEED_STOCK) {
  assert.ok(allowed.has(s.unit), `${s.code}: unité ${s.unit}`);
}

assert.deepEqual(nextStockQuantity(5, "IN", 2), { nextQty: 7, moveQty: 2 });
assert.deepEqual(nextStockQuantity(5, "OUT", 2), { nextQty: 3, moveQty: 2 });
assert.deepEqual(nextStockQuantity(5, "ADJUST", 8), {
  nextQty: 8,
  moveQty: 3,
});
assert.deepEqual(nextStockQuantity(5, "ADJUST", 2), {
  nextQty: 2,
  moveQty: 3,
});

console.log("✓ stock.test.ts");
