import assert from "node:assert/strict";
import { toWinAnsi, toWinAnsiLines } from "./winansi";

// Régression : objet devis collé depuis Word / textarea avec CR (0x000d)
const withCr =
  "Gestion professionnelle des réseaux sociaux.\r\nMSK CREATION prend en charge.\rLigne 3";
const cleaned = toWinAnsi(withCr);
assert.ok(!cleaned.includes("\r"), "ne doit plus contenir CR");
assert.ok(!cleaned.includes("\n"), "ne doit plus contenir LF");
assert.match(cleaned, /Gestion professionnelle/);
assert.match(cleaned, /MSK CREATION/);

const lines = toWinAnsiLines(withCr);
assert.equal(lines.length, 3);
assert.ok(lines.every((l) => !l.includes("\r") && !l.includes("\n")));

// Espaces fines FR
assert.equal(toWinAnsi("1\u202F000"), "1 000");

// Guillemets typographiques
assert.equal(toWinAnsi("\u201Cdevis\u201D"), '"devis"');

console.log("✓ winansi.test.ts");
