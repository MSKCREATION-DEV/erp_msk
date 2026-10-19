import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatContactLabel,
  isJunkPersonToken,
} from "@/lib/crm/contact-label";

describe("contact-label", () => {
  it("détecte les placeholders Excel", () => {
    assert.equal(isJunkPersonToken("//"), true);
    assert.equal(isJunkPersonToken("—"), true);
    assert.equal(isJunkPersonToken("// -"), true);
    assert.equal(isJunkPersonToken("Madina"), false);
  });

  it("formatContactLabel masque le junk", () => {
    assert.equal(formatContactLabel("//", "—"), null);
    assert.equal(formatContactLabel("Mr", "Kané"), "Mr Kané");
    assert.equal(formatContactLabel("Fatoumata", "—"), "Fatoumata");
  });
});
