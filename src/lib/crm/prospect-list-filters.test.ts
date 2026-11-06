import assert from "node:assert/strict";
import { parseProspectFilterOwnerIds, parseProspectFilterSources } from "./prospect-list-filters";

{
  const s = parseProspectFilterSources({});
  assert.deepEqual(s, []);
}

{
  const s = parseProspectFilterSources({
    sources: "INSTAGRAM,LINKEDIN,INSTAGRAM",
  });
  assert.deepEqual(s, ["INSTAGRAM", "LINKEDIN"]);
}

{
  const s = parseProspectFilterSources({ source: "WHATSAPP" });
  assert.deepEqual(s, ["WHATSAPP"]);
}

{
  const s = parseProspectFilterSources({
    sources: "GOOGLE",
    source: "WHATSAPP",
  });
  assert.deepEqual(s, ["GOOGLE", "WHATSAPP"]);
}

{
  const o = parseProspectFilterOwnerIds({
    owner: "a",
    owners: "b,c",
  });
  assert.deepEqual(o, ["a"]);
}

{
  const o = parseProspectFilterOwnerIds({
    owners: "u1, u2, u1",
  });
  assert.deepEqual(o, ["u1", "u2"]);
}

console.log("prospect-list-filters OK");
