/**
 * Revue UX RH + Mon espace (Vague A).
 * Usage: BASE_URL=http://localhost:3000 NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/review-ux-rh-espace.mjs
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "a.guiro@mskcreation.net";
const prisma = new PrismaClient();
const results = [];
const pass = (m) => {
  console.log(`  ✓ ${m}`);
  results.push({ ok: true, m });
};
const fail = (m) => {
  console.error(`  ✗ ${m}`);
  results.push({ ok: false, m });
};

async function getCookies(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;
  const anonC = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: verified, error: ve } = await anonC.auth.verifyOtp({
    type: "email",
    token_hash: data.properties.hashed_token,
  });
  if (ve || !verified.session) throw ve ?? new Error("session");
  const jar = [];
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () => jar.map((c) => ({ name: c.name, value: c.value })),
      setAll: (cookies) => {
        for (const c of cookies) {
          const i = jar.findIndex((x) => x.name === c.name);
          if (i >= 0) jar[i] = c;
          else jar.push(c);
        }
      },
    },
  });
  await ssr.auth.setSession({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  });
  return jar;
}

async function main() {
  const ping = await fetch(`${BASE}/login`).catch(() => null);
  if (!ping?.ok) {
    console.error("Serveur inaccessible");
    process.exit(1);
  }

  const emp = await prisma.rhEmployee.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    include: { contracts: { take: 1, orderBy: { startDate: "desc" } } },
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const cookies = await getCookies(EMAIL);
  await context.addCookies(
    cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: "/",
    })),
  );
  const page = await context.newPage();

  console.log("\n══ Mon espace ══");
  await page.goto(`${BASE}/espace`, { waitUntil: "networkidle" });
  const espace = await page.locator("body").innerText();
  for (const label of ["Mes contrats", "Mes documents", "Mes congés"]) {
    if (espace.includes(label)) pass(`Hub: ${label}`);
    else fail(`Hub manque: ${label}`);
  }

  await page.goto(`${BASE}/espace/contrats`, { waitUntil: "networkidle" });
  if (page.url().includes("/espace/contrats")) {
    const back = page.getByRole("link", { name: /Retour à Mon espace/i });
    if (await back.count()) pass("Contrats: retour Mon espace");
    else fail("Contrats: pas de retour");
  } else fail("Route /espace/contrats KO");

  await page.goto(`${BASE}/espace/documents`, { waitUntil: "networkidle" });
  if (page.url().includes("/espace/documents")) pass("Documents self OK");
  else fail("Documents self KO");

  if (emp) {
    console.log(`\n══ Fiche collab ${emp.firstName} ══`);
    await page.goto(`${BASE}/rh/collaborateurs/${emp.id}`, {
      waitUntil: "networkidle",
    });
    const t = await page.locator("body").innerText();
    if (/Identité|Documents RH|Cycle de vie|Contrats/i.test(t))
      pass("Sections fiche collab présentes");
    else fail("Sections fiche collab manquantes");

    const backCollab = page.getByRole("link", {
      name: /Retour aux collaborateurs/i,
    });
    if (await backCollab.count()) pass("Retour collaborateurs");
    else fail("Pas de retour collaborateurs");

    // Doc state: after generate once, expect Voir or Générer
    if (/Voir \/ Télécharger|Générer|Regénérer/i.test(t))
      pass("Actions documents visibles");
    else fail("Actions documents absentes");

    if (emp.contracts[0]) {
      console.log("\n══ Navigation contrat depuis collab ══");
      await page.goto(
        `${BASE}/rh/contrats/${emp.contracts[0].id}?from=collab&employeeId=${emp.id}`,
        { waitUntil: "networkidle" },
      );
      const back = page.getByRole("link", {
        name: new RegExp(`Retour à ${emp.firstName}`, "i"),
      });
      if (await back.count()) pass("Retour vers collab depuis contrat");
      else fail("Retour collab depuis contrat KO");
    }
  } else fail("Aucun collaborateur ACTIVE");

  await browser.close();
  await prisma.$disconnect();
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n══ Bilan UX RH/espace : ${results.filter((r) => r.ok).length}/${results.length} PASS ══`,
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
