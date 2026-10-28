import assert from "node:assert/strict";
import {
  buildSortHref,
  parseListSort,
  parseSortDir,
  parseSortKey,
  sortAriaLabel,
  type SortDir,
} from "./sort";

assert.equal(parseSortDir("asc"), "asc");
assert.equal(parseSortDir("desc"), "desc");
assert.equal(parseSortDir("nope"), "asc");
assert.equal(parseSortDir(undefined, "desc"), "desc");

assert.equal(parseSortKey("name", ["name", "date"] as const, "date"), "name");
assert.equal(parseSortKey("x", ["name", "date"] as const, "date"), "date");

{
  const columns = {
    name: (dir: SortDir) => ({ name: dir }),
    updatedAt: (dir: SortDir) => ({ updatedAt: dir }),
  };
  const parsed = parseListSort(
    { sort: "updatedAt", dir: "asc" },
    columns,
    { key: "updatedAt", dir: "desc" },
  );
  assert.equal(parsed.key, "updatedAt");
  assert.equal(parsed.dir, "asc");
  assert.deepEqual(parsed.orderBy, { updatedAt: "asc" });
}

{
  const parsed = parseListSort({}, { name: (d: SortDir) => ({ name: d }) }, {
    key: "name",
    dir: "asc",
  });
  assert.equal(parsed.key, "name");
  assert.equal(parsed.dir, "asc");
}

{
  const href = buildSortHref({
    pathname: "/commercial/clients",
    searchParams: { q: "msk", page: "3", owner: "u1" },
    column: "name",
    currentSort: "updatedAt",
    currentDir: "desc",
    defaultDir: "asc",
  });
  const p = new URLSearchParams(href.split("?")[1]);
  assert.equal(p.get("sort"), "name");
  assert.equal(p.get("dir"), "asc");
  assert.equal(p.get("q"), "msk");
  assert.equal(p.get("owner"), "u1");
  assert.equal(p.has("page"), false);
}

{
  const href = buildSortHref({
    pathname: "/crm/prospects",
    searchParams: { sort: "name", dir: "asc" },
    column: "name",
    currentSort: "name",
    currentDir: "asc",
  });
  const p = new URLSearchParams(href.split("?")[1]);
  assert.equal(p.get("dir"), "desc");
}

assert.ok(sortAriaLabel("Client", false, "asc").includes("Trier"));
assert.ok(sortAriaLabel("Client", true, "asc").includes("croissant"));

console.log("sort.test.ts OK");
