import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  detectExpenseVendor,
  parseEdmExpenseText,
  parseExpenseText,
  parseFrAmount,
  parseFrDateToIso,
  parseLoyerExpenseText,
  parseOrangeExpenseText,
} from "@/lib/suivi/expense-ocr";

const fixtures = join(process.cwd(), "src/lib/suivi/fixtures");

assert.equal(parseFrDateToIso("14/12/2026"), "2026-12-14");
assert.equal(parseFrDateToIso("7/11/2026"), "2026-11-07");
assert.equal(parseFrAmount("65 600"), 65600);
assert.equal(parseFrAmount("85 149 FCFA"), 85149);
assert.equal(parseFrAmount("47.615"), 47615);

const orange = readFileSync(
  join(fixtures, "orange-cb503620261001.txt"),
  "utf8",
);
assert.equal(detectExpenseVendor(orange), "ORANGE_INTERNET");
const o = parseOrangeExpenseText(orange);
assert.equal(o.number, "CB503620261001");
assert.equal(o.vendorName, "Orange Mali");
assert.equal(o.issuedAt, "2026-11-12");
assert.equal(o.dueAt, "2026-12-14");
assert.equal(o.periodStart, "2026-10-01");
assert.equal(o.periodEnd, "2026-10-31");
assert.equal(o.totalHt, 65600);
assert.equal(o.totalVat, 11808);
assert.equal(o.totalTtc, 85149);

const edm = readFileSync(join(fixtures, "edm-octobre.txt"), "utf8");
assert.equal(detectExpenseVendor(edm), "EDM_ELECTRICITE");
const e = parseEdmExpenseText(edm);
assert.equal(e.number, "455053");
assert.equal(e.issuedAt, "2026-10-28");
assert.equal(e.dueAt, "2026-11-13");
assert.equal(e.periodStart, "2026-09-26");
assert.equal(e.periodEnd, "2026-10-27");
assert.equal(e.totalHt, 40812);
assert.equal(e.totalVat, 6803);
assert.equal(e.totalTtc, 47615);

const edmRuntime = readFileSync(join(fixtures, "edm-unpdf-ocr.txt"), "utf8");
const er = parseEdmExpenseText(edmRuntime);
assert.equal(er.number, "455053");
assert.equal(er.issuedAt, "2026-10-28");
assert.equal(er.dueAt, "2026-11-13");
assert.equal(er.totalHt, 40812);
assert.equal(er.totalVat, 6803);
assert.equal(er.totalTtc, 47615);

const loyer = readFileSync(join(fixtures, "loyer-novembre.txt"), "utf8");
assert.equal(detectExpenseVendor(loyer), "LOYER");
const l = parseLoyerExpenseText(loyer);
assert.equal(l.number, "2026/01597");
assert.equal(l.issuedAt, "2026-11-02");
assert.equal(l.dueAt, "2026-11-07");
assert.equal(l.periodStart, "2026-11-01");
assert.equal(l.periodEnd, "2026-11-30");
assert.equal(l.totalTtc, 400000);
assert.equal(l.totalVat, 0);

const pipeline = parseExpenseText(orange);
assert.equal(pipeline.detected, "ORANGE_INTERNET");
assert.equal(pipeline.fields.totalTtc, 85149);
assert.ok(pipeline.confidence === "high" || pipeline.confidence === "medium");

const orangeUnpdf = readFileSync(join(fixtures, "orange-unpdf.txt"), "utf8");
assert.equal(detectExpenseVendor(orangeUnpdf), "ORANGE_INTERNET");
const ou = parseOrangeExpenseText(orangeUnpdf);
assert.equal(ou.number, "CB503620261001");
assert.equal(ou.dueAt, "2026-12-14");
assert.equal(ou.periodStart, "2026-10-01");
assert.equal(ou.periodEnd, "2026-10-31");
assert.equal(ou.totalHt, 65600);
assert.equal(ou.totalVat, 11808);
assert.equal(ou.totalTtc, 85149);
assert.equal(ou.issuedAt, "2026-11-12");

console.log("expense-ocr.test.ts OK");
