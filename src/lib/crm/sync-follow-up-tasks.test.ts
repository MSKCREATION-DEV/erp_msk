import assert from "node:assert/strict";
import {
  planReuseOpenTaskId,
  planSyncFollowUpTasks,
} from "./sync-follow-up-tasks";

const base = {
  opportunityId: "opp1",
  organizationId: "org1",
  assigneeId: "u1",
  createdById: "u1",
  nextAction: "Rappeler",
  followUpAt: new Date("2026-11-01T12:00:00.000Z"),
};

// Nouvelle date sans OPEN → create
{
  const plan = planSyncFollowUpTasks([], base);
  assert.equal(plan.create?.title, "Rappeler");
  assert.equal(plan.closeOtherIds.length, 0);
  assert.equal(plan.completeIds.length, 0);
  assert.equal(planReuseOpenTaskId([], null), null);
}

// Une OPEN → reuse, pas create
{
  const open = [{ id: "t1" }];
  const plan = planSyncFollowUpTasks(open, base);
  assert.equal(plan.create, null);
  assert.equal(plan.closeOtherIds.length, 0);
  assert.equal(planReuseOpenTaskId(open, null), "t1");
}

// Plusieurs OPEN → reuse première, close les autres
{
  const open = [{ id: "t1" }, { id: "t2" }, { id: "t3" }];
  const plan = planSyncFollowUpTasks(open, base);
  assert.deepEqual(plan.closeOtherIds, ["t2", "t3"]);
  assert.equal(plan.create, null);
  assert.equal(planReuseOpenTaskId(open, null), "t1");
}

// completeTaskId + nouvelle date → complete t1, reuse t2
{
  const open = [{ id: "t1" }, { id: "t2" }];
  const plan = planSyncFollowUpTasks(open, {
    ...base,
    completeTaskId: "t1",
  });
  assert.deepEqual(plan.completeIds, ["t1"]);
  assert.deepEqual(plan.closeOtherIds, []);
  assert.equal(plan.create, null);
  assert.equal(planReuseOpenTaskId(open, "t1"), "t2");
}

// complete seule OPEN → create nouvelle
{
  const open = [{ id: "t1" }];
  const plan = planSyncFollowUpTasks(open, {
    ...base,
    completeTaskId: "t1",
  });
  assert.deepEqual(plan.completeIds, ["t1"]);
  assert.ok(plan.create);
  assert.equal(planReuseOpenTaskId(open, "t1"), null);
}

// Pas de date → cancel toutes OPEN restantes
{
  const open = [{ id: "t1" }, { id: "t2" }];
  const plan = planSyncFollowUpTasks(open, {
    ...base,
    followUpAt: null,
    nextAction: null,
  });
  assert.equal(plan.create, null);
  assert.equal(plan.clearOpportunityFollowUp, true);
  assert.deepEqual(plan.closeOtherIds, ["t1", "t2"]);
  assert.equal(plan.closeAs, "CANCELLED");
}

// Titre défaut si nextAction vide
{
  const plan = planSyncFollowUpTasks([], {
    ...base,
    nextAction: "  ",
  });
  assert.equal(plan.create?.title, "Relance");
}

console.log("sync-follow-up-tasks.test.ts OK");
