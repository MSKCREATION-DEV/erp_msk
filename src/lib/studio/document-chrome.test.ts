import assert from "node:assert/strict";
import {
  defaultDocumentChrome,
  mergeDocumentChrome,
  parseDocumentChrome,
  withChromeInStructure,
} from "./document-chrome";

function main() {
  const d = defaultDocumentChrome();
  assert.equal(d.showHeader, true);
  assert.equal(d.logoAlign, "left");
  assert.ok(d.footerLines && d.footerLines.length >= 2);

  const empty = parseDocumentChrome({});
  assert.equal(empty.showFooter, true);

  const fromStruct = parseDocumentChrome({
    chrome: {
      showHeader: false,
      logoAlign: "right",
      footerLines: ["Ligne A", "Ligne B"],
      logoId: null,
    },
  });
  assert.equal(fromStruct.showHeader, false);
  assert.equal(fromStruct.logoAlign, "right");
  assert.deepEqual(fromStruct.footerLines, ["Ligne A", "Ligne B"]);

  const bad = parseDocumentChrome({ chrome: { logoAlign: "diagonal" } });
  assert.equal(bad.logoAlign, "left");

  const merged = mergeDocumentChrome(d, {
    titleAlign: "left",
    showLogo: false,
    headerTitle: "Devis test",
  });
  assert.equal(merged.titleAlign, "left");
  assert.equal(merged.showLogo, false);
  assert.equal(merged.headerTitle, "Devis test");

  const struct = withChromeInStructure({ legacy: true, slots: ["a"] }, merged);
  assert.equal(struct.legacy, true);
  assert.ok(struct.chrome);

  console.log("✓ studio/document-chrome.test.ts — chrome OK");
}

main();
