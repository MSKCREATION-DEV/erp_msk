/**
 * Smoke RBAC A→Z — profils réalistes + croisements groupes / packs / UI.
 *
 * Profils:
 *   - Super Admin  a.guiro@mskcreation.net
 *   - Commercial   pro.asguiro@gmail.com (Yaye Bah — groupes collaborateur+commerciaux)
 *
 * Usage: BASE_URL=http://localhost:3000 npm run smoke:rbac
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.SMOKE_EMAIL ?? "a.guiro@mskcreation.net";
const COM_EMAIL =
  process.env.SMOKE_COMMERCIAL_EMAIL ?? "pro.asguiro@gmail.com";
const SHOT_DIR = path.join(process.cwd(), "tmp/smoke-rbac");
const prisma = new PrismaClient();

const checks = [];
function ok(msg) {
  console.log(`✓ ${msg}`);
  checks.push({ ok: true, msg });
}
function fail(msg) {
  console.error(`✗ ${msg}`);
  checks.push({ ok: false, msg });
  process.exitCode = 1;
}

async function getAuthCookies(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !service || !anon) throw new Error("Supabase env manquantes");

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
  if (ve || !verified.session) throw ve ?? new Error("Pas de session");

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

async function withSession(browser, email, fn) {
  const jar = await getAuthCookies(email);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "fr-FR",
  });
  await context.addCookies(
    jar.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    })),
  );
  const page = await context.newPage();
  try {
    await fn(page);
  } finally {
    await context.close();
  }
}

async function bodyOf(page, route) {
  await page.goto(`${BASE}${route}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  await page.waitForTimeout(400);
  return {
    url: page.url(),
    text: await page.locator("body").innerText(),
  };
}

async function assertDbComposition() {
  const u = await prisma.user.findUnique({
    where: { email: COM_EMAIL },
    include: {
      groupMembers: { include: { group: { include: { defaultPack: true } } } },
      userPacks: { include: { pack: true } },
      overrides: true,
    },
  });
  if (!u) {
    fail(`DB: compte ${COM_EMAIL} introuvable`);
    return null;
  }
  const groups = u.groupMembers.map((m) => m.group.code).sort();
  const directs = u.userPacks.map((p) => p.pack.code).sort();
  if (directs.includes("admin_crm")) {
    fail("DB Yaye: pack direct admin_crm encore présent");
  } else ok("DB Yaye: pas de pack Admin CRM");
  if (!groups.includes("commerciaux")) fail("DB Yaye: groupe commerciaux manquant");
  else ok("DB Yaye: groupe Commerciaux");
  if (!groups.includes("collaborateur")) {
    fail("DB Yaye: groupe collaborateur manquant");
  } else ok("DB Yaye: groupe Collaborateur");
  if (directs.length > 0) {
    fail(`DB Yaye: packs directs inattendus (${directs.join(", ")}) — préférer héritage groupe`);
  } else ok("DB Yaye: aucun pack direct (héritage groupe seul)");
  if (u.overrides.length) fail("DB Yaye: overrides inattendus");
  else ok("DB Yaye: aucun override");
  return u;
}

async function main() {
  mkdirSync(SHOT_DIR, { recursive: true });

  try {
    const r = await fetch(`${BASE}/login`);
    if (!r.ok) throw new Error(`login HTTP ${r.status}`);
    ok(`Serveur ${BASE}`);
  } catch (e) {
    fail(`Serveur inaccessible — npm run dev`);
    console.error(e.message);
    process.exit(1);
  }

  await assertDbComposition();

  const year = new Date().getFullYear();
  const modeles = await prisma.documentFolder.findUnique({
    where: { path: `/${year}/04_MODELES` },
  });
  const compta = await prisma.documentFolder.findUnique({
    where: { path: `/${year}/01_COMPTABILITE_ANNUELLE` },
  });

  const browser = await chromium.launch({ headless: true });

  // ——— Super Admin ———
  await withSession(browser, ADMIN_EMAIL, async (page) => {
    let r = await bodyOf(page, "/accueil");
    if (/Super Admin/i.test(r.text)) ok("Admin Accueil — chip Super Admin");
    else fail("Admin Accueil — chip Super Admin absente");

    r = await bodyOf(page, "/ged");
    if (/Comptabilité|Modèles|Clients/i.test(r.text)) {
      ok("Admin GED — arbo complète");
    } else fail("Admin GED incomplète");

    r = await bodyOf(page, "/catalogue");
    if (/Nouvelle offre/i.test(r.text)) ok("Admin Catalogue — CTA manage");
    else fail("Admin Catalogue — CTA Nouvelle offre absent");

    r = await bodyOf(page, "/administration/utilisateurs");
    if (/Utilisateurs|Inviter/i.test(r.text) && !r.url.includes("/login")) {
      ok("Admin — liste utilisateurs");
    } else fail("Admin utilisateurs KO");

    await page.screenshot({
      path: path.join(SHOT_DIR, "10-admin.png"),
      fullPage: true,
    });
  });

  // ——— Commercial terrain (Yaye Bah) ———
  await withSession(browser, COM_EMAIL, async (page) => {
    let r = await bodyOf(page, "/accueil");
    if (r.url.includes("changer-mot-de-passe")) {
      fail("Commercial bloqué sur changer-mot-de-passe");
      return;
    }
    if (/Admin CRM/i.test(r.text)) fail("Accueil affiche encore Admin CRM");
    else ok("Accueil — plus de chip Admin CRM");
    if (/Commerciaux|Commercial|Collaborateur/i.test(r.text)) {
      ok("Accueil — chips métier présents");
    } else fail("Accueil — chips métier absents");

    // GED scoped
    r = await bodyOf(page, "/ged");
    if (/Comptabilité annuelle|Comptabilité mensuelle/i.test(r.text)) {
      fail("Commercial GED — Comptabilité visible");
    } else ok("Commercial GED — Comptabilité masquée");
    if (/\bModèles\b/i.test(r.text)) fail("Commercial GED — Modèles visibles");
    else ok("Commercial GED — Modèles masqués");
    if (/Clients|Collaborateurs/i.test(r.text)) {
      ok("Commercial GED — Clients/Collaborateurs");
    } else fail("Commercial GED — racines scoped absentes");
    if (/Vos dossiers/i.test(r.text)) ok("Commercial GED — libellé scoped");
    else ok("Commercial GED — page accessible");

    if (modeles) {
      r = await bodyOf(page, `/ged?folder=${modeles.id}`);
      if (r.url.includes(modeles.id) && /Devis|Factures/i.test(r.text)) {
        fail("Commercial force URL Modèles");
      } else ok("Commercial — URL Modèles bloquée");
    }
    if (compta) {
      r = await bodyOf(page, `/ged?folder=${compta.id}`);
      if (r.url.includes(compta.id)) fail("Commercial force URL Comptabilité");
      else ok("Commercial — URL Comptabilité redirigée");
    }

    // Catalogue lecture seule
    r = await bodyOf(page, "/catalogue");
    if (/Nouvelle offre/i.test(r.text)) {
      fail("Commercial Catalogue — CTA Nouvelle offre (manage)");
    } else ok("Commercial Catalogue — pas de Nouvelle offre");
    if (/Éditer|Désactiver/i.test(r.text)) {
      fail("Commercial Catalogue — Éditer/Désactiver visibles");
    } else ok("Commercial Catalogue — lecture seule");
    if (/Recommandé|STANDARD|Réseaux/i.test(r.text)) {
      ok("Commercial Catalogue — offres visibles");
    } else fail("Commercial Catalogue vide");

    // CRM + scripts
    r = await bodyOf(page, "/crm");
    if (/CRM|Prospect/i.test(r.text)) ok("Commercial CRM accessible");
    else fail("Commercial CRM KO");

    r = await bodyOf(page, "/crm/scripts");
    if (/Nouveau script/i.test(r.text)) {
      fail("Commercial Scripts — manage (Nouveau script)");
    } else ok("Commercial Scripts — pas de manage");

    // Commercial module
    r = await bodyOf(page, "/commercial");
    if (/Commercial|Clients|Devis/i.test(r.text)) {
      ok("Commercial module cash accessible");
    } else fail("Commercial module KO");

    r = await bodyOf(page, "/commercial/clients/nouveau");
    if (/Nouveau client|Créer le client/i.test(r.text)) {
      ok("Commercial — création client OK");
    } else fail("Commercial — /clients/nouveau KO");

    // Admin interdit
    r = await bodyOf(page, "/administration/utilisateurs");
    if (
      r.url.includes("/administration/utilisateurs") &&
      /Inviter|Utilisateurs/i.test(r.text) &&
      !/acces_refuse|Accueil/i.test(r.text)
    ) {
      // si redirigé accueil avec error
      fail("Commercial voit Admin utilisateurs");
    } else ok("Commercial — Admin utilisateurs refusé");

    r = await bodyOf(page, "/administration/gabarits");
    if (r.url.includes("/administration/gabarits") && /Gabarit/i.test(r.text)) {
      fail("Commercial voit Gabarits admin");
    } else ok("Commercial — Gabarits admin refusés");

    await page.screenshot({
      path: path.join(SHOT_DIR, "20-commercial-yaye.png"),
      fullPage: true,
    });

    // Flow métier léger : prospect réaliste
    r = await bodyOf(page, "/crm/prospects/nouveau");
    if (await page.locator("#orgName").count()) {
      const stamp = Date.now().toString().slice(-4);
      await page.fill("#orgName", `Boutique Salam ${stamp}`);
      await page.fill("#contactFirst", "Aïssata");
      await page.fill("#contactLast", "Konaté");
      await page.fill("#phone", "+223 70 00 11 22");
      await page.click('button[type="submit"]');
      await page
        .waitForURL(/\/crm\/prospects\/[^/]+$/, { timeout: 45000 })
        .catch(() => null);
      if (/\/crm\/prospects\/[^/?]+$/.test(page.url().replace(BASE, ""))) {
        ok("Flow prospect « Boutique Salam » créé");
      } else fail("Flow prospect création échouée");
    } else fail("Formulaire nouveau prospect absent");
  });

  await browser.close();
  await prisma.$disconnect();

  const failed = checks.filter((c) => !c.ok).length;
  const passed = checks.filter((c) => c.ok).length;
  console.log("\n———");
  console.log(`Smoke RBAC A→Z: ${passed} OK · ${failed} KO`);
  console.log(`Screenshots: ${SHOT_DIR}`);
  if (failed) process.exit(1);
  console.log("Smoke RBAC OK — profils croisés validés");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
