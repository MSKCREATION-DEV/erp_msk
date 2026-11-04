import assert from "node:assert/strict";
import {
  classifyRelanceDue,
  dueAtWhereForBucket,
  partitionRelanceDue,
  summarizeRelanceDueBuckets,
} from "./relance-buckets";

/** Ancre fixe : mercredi 2026-10-22 15:00 local. */
const now = new Date(2026, 9, 22, 15, 0, 0, 0);

{
  assert.equal(dueAtWhereForBucket("tous", now), undefined);
  assert.deepEqual(dueAtWhereForBucket("overdue", now), {
    lt: new Date(2026, 9, 22, 0, 0, 0, 0),
  });
  const today = dueAtWhereForBucket("today", now);
  assert.ok(today && "gte" in today && "lte" in today);
}

{
  assert.equal(
    classifyRelanceDue(new Date(2026, 9, 21, 23, 59, 0, 0), now),
    "overdue",
  );
  assert.equal(
    classifyRelanceDue(new Date(2026, 9, 22, 9, 0, 0, 0), now),
    "today",
  );
  assert.equal(
    classifyRelanceDue(new Date(2026, 9, 23, 0, 0, 0, 0), now),
    "week",
  );
  assert.equal(
    classifyRelanceDue(new Date(2026, 9, 29, 23, 59, 0, 0), now),
    "week",
  );
  assert.equal(
    classifyRelanceDue(new Date(2026, 9, 30, 0, 0, 0, 0), now),
    "later",
  );
}

{
  const tasks = [
    { id: "o1", dueAt: new Date(2026, 9, 10) },
    { id: "o2", dueAt: new Date(2026, 9, 1) },
    { id: "t1", dueAt: new Date(2026, 9, 22, 12) },
    { id: "w1", dueAt: new Date(2026, 9, 25) },
    { id: "l1", dueAt: new Date(2026, 10, 5) },
  ];
  const buckets = partitionRelanceDue(tasks, now);
  const s = summarizeRelanceDueBuckets(buckets);
  assert.equal(s.overdue, 2);
  assert.equal(s.today, 1);
  assert.equal(s.week, 1);
  assert.equal(s.later, 1);
  assert.equal(s.open, 5);
  assert.equal(s.open, tasks.length);
  assert.equal(
    s.overdue + s.today + s.week + s.later,
    s.open,
    "buckets exclusifs = file ouverte",
  );
}

{
  /** Cas terrain observé : beaucoup de retards, 0 aujourd’hui / sous 7 j. */
  const tasks = [
    ...Array.from({ length: 164 }, (_, i) => ({
      dueAt: new Date(2026, 8, 1 + (i % 20)),
    })),
    ...Array.from({ length: 26 }, (_, i) => ({
      dueAt: new Date(2026, 10, 1 + i),
    })),
  ];
  const s = summarizeRelanceDueBuckets(partitionRelanceDue(tasks, now));
  assert.equal(s.overdue, 164);
  assert.equal(s.today, 0);
  assert.equal(s.week, 0);
  assert.equal(s.later, 26);
  assert.equal(s.open, 190);
  assert.notEqual(
    s.overdue + s.today + s.week,
    s.open,
    "« file ouverte » inclut plus-tard — pas une somme des 3 premières cartes",
  );
}

{
  /** Chaque date tombe dans exactement un filtre SQL `dueAtWhereForBucket`. */
  const samples = [
    new Date(2026, 9, 10),
    new Date(2026, 9, 22, 0, 0, 0, 0),
    new Date(2026, 9, 22, 12),
    new Date(2026, 9, 22, 23, 59, 59, 999),
    new Date(2026, 9, 23),
    new Date(2026, 9, 29, 23, 59),
    new Date(2026, 9, 30),
    new Date(2026, 11, 1),
  ];
  function matches(
    dueAt: Date,
    filter: ReturnType<typeof dueAtWhereForBucket>,
  ): boolean {
    if (!filter) return true;
    if ("lt" in filter && !("gte" in filter) && !("gt" in filter)) {
      return dueAt < filter.lt;
    }
    if ("gte" in filter && "lte" in filter) {
      return dueAt >= filter.gte && dueAt <= filter.lte;
    }
    if ("gt" in filter && "lte" in filter) {
      return dueAt > filter.gt && dueAt <= filter.lte;
    }
    if ("gt" in filter) {
      return dueAt > filter.gt;
    }
    return false;
  }
  for (const dueAt of samples) {
    const hits = (["overdue", "today", "week", "later"] as const).filter((b) =>
      matches(dueAt, dueAtWhereForBucket(b, now)),
    );
    assert.equal(
      hits.length,
      1,
      `${dueAt.toISOString()} → ${hits.join(",") || "aucun"}`,
    );
    assert.equal(hits[0], classifyRelanceDue(dueAt, now));
  }
}

console.log("relance-buckets.test.ts OK");
