import assert from "node:assert/strict";
import { parseFlashToastCookie, clampFlashMessage } from "@/lib/toast/parse-flash";

assert.equal(parseFlashToastCookie(null), null);
assert.equal(parseFlashToastCookie(""), null);
assert.equal(parseFlashToastCookie("{"), null);
assert.equal(parseFlashToastCookie(JSON.stringify({ type: "success" })), null);

const ok = parseFlashToastCookie(
  JSON.stringify({ type: "success", message: "  Prospect créé.  " }),
);
assert.deepEqual(ok, { type: "success", message: "Prospect créé." });

const err = parseFlashToastCookie(
  JSON.stringify({ type: "error", message: "Droit insuffisant." }),
);
assert.deepEqual(err, { type: "error", message: "Droit insuffisant." });

const long = "x".repeat(300);
const clamped = clampFlashMessage(long);
assert.ok(clamped.length <= 180);
assert.ok(clamped.endsWith("…"));

console.log("parse-flash.test.ts: ok");
