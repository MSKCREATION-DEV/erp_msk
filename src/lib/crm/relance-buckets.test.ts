import assert from "node:assert/strict";
import {
  classifyRelanceDue,
  partitionRelanceDue,
  summarizeRelanceDueBuckets,
} from "./relance-buckets";

/** Ancre fixe : mercredi 2026-10-22 15:00 local. */
const now = new Date(2026, 9, 22, 15, 0, 0, 0);

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

console.log("relance-buckets.test.ts OK");
