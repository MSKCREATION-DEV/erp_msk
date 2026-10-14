import assert from "node:assert/strict";
import {
  composeSectorValue,
  CRM_SECTOR_OTHER,
  resolveSectorSelection,
} from "./sectors";

assert.deepEqual(resolveSectorSelection(""), {
  preset: null,
  otherDetail: "",
});
assert.deepEqual(resolveSectorSelection("Agroalimentaire"), {
  preset: "Agroalimentaire",
  otherDetail: "",
});
assert.deepEqual(resolveSectorSelection("Énergie solaire"), {
  preset: CRM_SECTOR_OTHER,
  otherDetail: "Énergie solaire",
});
assert.equal(composeSectorValue("BTP & Construction", ""), "BTP & Construction");
assert.equal(composeSectorValue(CRM_SECTOR_OTHER, "Artisanat"), "Artisanat");
assert.equal(composeSectorValue(CRM_SECTOR_OTHER, ""), CRM_SECTOR_OTHER);
assert.equal(composeSectorValue(null, "x"), "");

console.log("sectors.test.ts OK");
