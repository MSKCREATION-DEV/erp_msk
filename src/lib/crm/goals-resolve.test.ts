import assert from "node:assert/strict";
import { resolveMetricTargetFromRows, type GoalMetric } from "./goals";
import { buildCrmScopeHref, parseCrmPeriod } from "./scope-period";

type Row = {
  scope: string;
  userId: string | null;
  metric: string;
  periodType: string;
  periodStart: Date;
  target: number;
};

const metric: GoalMetric = "NEW_PROSPECTS";
const userId = "11111111-1111-4111-8111-111111111111";
const week = new Date(Date.UTC(2026, 9, 12)); // lundi 12 oct 2026
const month = new Date(Date.UTC(2026, 9, 1));

{
  // Exact USER
  const rows: Row[] = [
    {
      scope: "USER",
      userId,
      metric,
      periodType: "WEEK",
      periodStart: week,
      target: 20,
    },
    {
      scope: "TEAM",
      userId: null,
      metric,
      periodType: "WEEK",
      periodStart: week,
      target: 15,
    },
  ];
  assert.equal(
    resolveMetricTargetFromRows(rows, metric, "WEEK", week, userId),
    20,
  );
}

{
  // TEAM si pas de USER
  const rows: Row[] = [
    {
      scope: "TEAM",
      userId: null,
      metric,
      periodType: "WEEK",
      periodStart: week,
      target: 12,
    },
  ];
  assert.equal(
    resolveMetricTargetFromRows(rows, metric, "WEEK", week, userId),
    12,
  );
}

{
  // Parent MONTH → WEEK (22 → 5)
  const rows: Row[] = [
    {
      scope: "TEAM",
      userId: null,
      metric,
      periodType: "MONTH",
      periodStart: month,
      target: 22,
    },
  ];
  assert.equal(
    resolveMetricTargetFromRows(rows, metric, "WEEK", week, userId),
    5,
  );
}

{
  // Défaut WEEK = 15
  assert.equal(
    resolveMetricTargetFromRows([], metric, "WEEK", week, userId),
    15,
  );
}

/** Vue d’ensemble : conserve période mois (sans collab — lecture). */
{
  const period = parseCrmPeriod({ periode: "mois", mois: "2026-10" });
  const href = buildCrmScopeHref("/crm/objectifs", {
    period,
    ownerId: null,
    canFilterOwners: false,
    forcePeriod: true,
  });
  assert.match(href, /\/crm\/objectifs/);
  assert.match(href, /periode=mois/);
  assert.match(href, /mois=2026-10/);
  assert.equal(href.includes("collab="), false);
}

console.log("goals-resolve.test.ts OK");
