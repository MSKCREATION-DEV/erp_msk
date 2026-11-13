import assert from "node:assert/strict";
import {
  contrastRatio,
  hexToRgb,
  hslToRgb,
  normalizeHex,
  parseColorInput,
  rgbToHex,
  rgbToHsl,
  slugifyTokenKey,
  wcagLevel,
} from "./colors";

assert.equal(normalizeHex("#1d73bc"), "#1D73BC");
assert.equal(normalizeHex("#abc"), "#AABBCC");
assert.equal(normalizeHex("nope"), null);

const rgb = hexToRgb("#1D73BC")!;
assert.deepEqual(rgb, { r: 29, g: 115, b: 188 });
assert.equal(rgbToHex(29, 115, 188), "#1D73BC");

const hsl = rgbToHsl(29, 115, 188);
assert.ok(hsl.h >= 200 && hsl.h <= 210);
const back = hslToRgb(hsl.h, hsl.s, hsl.l);
assert.ok(Math.abs(back.r - 29) <= 2);

const parsed = parseColorInput("rgb(29, 115, 188)");
assert.equal(parsed?.hex, "#1D73BC");

const ratio = contrastRatio("#0D1330", "#F5F3EF");
assert.ok(ratio && ratio > 10);
assert.equal(wcagLevel(ratio!), "AAA");
assert.equal(wcagLevel(2), "fail");

assert.equal(slugifyTokenKey("Bleu MSK !"), "bleu-msk");

console.log("ok — brand/colors");
