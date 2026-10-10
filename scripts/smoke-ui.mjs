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

  // Nav CRM / Catalogue / Commercial visibles (plus « bientôt »)
  await page.goto(`${BASE}/accueil`, { waitUntil: "networkidle" });
  const nav = await page.locator("nav, aside").first().innerText();
  if (/\bCRM\b/.test(nav) && !nav.includes("/bientot/crm")) ok("Nav CRM live");
  else fail("Nav CRM absente ou still bientôt");
  if (/Catalogue/.test(nav)) ok("Nav Catalogue live");
  else fail("Nav Catalogue absente");
  if (/\bCommercial\b/.test(nav) && !nav.includes("/bientot/commercial")) {
    ok("Nav Commercial live");
  } else fail("Nav Commercial absente ou still bientôt");

  await assertPage(page, "/commercial", "Commercial", "15-commercial");
  await assertPage(page, "/commercial/clients", "Clients", "16-com-clients");
  await assertPage(page, "/commercial/devis", "Devis", "17-com-devis");
  await assertPage(page, "/commercial/factures", "Factures", "18-com-factures");

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

  // ——— Phase 3 : client → devis → facture → paiement ———
  const comStamp = Date.now().toString().slice(-5);
  const clientName = `Smoke Client ${comStamp}`;
  await page.goto(`${BASE}/commercial/clients/nouveau`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  if (await page.locator("#name").count()) {
    const backClient = await page.locator("body").innerText();
    if (/Retour/.test(backClient)) ok("Retour page nouveau client");
    else fail("Retour manquant /commercial/clients/nouveau");

    await page.fill("#name", clientName);
    await page.fill("#contactName", "Smoke Contact");
    await page.fill("#city", "Bamako");
    await page.click('button[type="submit"]');
    await page
      .waitForURL(
        (u) =>
          /\/commercial\/clients\/[^/]+$/.test(u.pathname) &&
          !u.pathname.endsWith("/nouveau"),
        { timeout: 45000 },
      )
      .catch(() => null);
    if (/\/commercial\/clients\/[^/?]+$/.test(page.url().replace(BASE, ""))) {
      ok(`Client COM créé → ${page.url().replace(BASE, "")}`);
      await page.screenshot({
        path: path.join(SHOT_DIR, "19-com-client.png"),
        fullPage: true,
      });
    } else {
      fail("Création client : pas de redirection fiche");
      await page.screenshot({
        path: path.join(SHOT_DIR, "19-com-client-fail.png"),
        fullPage: true,
      });
    }
  } else {
    fail("Formulaire nouveau client introuvable");
  }

  await page.goto(`${BASE}/commercial/devis/nouveau`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  if (await page.locator("#clientId").count()) {
    // Sélectionner le client smoke (dernier créé souvent en fin de liste alpha)
    const clientOpt = page.locator(`#clientId option`).filter({
      hasText: clientName,
    });
    if ((await clientOpt.count()) > 0) {
      const val = await clientOpt.first().getAttribute("value");
      await page.selectOption("#clientId", val);
    } else {
      // fallback première option non vide
      const opts = page.locator("#clientId option");
      const n = await opts.count();
      for (let i = 0; i < n; i++) {
        const v = await opts.nth(i).getAttribute("value");
        if (v) {
          await page.selectOption("#clientId", v);
          break;
        }
      }
    }

    // Ajouter offre catalogue si dispo
    const offerSelect = page.locator("select").filter({
      has: page.locator('option:has-text("Offre catalogue")'),
    });
    if (await offerSelect.count()) {
      const offerOpts = offerSelect.locator("option");
      const oc = await offerOpts.count();
      if (oc > 1) {
        const ov = await offerOpts.nth(1).getAttribute("value");
        if (ov) await offerSelect.selectOption(ov);
      }
    }

    // Garantir au moins une ligne avec libellé
    const labelInputs = page.locator('input[placeholder="Libellé"]');
    if (await labelInputs.count()) {
      const first = labelInputs.first();
      const cur = await first.inputValue();
      if (!cur) await first.fill(`Offre smoke ${comStamp}`);
      const priceInputs = page.locator('input[type="number"]');
      // qty puis unitPrice sur première ligne — remplir unitPrice si 0
      const countNum = await priceInputs.count();
      if (countNum >= 2) {
        const unit = priceInputs.nth(1);
        const uv = await unit.inputValue();
        if (!uv || uv === "0") await unit.fill("100000");
      }
    }

    await page.click('button[type="submit"]');
    await page
      .waitForURL(
        (u) =>
          /\/commercial\/devis\/[^/]+$/.test(u.pathname) &&
          !u.pathname.endsWith("/nouveau"),
        { timeout: 60000 },
      )
      .catch(() => null);

    if (/\/commercial\/devis\/[^/?]+$/.test(page.url().replace(BASE, ""))) {
      ok(`Devis créé → ${page.url().replace(BASE, "")}`);
      await page
        .getByRole("link", { name: /Retour aux devis/i })
        .waitFor({ timeout: 20000 })
        .catch(() => null);
      await page.screenshot({
        path: path.join(SHOT_DIR, "20-com-devis.png"),
        fullPage: true,
      });

      // Envoyer — attendre disparition du CTA + apparition Accepter (évite faux positif « Marquer envoyé »)
      const sendBtn = page.getByRole("button", { name: /Marquer envoyé/i });
      if (await sendBtn.count()) {
        await sendBtn.click();
        try {
          await page
            .getByRole("button", { name: /^Accepter$/i })
            .waitFor({ timeout: 60000 });
          ok("Devis → Envoyé");
        } catch {
          await page.screenshot({
            path: path.join(SHOT_DIR, "20b-send-fail.png"),
            fullPage: true,
          });
          fail("Statut Envoyé / bouton Accepter non visible");
        }
      } else fail("Bouton Marquer envoyé absent");

      // Accepter
      const acceptBtn = page.getByRole("button", { name: /^Accepter$/i });
      if (await acceptBtn.count()) {
        await acceptBtn.click();
        try {
          await page
            .getByRole("button", { name: /Créer facture/i })
            .waitFor({ timeout: 60000 });
          const bodyAcc = await page.locator("body").innerText();
          if (/Accepté/i.test(bodyAcc)) ok("Devis → Accepté");
          else ok("Devis accepté (CTA facture visible)");
        } catch {
          await page.screenshot({
            path: path.join(SHOT_DIR, "20c-accept-fail.png"),
            fullPage: true,
          });
          fail("Statut Accepté / CTA facture non visible");
        }
      } else fail("Bouton Accepter absent");

      // Facture
      const invBtn = page.getByRole("button", { name: /Créer facture/i });
      if (await invBtn.count()) {
        await invBtn.click();
        await page
          .waitForURL(/\/commercial\/factures\/[^/]+$/, { timeout: 60000 })
          .catch(() => null);
        if (/\/commercial\/factures\//.test(page.url())) {
          ok(`Facture créée → ${page.url().replace(BASE, "")}`);
          await page
            .getByRole("link", { name: /Retour aux factures/i })
            .waitFor({ timeout: 20000 })
            .catch(() => null);
          await page.screenshot({
            path: path.join(SHOT_DIR, "21-com-facture.png"),
            fullPage: true,
          });

          const issueBtn = page.getByRole("button", { name: /^Émettre$/i });
          if (await issueBtn.count()) {
            await issueBtn.click();
            try {
              await page.locator("#amount").waitFor({ timeout: 60000 });
              ok("Facture émise");
            } catch {
              const bodyIss = await page.locator("body").innerText();
              if (/Émise|Partiellement|Payée/i.test(bodyIss)) ok("Facture émise");
              else fail("Émission facture non visible");
            }
          } else fail("Bouton Émettre absent");

          if (await page.locator("#amount").count()) {
            await page.fill("#amount", "50000");
            await page
              .getByRole("button", { name: /Enregistrer le paiement/i })
              .click();
            try {
              await page
                .getByText(/Partiellement payée/i)
                .waitFor({ timeout: 60000 });
              ok("Paiement enregistré");
            } catch {
              const bodyPay = await page.locator("body").innerText();
              if (/Partiellement payée|Payée/i.test(bodyPay)) {
                ok("Paiement enregistré");
              } else fail("Paiement non visible");
            }
            await page.screenshot({
              path: path.join(SHOT_DIR, "22-com-paiement.png"),
              fullPage: true,
            });
          } else fail("Formulaire paiement absent");
        } else {
          fail("Création facture : pas de redirection");
        }
      } else fail("Bouton Créer facture absent");
    } else {
      fail("Création devis : pas de redirection fiche");
      await page.screenshot({
        path: path.join(SHOT_DIR, "20-com-devis-fail.png"),
        fullPage: true,
      });
    }
  } else {
    fail("Formulaire nouveau devis introuvable");
  }

  // ——— Phase 6 Comptabilité ———
  await page.goto(`${BASE}/comptabilite`, { waitUntil: "networkidle" });
  {
    const urlOk = page.url().includes("/comptabilite") && !page.url().includes("/bientot/");
    const body = await page.locator("body").innerText();
    if (urlOk && /Plan de comptes|SYSCOHADA|Écritures/i.test(body)) {
      ok("Hub Comptabilité");
    } else fail("Hub Comptabilité inaccessible");
    await page.screenshot({
      path: path.join(SHOT_DIR, "30-cpt-hub.png"),
      fullPage: true,
    });
  }

  await page.goto(`${BASE}/comptabilite/plan`, { waitUntil: "networkidle" });
  {
    const body = await page.locator("body").innerText();
    if (/4111|706|5211|Clients|Services/i.test(body)) ok("Plan de comptes OHADA");
    else fail("Plan de comptes vide / incorrect");
  }

  await page.goto(`${BASE}/comptabilite/ecritures/nouveau`, {
    waitUntil: "networkidle",
  });
  {
    const journalSelect = page.locator("#journalId");
    if (!(await journalSelect.count())) {
      fail("Formulaire nouvelle écriture absent");
    } else {
      const odValue = await journalSelect.locator("option").evaluateAll((opts) => {
        const hit = opts.find((o) => /^OD\b/i.test((o.textContent || "").trim()));
        return hit ? hit.value : null;
      });
      if (odValue) await journalSelect.selectOption(odValue);
      else fail("Journal OD introuvable");

      await page.locator("#label").fill("Smoke UI OD Phase 6");

      const rows = page.locator("tbody tr");
      const row0 = rows.nth(0);
      const row1 = rows.nth(1);
      const pickAccount = async (row, code) => {
        const sel = row.locator("select");
        const value = await sel.locator("option").evaluateAll(
          (opts, c) => {
            const hit = opts.find((o) => (o.textContent || "").includes(c));
            return hit ? hit.value : null;
          },
          code,
        );
        if (!value) return false;
        await sel.selectOption(value);
        return true;
      };

      const ok411 = await pickAccount(row0, "4111");
      const ok706 = await pickAccount(row1, "706");
      if (!ok411 || !ok706) {
        await page.screenshot({
          path: path.join(SHOT_DIR, "31-cpt-entry-form.png"),
          fullPage: true,
        });
        fail("Comptes 4111/706 introuvables dans le formulaire");
      } else {
        // Ligne 0 : débit ; ligne 1 : crédit (inputs number dans l’ordre)
        await row0.locator('input[type="number"]').nth(0).fill("10000");
        await row1.locator('input[type="number"]').nth(1).fill("10000");

        await page
          .getByRole("button", { name: /Créer l.écriture/i })
          .click();
        try {
          // Exclure /nouveau (sinon waitForURL réussit immédiatement)
          await page.waitForURL(
            (u) =>
              /\/comptabilite\/ecritures\/[^/]+$/.test(u.pathname) &&
              !u.pathname.endsWith("/nouveau"),
            { timeout: 60000 },
          );
          ok("Écriture OD créée");
          await page.screenshot({
            path: path.join(SHOT_DIR, "32-cpt-entry.png"),
            fullPage: true,
          });
          const validateBtn = page.getByRole("button", {
            name: /Valider l.écriture/i,
          });
          await validateBtn.waitFor({ timeout: 15000 });
          await validateBtn.click();
          await page.getByText(/^Validée$/i).waitFor({ timeout: 30000 });
          ok("Écriture validée");
        } catch {
          await page.screenshot({
            path: path.join(SHOT_DIR, "31-cpt-entry-fail.png"),
            fullPage: true,
          });
          fail("Création / validation écriture échouée");
        }
      }
    }
  }

  await page.goto(`${BASE}/comptabilite/banques`, { waitUntil: "networkidle" });
  {
    const body = await page.locator("body").innerText();
    if (/ECOBANK/i.test(body)) ok("Liste banques ECOBANK");
    else fail("Banques ECOBANK absentes");
    await page.screenshot({
      path: path.join(SHOT_DIR, "33-cpt-banques.png"),
      fullPage: true,
    });
    const bankHref = await page
      .locator('a[href^="/comptabilite/banques/"]')
      .filter({ hasText: /ECOBANK Compte 1/i })
      .first()
      .getAttribute("href");
    if (bankHref) {
      await page.goto(`${BASE}${bankHref}/mouvements/nouveau`, {
        waitUntil: "networkidle",
      });
      if (await page.locator("#label, input[name='label']").count()) {
        await page.locator("#label, input[name='label']").first().fill(
          "Smoke relevé ECOBANK",
        );
        await page.locator("#amount, input[name='amount']").first().fill("25000");
        await page
          .getByRole("button", { name: /Enregistrer le mouvement/i })
          .click();
        await page.waitForURL(
          (u) =>
            /\/comptabilite\/banques\/[^/]+$/.test(u.pathname) &&
            !u.pathname.includes("/mouvements/"),
          { timeout: 60000 },
        );
        await page.waitForLoadState("networkidle");
        try {
          await page.getByText(/Smoke relevé ECOBANK/i).waitFor({ timeout: 20000 });
          ok("Mouvement bancaire créé");
        } catch {
          const b = await page.locator("body").innerText();
          if (/25[\s\u00a0]?000/i.test(b)) ok("Mouvement bancaire créé (montant)");
          else fail("Mouvement bancaire non visible après redirect");
        }
        await page.screenshot({
          path: path.join(SHOT_DIR, "34-cpt-bank-txn.png"),
          fullPage: true,
        });
      } else {
        await page.screenshot({
          path: path.join(SHOT_DIR, "34-cpt-bank-fail.png"),
          fullPage: true,
        });
        fail("Formulaire mouvement bancaire absent");
      }
    } else fail("Lien ECOBANK Compte 1 absent");
  }

  await page.goto(`${BASE}/comptabilite/etats`, { waitUntil: "networkidle" });
  {
    const body = await page.locator("body").innerText();
    if (/Bilan|Balance|Résultat|Compte de résultat/i.test(body)) {
      ok("États financiers");
    } else fail("États financiers incomplets");
    await page.screenshot({
      path: path.join(SHOT_DIR, "35-cpt-etats.png"),
      fullPage: true,
    });
  }

  await page.goto(`${BASE}/comptabilite/budget`, { waitUntil: "networkidle" });
  {
    const body = await page.locator("body").innerText();
    if (/Budget/i.test(body)) ok("Budget");
    else fail("Page budget inaccessible");
  }

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
