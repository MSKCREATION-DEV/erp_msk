/**
 * Gate technique Phase 0 — smoke Auth/Prisma/RBAC.
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/gate-phase0.mjs
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient, UserStatus } from "@prisma/client";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

config({ path: ".env.local" });

const results = [];
const ok = (t, d = "") => {
  results.push({ ok: true, t, d });
  console.log(`PASS  ${t}${d ? ` — ${d}` : ""}`);
};
const ko = (t, d = "") => {
  results.push({ ok: false, t, d });
  console.log(`FAIL  ${t}${d ? ` — ${d}` : ""}`);
};

for (const script of ["health:env", "test:nav"]) {
  const r = spawnSync("npm", ["run", script], { encoding: "utf8", env: process.env });
  if (r.status === 0) ok(script);
  else ko(script, (r.stderr || r.stdout || "").slice(0, 180));
}

const prisma = new PrismaClient();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

try {
  const guiro = await prisma.user.findUnique({
    where: { email: "a.guiro@mskcreation.net" },
  });
  if (guiro?.isSuperAdmin) ok("super_admin_db", guiro.status);
  else ko("super_admin_db");

  const n = await prisma.user.count({ where: { isSuperAdmin: true } });
  if (n === 1) ok("super_admin_unique");
  else ko("super_admin_unique", String(n));

  const [pc, gk, pk] = await Promise.all([
    prisma.permission.count(),
    prisma.group.count(),
    prisma.permissionPack.count(),
  ]);
  if (pc >= 50 && gk === 7 && pk === 9) ok("catalog", `perm=${pc} g=${gk} p=${pk}`);
  else ko("catalog", `perm=${pc} g=${gk} p=${pk}`);

  const direction = await prisma.group.findUnique({
    where: { code: "direction" },
    include: { defaultPack: true },
  });
  if (direction?.defaultPack?.code === "direction") ok("direction_pack_default");
  else ko("direction_pack_default", direction?.defaultPack?.code);

  if (!url || !anon || !service) {
    ko("supabase_env");
  } else {
    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const sb = createClient(url, anon);
    const testEmail = `gate.${Date.now()}@mskcreation.net`;
    const temp = `Gate-${Math.random().toString(36).slice(2, 8)}!A1`;
    const created = await admin.auth.admin.createUser({
      email: testEmail,
      password: temp,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      ko("invite_auth", created.error?.message);
    } else {
      const id = created.data.user.id;
      const collab = await prisma.group.findUnique({ where: { code: "collaborateur" } });
      await prisma.user.create({
        data: {
          id,
          email: testEmail,
          firstName: "Gate",
          lastName: "User",
          status: UserStatus.INVITE_PENDING,
          mustChangePassword: true,
          invitedAt: new Date(),
          groupMembers: collab ? { create: [{ groupId: collab.id }] } : undefined,
        },
      });
      ok("invite_prisma", id);

      const login = await sb.auth.signInWithPassword({ email: testEmail, password: temp });
      if (login.error) ko("invite_login", login.error.message);
      else ok("invite_login");

      await prisma.user.update({
        where: { id },
        data: { status: UserStatus.SUSPENDED, suspendedAt: new Date() },
      });
      await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
      await sb.auth.signOut();
      const banned = await sb.auth.signInWithPassword({ email: testEmail, password: temp });
      if (banned.error) ok("suspend_blocks_auth", banned.error.message);
      else {
        ko("suspend_blocks_auth");
        await sb.auth.signOut();
      }

      await prisma.user.delete({ where: { id } }).catch(() => {});
      await admin.auth.admin.deleteUser(id);
      ok("invite_cleanup");
    }
  }

  for (const p of [
    "src/app/(auth)/login/page.tsx",
    "src/app/register/page.tsx",
    "src/app/(app)/accueil/page.tsx",
    "src/app/(app)/administration/utilisateurs/page.tsx",
    "src/app/(app)/administration/utilisateurs/inviter/page.tsx",
    "src/app/(app)/administration/utilisateurs/[id]/page.tsx",
    "src/middleware.ts",
  ]) {
    if (existsSync(p)) ok(`file:${p.split("/").slice(-2).join("/")}`);
    else ko(`file:${p}`);
  }
} catch (e) {
  ko("exception", String(e));
} finally {
  await prisma.$disconnect();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} OK`);
process.exit(failed ? 1 : 0);
