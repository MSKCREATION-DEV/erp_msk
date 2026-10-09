/**
 * Smoke UI Playwright — parcours authentifié Super Admin.
 * Usage: BASE_URL=http://localhost:3000 node scripts/smoke-ui.mjs
 * Prérequis: `npm run dev` (ou `next start`) déjà lancé.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import path from "path";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "a.guiro@mskcreation.net";
const SHOT_DIR = path.join(process.cwd(), "tmp/smoke-ui");

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

async function getAuthCookies() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !service || !anon) {
    throw new Error("Supabase env manquantes");
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: EMAIL,
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

async function assertPage(page, route, expectText, shotName) {
  const res = await page.goto(`${BASE}${route}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  const status = res?.status() ?? 0;
  const body = await page.locator("body").innerText();
  const html = await page.content();

  if (status >= 400) fail(`${route} HTTP ${status}`);
  else if (/Service temporairement saturé|Une erreur est survenue|Invalid `prisma/i.test(body)) {
    fail(`${route} affiche une erreur UI`);
  } else if (expectText && !body.includes(expectText)) {
    fail(`${route} manque « ${expectText} »`);
  } else if (page.url().includes("/login")) {
    fail(`${route} redirigé vers /login (auth)`);
  } else {
    ok(`${route} — ${expectText ?? "OK"}`);
  }

  if (shotName) {
    await page.screenshot({
      path: path.join(SHOT_DIR, `${shotName}.png`),
      fullPage: true,
    });
  }

  // Console errors (ignore HMR / favicon)
  return { status, body, html };
}

async function main() {
  mkdirSync(SHOT_DIR, { recursive: true });

  // Health
  try {
    const r = await fetch(`${BASE}/login`);
    if (!r.ok) throw new Error(`login HTTP ${r.status}`);
    ok(`Serveur joignable ${BASE}`);
  } catch (e) {
    fail(`Serveur inaccessible (${BASE}) — lance \`npm run dev\``);
    console.error(e.message);
    process.exit(1);
  }

  const jar = await getAuthCookies();
  ok(`Session smoke ${EMAIL}`);

  const browser = await chromium.launch({ headless: true });
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
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // Public login (sans cookies) — contexte isolé
  {
    const pub = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "fr-FR",
    });
    const loginPage = await pub.newPage();
    await loginPage.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    const loginText = await loginPage.locator("body").innerText();
    if (loginText.includes("Connexion") && loginText.includes("E-mail")) {
      ok("Login page");
    } else fail("Login page cassée");
    await loginPage.screenshot({ path: path.join(SHOT_DIR, "00-login.png") });
    await pub.close();
  }
  await page.screenshot({ path: path.join(SHOT_DIR, "00b-session.png") });

  // Authenticated routes
  await assertPage(page, "/accueil", "Bonjour", "01-accueil");
  await assertPage(page, "/ged", "GED", "02-ged");
  await assertPage(page, "/organisation", "Organisation", "03-organisation");
  await assertPage(page, "/catalogue", "Catalogue", "04-catalogue");
  await assertPage(page, "/crm", "CRM", "05-crm");
  await assertPage(page, "/crm/prospects", "Prospects", "06-crm-prospects");
  await assertPage(page, "/crm/relances", "Relances", "07-crm-relances");
  await assertPage(page, "/crm/scripts", "Scripts", "08-crm-scripts");
  await assertPage(page, "/profil/signature", "signature", "09-signature");
  await assertPage(page, "/administration/gabarits", "Gabarits", "10-gabarits");
  await assertPage(page, "/administration/signatures", "Signatures", "11-signatures");
  await assertPage(page, "/administration/charte", "Charte", "12-charte");

  // Nav CRM / Catalogue visibles (plus « bientôt »)
  await page.goto(`${BASE}/accueil`, { waitUntil: "networkidle" });
  const nav = await page.locator("nav, aside").first().innerText();
  if (/\bCRM\b/.test(nav) && !nav.includes("/bientot/crm")) ok("Nav CRM live");
  else fail("Nav CRM absente ou still bientôt");
  if (/Catalogue/.test(nav)) ok("Nav Catalogue live");
  else fail("Nav Catalogue absente");

  // Listing prospects : pas de formulaire create inline
  await page.goto(`${BASE}/crm/prospects`, { waitUntil: "networkidle" });
  const prospectsList = await page.locator("body").innerText();
  if (await page.locator("#orgName").count()) {
    fail("Formulaire create encore sur listing prospects");
  } else if (
    prospectsList.includes("Nouveau prospect") ||
    prospectsList.includes("Créer le premier")
  ) {
    ok("Prospects listing sans create inline");
  } else {
    fail("CTA Nouveau prospect absent du listing");
  }

  // Créer un prospect via page dédiée
  await page.goto(`${BASE}/crm/prospects/nouveau`, { waitUntil: "networkidle" });
  const stamp = Date.now().toString().slice(-5);
  const orgName = `Smoke UI ${stamp}`;
  if (await page.locator("#orgName").count()) {
    const back = await page.locator("body").innerText();
    if (back.includes("Retour")) ok("Retour arrière page nouveau prospect");
    else fail("Retour arrière manquant sur /crm/prospects/nouveau");

    await page.fill("#orgName", orgName);
    await page.fill("#contactFirst", "Test");
    await page.fill("#contactLast", "Smoke");
    await page.fill("#nextAction", "Relance smoke");
    await page.click('button[type="submit"]');
    await page
      .waitForURL(
        (u) =>
          /\/crm\/prospects\/[^/]+$/.test(u.pathname) &&
          !u.pathname.endsWith("/nouveau"),
        { timeout: 30000 },
      )
      .catch(() => null);
    const url = page.url();
    if (
      /\/crm\/prospects\/[^/?]+$/.test(url.replace(BASE, "")) &&
      !url.includes("/nouveau")
    ) {
      ok(`Prospect créé → ${url.replace(BASE, "")}`);
      // Attendre la fiche réelle (pas le loading.tsx skeleton)
      await page
        .getByRole("link", { name: /Retour aux prospects/i })
        .waitFor({ timeout: 20000 })
        .catch(() => null);
      await page.screenshot({
        path: path.join(SHOT_DIR, "13-prospect-detail.png"),
        fullPage: true,
      });

      const detailBack = await page.locator("body").innerText();
      if (/Retour aux prospects/i.test(detailBack)) ok("Retour fiche prospect");
      else fail("Retour manquant sur fiche prospect");

      // Changer étape
      if (await page.locator("#stage").count()) {
        await page.selectOption("#stage", "CONTACTE");
        await page.locator('form').filter({ has: page.locator("#stage") }).locator('button[type="submit"]').click();
        await page.waitForTimeout(800);
        const txt = await page.locator("body").innerText();
        if (txt.includes("Contacté")) ok("Pipeline → Contacté");
        else fail("Changement d’étape non visible");
      }

      // Quick-log — attendre fin pending puis timeline (actions parfois lentes)
      if (await page.locator("#summary").count()) {
        await page.fill("#summary", "Smoke activité auto");
        await page.locator("#activity-form button[type='submit']").click();
        try {
          await page
            .locator("#activity-form button[type='submit']")
            .filter({ hasText: /^Logger$/ })
            .waitFor({ timeout: 45000 });
          await page.getByText("Smoke activité auto").waitFor({
            timeout: 20000,
          });
          ok("Quick-log activité");
        } catch {
          await page.screenshot({
            path: path.join(SHOT_DIR, "13b-activity-fail.png"),
            fullPage: true,
          });
          fail("Activité non apparue dans timeline");
        }
      }
    } else {
      fail("Création prospect : pas de redirection fiche");
      await page.screenshot({
        path: path.join(SHOT_DIR, "13-prospect-fail.png"),
        fullPage: true,
      });
    }
  } else {
    fail("Formulaire nouveau prospect introuvable sur /nouveau");
  }

  // Catalogue pricing Marinas + piliers
  await page.goto(`${BASE}/catalogue`, { waitUntil: "networkidle" });
  const cat = await page.locator("body").innerText();
  if (cat.includes("Recommandé") || cat.includes("150")) ok("Catalogue pricing RS Pro");
  else fail("Catalogue pricing RS (Pro / recommandé) manquant");
  // Titres piliers en CSS uppercase → innerText souvent en majuscules
  const catNorm = cat.toLowerCase();
  for (const p of [
    "Image de marque",
    "Contenu & Communication",
    "Présence Digitale",
    "Croissance & Acquisition",
    "Transformation & Structuration",
  ]) {
    if (catNorm.includes(p.toLowerCase())) ok(`Catalogue pilier « ${p} »`);
    else fail(`Catalogue manque pilier « ${p} »`);
  }

  // Scripts manage CTA
  await page.goto(`${BASE}/crm/scripts`, { waitUntil: "networkidle" });
  const scriptsBody = await page.locator("body").innerText();
  if (scriptsBody.includes("Nouveau script") || scriptsBody.includes("Éditer")) {
    ok("Scripts gestion CRUD visible");
  } else if (scriptsBody.includes("Premier contact")) {
    ok("Scripts lecture OK");
  } else fail("Scripts page vide / cassée");

  // Déconnexion modal
  await page.goto(`${BASE}/accueil`, { waitUntil: "networkidle" });
  const logoutBtn = page.getByTitle("Déconnexion");
  if (await logoutBtn.count()) {
    await logoutBtn.click();
    await page.waitForTimeout(400);
    const modal = await page.locator("body").innerText();
    if (modal.includes("Se déconnecter") || modal.includes("Déconnexion")) {
      ok("Modal déconnexion MSK");
      await page.screenshot({ path: path.join(SHOT_DIR, "14-logout-modal.png") });
      // Annuler pour ne pas casser la suite
      const cancel = page.getByRole("button", { name: /Rester|Annuler/i });
      if (await cancel.count()) await cancel.click();
    } else fail("Modal déconnexion absente");
  } else fail("Bouton déconnexion introuvable");

  const serious = consoleErrors.filter(
    (e) =>
      !/favicon|hydration|Download the React DevTools|Extra attributes/i.test(e),
  );
  if (serious.length) {
    fail(`Erreurs console: ${serious.slice(0, 3).join(" | ")}`);
  } else ok("Pas d’erreur console bloquante");

  await browser.close();

  const failed = checks.filter((c) => !c.ok).length;
  const passed = checks.filter((c) => c.ok).length;
  console.log("\n———");
  console.log(`Smoke UI: ${passed} OK · ${failed} KO`);
  console.log(`Screenshots: ${SHOT_DIR}`);
  if (failed) {
    console.log("Gate UI ÉCHEC — corriger avant test humain");
    process.exit(1);
  }
  console.log("Gate UI technique OK — prêt pour validation humaine");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
