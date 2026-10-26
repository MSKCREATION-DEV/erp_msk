import assert from "node:assert/strict";
import {
  buildRelanceActivitySearchWhere,
  buildRelanceTaskSearchWhere,
  normalizeRelanceSearchQuery,
  phoneDigitsForSearch,
} from "./relance-search";

{
  assert.equal(normalizeRelanceSearchQuery("  Foo   Bar  "), "Foo Bar");
  assert.equal(normalizeRelanceSearchQuery("   "), "");
  assert.equal(normalizeRelanceSearchQuery(null), "");
}

{
  assert.equal(phoneDigitsForSearch("06 12 34"), "061234");
  assert.equal(phoneDigitsForSearch("+223 76-12.34.56"), "22376123456");
  assert.equal(phoneDigitsForSearch("12"), null); // trop court
  assert.equal(phoneDigitsForSearch("abc"), null);
}

{
  assert.equal(buildRelanceTaskSearchWhere(""), null);
  assert.equal(buildRelanceTaskSearchWhere("   "), null);
  assert.equal(buildRelanceActivitySearchWhere(undefined), null);
}

{
  const where = buildRelanceTaskSearchWhere("  Dupont  ");
  assert.ok(where);
  assert.ok(Array.isArray(where.OR));
  assert.ok((where.OR?.length ?? 0) >= 4);
  const json = JSON.stringify(where);
  assert.match(json, /Dupont/);
  assert.match(json, /firstName/);
  assert.match(json, /lastName/);
  assert.match(json, /email/);
  assert.match(json, /phone/);
  assert.match(json, /nextAction/);
  assert.match(json, /assignee/);
  assert.match(json, /insensitive/);
}

{
  const where = buildRelanceTaskSearchQueryDigits();
  assert.ok(where);
  const json = JSON.stringify(where);
  assert.match(json, /76123456/);
}

function buildRelanceTaskSearchQueryDigits() {
  return buildRelanceTaskSearchWhere("76 12 34 56");
}

{
  const where = buildRelanceActivitySearchWhere("appel WhatsApp");
  assert.ok(where);
  const json = JSON.stringify(where);
  assert.match(json, /summary/);
  assert.match(json, /actor/);
  assert.match(json, /owner/);
  assert.match(json, /appel WhatsApp/);
}

console.log("relance-search.test.ts: ok");
