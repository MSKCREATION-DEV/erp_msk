import assert from "node:assert/strict";
import { UserStatus } from "@prisma/client";
import {
  buildRecoveryVerifyUrl,
  genTempPassword,
  isPasswordResetEligible,
} from "./password-recovery";

{
  assert.equal(isPasswordResetEligible(UserStatus.ACTIVE), true);
  assert.equal(isPasswordResetEligible(UserStatus.MUST_CHANGE_PASSWORD), true);
  assert.equal(isPasswordResetEligible(UserStatus.INVITE_PENDING), true);
  assert.equal(isPasswordResetEligible(UserStatus.SUSPENDED), false);
  assert.equal(isPasswordResetEligible(UserStatus.ARCHIVED), false);
}

{
  const p = genTempPassword();
  assert.match(p, /^Msk-/);
  assert.ok(p.length >= 10);
}

{
  const url = buildRecoveryVerifyUrl({
    baseUrl: "https://erp-msk.vercel.app",
    tokenHash: "abc.def",
  });
  const u = new URL(url);
  assert.equal(u.origin, "https://erp-msk.vercel.app");
  assert.equal(u.pathname, "/auth/callback");
  assert.equal(u.searchParams.get("token_hash"), "abc.def");
  assert.equal(u.searchParams.get("type"), "recovery");
  assert.equal(u.searchParams.get("next"), "/reinitialiser-mot-de-passe");
}

console.log("password-recovery.test.ts: ok");
