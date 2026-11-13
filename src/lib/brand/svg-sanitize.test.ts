import assert from "node:assert/strict";
import { sanitizeSvg } from "./svg-sanitize";

const clean = sanitizeSvg(
  `<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>`,
);
assert.match(clean, /<svg/);
assert.match(clean, /<rect/);

const dirty = sanitizeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
  <script>alert(1)</script>
  <rect onclick="evil()" width="1" height="1"/>
  <a href="javascript:void(0)">x</a>
</svg>
`);
assert.doesNotMatch(dirty, /<script/i);
assert.doesNotMatch(dirty, /onload/i);
assert.doesNotMatch(dirty, /onclick/i);
assert.doesNotMatch(dirty, /javascript:/i);

assert.throws(() => sanitizeSvg("<div>not svg</div>"));

console.log("ok — brand/svg-sanitize");
