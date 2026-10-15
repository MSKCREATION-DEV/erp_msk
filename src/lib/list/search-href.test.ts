import assert from "node:assert/strict";
import {
  buildListSearchHref,
  isSameListHref,
} from "./search-href";
import { shouldFilterProspectsByCrmPeriod } from "@/lib/crm/scope-period";

{
  const href = buildListSearchHref({
    pathname: "/crm/prospects",
    currentSearch: "owner=abc&page=3",
    q: "  msk  ",
  });
  assert.equal(href, "/crm/prospects?owner=abc&q=msk");
}

{
  const href = buildListSearchHref({
    pathname: "/crm/prospects",
    currentSearch: new URLSearchParams({
      owner: "u1",
      semaine: "2026-09-01",
      event: "nouveaux",
      page: "2",
      q: "old",
    }),
    q: "nouveau",
  });
  const p = new URLSearchParams(href.split("?")[1]);
  assert.equal(p.get("q"), "nouveau");
  assert.equal(p.get("owner"), "u1");
  assert.equal(p.get("semaine"), "2026-09-01");
  assert.equal(p.get("event"), "nouveaux");
  assert.equal(p.has("page"), false);
}

{
  const href = buildListSearchHref({
    pathname: "/crm/prospects",
    currentSearch: {
      view: "stock",
      stages: "INTERESSE",
      owner: "u1",
      semaine: "2026-09-01",
      q: "x",
    },
    q: "",
  });
  const p = new URLSearchParams(href.split("?")[1]);
  assert.equal(p.has("q"), false);
  assert.equal(p.get("view"), "stock");
  assert.equal(p.get("stages"), "INTERESSE");
  assert.equal(p.get("owner"), "u1");
  assert.equal(p.get("semaine"), "2026-09-01");
}

{
  const href = buildListSearchHref({
    pathname: "/commercial/clients",
    currentSearch: "",
    q: "   ",
  });
  assert.equal(href, "/commercial/clients");
}

{
  const current = "owner=u1&q=msk";
  const next = buildListSearchHref({
    pathname: "/crm/prospects",
    currentSearch: current,
    q: "msk",
  });
  assert.equal(isSameListHref("/crm/prospects", current, next), true);
}

{
  const current = "owner=u1&q=msk";
  const next = buildListSearchHref({
    pathname: "/crm/prospects",
    currentSearch: current,
    q: "autre",
  });
  assert.equal(isSameListHref("/crm/prospects", current, next), false);
}

/** q n’altère pas la règle période vs stock. */
{
  assert.equal(
    shouldFilterProspectsByCrmPeriod({
      q: "msk",
      event: "nouveaux",
      semaine: "2026-09-01",
    }),
    true,
  );
  assert.equal(
    shouldFilterProspectsByCrmPeriod({
      q: "msk",
      view: "stock",
      semaine: "2026-09-01",
    }),
    false,
  );
  assert.equal(
    shouldFilterProspectsByCrmPeriod({
      q: "msk",
      stages: "CONTACTE",
      semaine: "2026-09-01",
    }),
    false,
  );
}

console.log("search-href.test.ts OK");
