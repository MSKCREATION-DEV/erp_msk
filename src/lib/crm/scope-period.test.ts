import assert from "node:assert/strict";
import {
  buildCrmScopeHref,
  crmScopeToSearchParams,
  dateRangeFilter,
  goalsCompatibleWithPeriod,
  hasCrmScopePeriodParams,
  isCrmStockListParams,
  parseCrmPeriod,
  resolveCrmOwnerIds,
  resolveCrmScopeLens,
  shouldFilterProspectsByCrmPeriod,
  showStockWidgets,
} from "./scope-period";
import { weekStartIso, weekStartMonday } from "./week";

const currentWeek = weekStartMonday();
const currentIso = weekStartIso(currentWeek);

{
  const p = parseCrmPeriod({});
  assert.equal(p.mode, "semaine");
  assert.equal(p.semaine, currentIso);
  assert.equal(p.label, "Cette semaine");
  assert.ok(p.from.getTime() <= p.to.getTime());
}

{
  const p = parseCrmPeriod({ periode: "mois", mois: "2026-09" });
  assert.equal(p.mode, "mois");
  assert.equal(p.mois, "2026-09");
  assert.equal(p.from.toISOString().slice(0, 10), "2026-09-01");
  assert.equal(p.to.toISOString().slice(0, 10), "2026-09-30");
  assert.match(p.label, /septembre 2026/i);
}

{
  const p = parseCrmPeriod({ periode: "jour", on: "2026-10-14" });
  assert.equal(p.mode, "jour");
  assert.equal(p.on, "2026-10-14");
  assert.equal(p.fromIso, "2026-10-14");
  assert.equal(p.toIso, "2026-10-14");
}

{
  const p = parseCrmPeriod({
    periode: "plage",
    from: "2026-10-01",
    to: "2026-10-10",
  });
  assert.equal(p.mode, "plage");
  assert.equal(p.fromIso, "2026-10-01");
  assert.equal(p.toIso, "2026-10-10");
}

{
  /** Plage inversée → normalisée. */
  const p = parseCrmPeriod({
    periode: "plage",
    from: "2026-10-20",
    to: "2026-10-10",
  });
  assert.equal(p.fromIso, "2026-10-10");
  assert.equal(p.toIso, "2026-10-20");
}

{
  /** Mois invalide → mois courant. */
  const p = parseCrmPeriod({ periode: "mois", mois: "pas-un-mois" });
  assert.equal(p.mode, "mois");
  const now = new Date();
  const expect = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  assert.equal(p.mois, expect);
}

{
  const range = dateRangeFilter(
    new Date("2026-10-01T00:00:00.000Z"),
    new Date("2026-10-07T23:59:59.999Z"),
  );
  assert.equal(range.gte.toISOString().slice(0, 10), "2026-10-01");
  assert.equal(range.lte.toISOString().slice(0, 10), "2026-10-07");
}

{
  const period = parseCrmPeriod({ periode: "semaine" });
  const qs = crmScopeToSearchParams({
    period,
    ownerId: null,
    canFilterOwners: true,
  });
  assert.equal(qs.get("periode"), null);
  assert.equal(qs.get("owner"), null);
}

{
  const period = parseCrmPeriod({ periode: "mois", mois: "2026-08" });
  const qs = crmScopeToSearchParams({
    period,
    ownerId: "628357b3-ca62-418a-809d-a541eccc29b4",
    canFilterOwners: true,
  });
  assert.equal(qs.get("periode"), "mois");
  assert.equal(qs.get("mois"), "2026-08");
  assert.equal(qs.get("owner"), "628357b3-ca62-418a-809d-a541eccc29b4");
}

{
  const ids = resolveCrmOwnerIds({
    ownerId: "a",
    canFilterOwners: true,
    memberIds: ["a", "b"],
    userId: "me",
  });
  assert.deepEqual(ids, ["a"]);
}

{
  const ids = resolveCrmOwnerIds({
    ownerId: null,
    canFilterOwners: true,
    memberIds: ["a", "b"],
    userId: "me",
  });
  assert.deepEqual(ids, ["a", "b"]);
}

{
  const ids = resolveCrmOwnerIds({
    ownerId: null,
    canFilterOwners: false,
    memberIds: ["a", "b"],
    userId: "me",
  });
  assert.deepEqual(ids, ["me"]);
}

{
  const period = parseCrmPeriod({ periode: "mois", mois: "2026-08" });
  const href = buildCrmScopeHref("/crm", {
    period,
    ownerId: "628357b3-ca62-418a-809d-a541eccc29b4",
    canFilterOwners: true,
  });
  assert.match(href, /periode=mois/);
  assert.match(href, /mois=2026-08/);
  assert.match(href, /owner=628357b3-ca62-418a-809d-a541eccc29b4/);
}

{
  const current = parseCrmPeriod({ periode: "semaine" });
  assert.equal(resolveCrmScopeLens(current), "live");
  assert.equal(showStockWidgets("live"), true);
  assert.equal(goalsCompatibleWithPeriod(current), true);
}

{
  const past = parseCrmPeriod({
    periode: "mois",
    mois: "2024-01",
  });
  assert.equal(resolveCrmScopeLens(past), "period");
  assert.equal(showStockWidgets("period"), false);
  assert.equal(goalsCompatibleWithPeriod(past), false);
}

{
  const pastWeek = parseCrmPeriod({
    periode: "semaine",
    semaine: "2024-01-01",
  });
  assert.equal(resolveCrmScopeLens(pastWeek), "period");
  assert.equal(goalsCompatibleWithPeriod(pastWeek), true);
}

{
  assert.equal(hasCrmScopePeriodParams({ semaine: "2026-09-01" }), true);
  assert.equal(hasCrmScopePeriodParams({ periode: "mois", mois: "2026-09" }), true);
  assert.equal(hasCrmScopePeriodParams({ on: "2026-09-01" }), false);
  assert.equal(hasCrmScopePeriodParams({ from: "2026-09-01", to: "2026-09-15" }), false);
}

{
  assert.equal(isCrmStockListParams({ stages: "INTERESSE" }), true);
  assert.equal(isCrmStockListParams({ view: "stock" }), true);
  assert.equal(isCrmStockListParams({ late: "1" }), true);
  assert.equal(isCrmStockListParams({ event: "nouveaux", semaine: "2026-09-01" }), false);

  assert.equal(
    shouldFilterProspectsByCrmPeriod({ event: "nouveaux", semaine: "2026-09-01" }),
    true,
  );
  assert.equal(
    shouldFilterProspectsByCrmPeriod({ semaine: "2026-09-01" }),
    true,
  );
  assert.equal(
    shouldFilterProspectsByCrmPeriod({
      semaine: "2026-09-01",
      view: "stock",
    }),
    false,
  );
  assert.equal(
    shouldFilterProspectsByCrmPeriod({
      semaine: "2026-09-01",
      stages: "CONTACTE",
    }),
    false,
  );
}

{
  const period = parseCrmPeriod({ periode: "mois", mois: "2026-08" });
  const href = buildCrmScopeHref("/crm/prospects", {
    period,
    ownerId: "628357b3-ca62-418a-809d-a541eccc29b4",
    canFilterOwners: true,
    forcePeriod: true,
    keep: { event: "nouveaux" },
  });
  assert.match(href, /event=nouveaux/);
  assert.match(href, /periode=mois/);
  assert.match(href, /mois=2026-08/);
}

console.log("scope-period.test.ts OK");
