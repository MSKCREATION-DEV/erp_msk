import assert from "node:assert/strict";
import {
  formatDraftCode,
  formatOfficialNumber,
  parseOfficialNumber,
  periodKeyFromDate,
} from "./format";
import { MemoryDocSequence } from "./memory-sequence";

assert.equal(
  periodKeyFromDate(new Date(2026, 10, 4)), // mois 0-based → 4 nov 2026
  "20261104",
);

assert.equal(
  formatOfficialNumber({
    kind: "FACTURE",
    periodKey: "20261104",
    sequence: 1,
  }),
  "FAC-20261104-0001",
);
assert.equal(
  formatOfficialNumber({ kind: "DEVIS", periodKey: "20261104", sequence: 12 }),
  "DEV-20261104-0012",
);
assert.equal(
  formatOfficialNumber({ kind: "AVOIR", periodKey: "20261104", sequence: 3 }),
  "AVO-20261104-0003",
);
assert.equal(
  formatOfficialNumber({ kind: "BDC", periodKey: "20261104", sequence: 1 }),
  "BDC-20261104-0001",
);

assert.equal(
  formatDraftCode({ kind: "FACTURE", idSuffix: "clxyz123" }),
  "DRF-FAC-clxyz123",
);

assert.deepEqual(parseOfficialNumber("FAC-20261104-0001"), {
  kind: "FACTURE",
  periodKey: "20261104",
  sequence: 1,
});

async function concurrency() {
  const seq = new MemoryDocSequence();
  const periodKey = "20261104";
  const results = await Promise.all(
    Array.from({ length: 50 }, () => seq.next("FACTURE", periodKey)),
  );
  const unique = new Set(results);
  assert.equal(unique.size, 50, "no duplicate numbers under concurrency");
  assert.ok(results.includes("FAC-20261104-0001"));
  assert.ok(results.includes("FAC-20261104-0050"));
  assert.equal(await seq.next("FACTURE", periodKey), "FAC-20261104-0051");

  const seq2 = new MemoryDocSequence();
  assert.equal(await seq2.next("DEVIS", "20261104"), "DEV-20261104-0001");
  assert.equal(await seq2.next("FACTURE", "20261104"), "FAC-20261104-0001");
}

concurrency()
  .then(() => console.log("document-numbering.test.ts OK"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
