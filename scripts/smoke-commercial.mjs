/**
 * Smoke Commercial E2E — UI + actions (Super Admin).
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/smoke-commercial.mjs
 *   BASE_URL=https://erp-msk.vercel.app node scripts/smoke-commercial.mjs
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.SMOKE_EMAIL ?? "a.guiro@mskcreation.net";
const SHOT = path.join(process.cwd(), "tmp/smoke-commercial");
const prisma = new PrismaClient();
const isLocal = /localhost|127\.0\.0\.1/.test(BASE);
const cookieDomain = isLocal
  ? "localhost"
  : new URL(BASE).hostname;

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
function warn(msg) {
  console.warn(`⚠ ${msg}`);
  checks.push({ ok: true, warn: true, msg });
}

async function getAuthCookies() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !service || !anon) throw new Error("Supabase env manquantes");

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

async function shot(page, name) {
  await page.screenshot({
    path: path.join(SHOT, `${name}.png`),
    fullPage: true,
  });
}

async function goto(page, route, { expectText, shotName, allowEmpty } = {}) {
  const res = await page.goto(`${BASE}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(600);
  const status = res?.status() ?? 0;
  const body = await page.locator("body").innerText().catch(() => "");
  const url = page.url();

  if (url.includes("/login")) {
    fail(`${route} → login (auth)`);
    if (shotName) await shot(page, `${shotName}-login`);
    return { status, body, url, ok: false };
  }
  if (status >= 500) {
    fail(`${route} HTTP ${status}`);
    if (shotName) await shot(page, `${shotName}-err`);
    return { status, body, url, ok: false };
  }
  if (/Service temporairement saturé|Une erreur est survenue|Invalid `prisma/i.test(body)) {
    fail(`${route} erreur UI`);
    if (shotName) await shot(page, `${shotName}-err`);
    return { status, body, url, ok: false };
  }
  if (expectText && !body.includes(expectText)) {
    if (allowEmpty && /Aucun|aucune|pas encore/i.test(body)) {
      warn(`${route} empty OK (pas « ${expectText} »)`);
    } else {
      fail(`${route} manque « ${expectText} »`);
      if (shotName) await shot(page, `${shotName}-miss`);
      return { status, body, url, ok: false };
    }
  } else {
    ok(`${route}${expectText ? ` — ${expectText}` : ""}`);
  }
  if (shotName) await shot(page, shotName);
  return { status, body, url, ok: true };
}

async function main() {
  mkdirSync(SHOT, { recursive: true });
  console.log(`\n=== Smoke Commercial @ ${BASE} ===\n`);

  try {
    const r = await fetch(`${BASE}/login`);
    if (!r.ok) throw new Error(`login HTTP ${r.status}`);
    ok(`Serveur joignable`);
  } catch (e) {
    fail(`Serveur inaccessible — ${e.message}`);
    process.exit(1);
  }

  const jar = await getAuthCookies();
  ok(`Session ${EMAIL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "fr-FR",
  });
  await context.addCookies(
    jar.map((c) => ({
      name: c.name,
      value: c.value,
      domain: cookieDomain,
      path: "/",
      httpOnly: false,
      secure: !isLocal,
      sameSite: "Lax",
    })),
  );
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  // ——— Hub + nav ———
  await goto(page, "/commercial", { expectText: "Commercial", shotName: "01-hub" });
  {
    const t = await page.locator("body").innerText();
    for (const label of [
      "Prospects",
      "Relances",
      "Devis",
      "Factures",
      "Clients",
      "Tableau de bord",
    ]) {
      if (t.includes(label)) ok(`Hub contient « ${label} »`);
      else fail(`Hub manque « ${label} »`);
    }
    const sub = await page.locator("nav, [role='navigation']").allInnerTexts();
    const navText = sub.join("\n");
    for (const tab of ["Menu", "Prospects", "Clients", "Devis", "Factures"]) {
      if (navText.includes(tab) || t.includes(tab)) ok(`Nav « ${tab} »`);
      else warn(`Nav « ${tab} » non détectée`);
    }
  }

  // ——— Tableau de bord CRM ———
  await goto(page, "/crm", { expectText: "Tableau de bord", shotName: "02-crm-dashboard" });

  // ——— Prospects list / search / create CTA ———
  await goto(page, "/crm/prospects", { expectText: "Prospects", shotName: "03-prospects" });
  {
    const search = page.locator('input[placeholder*="Rechercher"], input[type="search"]').first();
    if (await search.count()) {
      await search.fill("BAGA");
      await page.waitForTimeout(800);
      ok("Recherche prospects interactive");
      await shot(page, "03b-prospects-search");
      await search.fill("");
      await page.waitForTimeout(400);
    } else warn("Barre recherche prospects absente");
    if (await page.locator("#orgName").count()) fail("Create inline sur listing prospects");
    else ok("Listing prospects sans create inline");
    const nouveau = page.getByRole("link", { name: /Nouveau prospect/i });
    if (await nouveau.count()) ok("CTA Nouveau prospect");
    else fail("CTA Nouveau prospect manquant");
  }

  // ——— Nouveau prospect (wizard full width) ———
  await goto(page, "/crm/prospects/nouveau", {
    expectText: "Nouveau prospect",
    shotName: "04-prospect-nouveau",
  });
  {
    const stamp = Date.now().toString().slice(-6);
    const orgName = `Smoke Com ${stamp}`;
    const nameField = page.locator("#orgName:visible").first();
    if (await nameField.count()) {
      const box = await page.locator("main").first().boundingBox();
      if (box && box.width >= 700) ok(`Form prospect largeur ${Math.round(box.width)}px`);
      else warn(`Form prospect étroit (${box?.width ?? "?"})`);

      // Étape 0 — Entreprise
      await nameField.fill(orgName);
      await page.getByRole("button", { name: /^Continuer$/i }).click();
      await page.waitForTimeout(400);

      // Étape 1 — Contact (tél. ou e-mail obligatoire)
      await page.locator("#contactFirst:visible").fill("Smoke");
      await page.locator("#contactLast:visible").fill("Com");
      await page.locator("#phone:visible").fill("+221770000001");
      await page.getByRole("button", { name: /^Continuer$/i }).click();
      await page.waitForTimeout(500);

      // Étape 2 — Origine & suivi
      await page.getByRole("button", { name: /Choisir l['’]origine/i }).click({
        timeout: 10000,
      });
      await page.waitForTimeout(400);
      await page
        .locator('[role="dialog"]')
        .getByRole("button", { name: /Google Maps/i })
        .click({ timeout: 10000 });
      await page.waitForTimeout(400);
      // Vérifier sélection
      const selectedSource = page.getByText("Google Maps", { exact: true });
      if (await selectedSource.count()) ok("Origine Google Maps sélectionnée");
      else warn("Origine peut-être non sélectionnée");
      await page.getByRole("button", { name: /^Continuer$/i }).click();
      await page.waitForTimeout(500);

      // Étape 3 — Offres (optionnel) → Créer le prospect
      await page
        .getByRole("button", { name: /Créer le prospect/i })
        .click({ timeout: 15000 });

      await page
        .waitForURL(
          (u) =>
            /\/crm\/prospects\/[^/]+$/.test(u.pathname) &&
            !u.pathname.endsWith("/nouveau"),
          { timeout: 60000 },
        )
        .catch(() => null);
      if (
        /\/crm\/prospects\/[^/?]+$/.test(page.url().replace(BASE, "")) &&
        !page.url().includes("/nouveau")
      ) {
        await page
          .getByRole("link", { name: /Retour aux prospects/i })
          .waitFor({ timeout: 30000 })
          .catch(() => null);
        ok(`Prospect créé → fiche`);
        await shot(page, "05-prospect-detail");
        const body = await page.locator("body").innerText();
        if (/Créer un devis|Devis déjà|Voir le devis/i.test(body)) {
          ok("CTA devis présent sur fiche");
        } else warn("CTA devis non visible (droits ?)");
        if (/Enregistrer une action|Changer le statut/i.test(body)) {
          ok("Actions statut / journal visibles");
        } else warn("Actions fiche prospect incomplètes");

        const quoteBtn = page.getByRole("button", { name: /Créer un devis/i });
        if (await quoteBtn.count()) {
          await quoteBtn.click();
          await page.waitForTimeout(800);
          const modal = page.locator('[role="dialog"]');
          await modal.waitFor({ timeout: 10000 }).catch(() => null);
          const modalText = (await modal.count())
            ? await modal.innerText()
            : "";
          if (/Intéressé/i.test(modalText)) {
            ok("Gate Intéressé : modal bloquante");
            await shot(page, "05b-devis-gate");
            await page.keyboard.press("Escape");
          } else if (/Créer un devis|Client & cadre|Lignes/i.test(modalText)) {
            warn("Modal create ouverte (prospect déjà Intéressé ?)");
            await page.keyboard.press("Escape");
          } else fail("Clic Créer devis sans modal gate/create");
        }
      } else {
        fail("Création prospect : pas de redirect fiche");
        await shot(page, "05-prospect-fail");
      }
    } else fail("Formulaire nouveau prospect introuvable");
  }

  // ——— Relances / Scripts / Objectifs / Équipe / Rapport ———
  await goto(page, "/crm/relances", { expectText: "Relances", shotName: "06-relances" });
  await goto(page, "/crm/scripts", { expectText: "Scripts", shotName: "07-scripts" });
  await goto(page, "/crm/objectifs", { expectText: "Objectifs", shotName: "08-objectifs" });
  await goto(page, "/crm/equipe", {
    expectText: "Équipe",
    shotName: "09-equipe",
    allowEmpty: true,
  });
  await goto(page, "/crm/rapport-semaine", {
    expectText: "Rapport",
    shotName: "10-rapport",
  });
  await goto(page, "/catalogue", { expectText: "Catalogue", shotName: "11-catalogue" });

  // ——— Clients ———
  await goto(page, "/commercial/clients", { expectText: "Clients", shotName: "12-clients" });
  {
    const search = page.locator('input[placeholder*="Rechercher"]').first();
    if (await search.count()) ok("Recherche clients");
    else warn("Recherche clients absente");
    const nouveau = page.getByRole("link", { name: /Nouveau client/i });
    if (await nouveau.count()) ok("CTA Nouveau client");
    else fail("CTA Nouveau client manquant");
  }

  const stamp = Date.now().toString().slice(-6);
  const clientName = `Smoke Client Com ${stamp}`;
  await goto(page, "/commercial/clients/nouveau", {
    expectText: "Nouveau client",
    shotName: "13-client-nouveau",
  });
  {
    const name = page.locator("#name, input[name='name']").first();
    if (await name.count()) {
      await name.fill(clientName);
      const contact = page.locator("#contactName, input[name='contactName']").first();
      if (await contact.count()) await contact.fill("Contact Smoke");
      await page.getByRole("button", { name: /Créer le client|Créer/i }).click();
      await page
        .waitForURL(
          (u) =>
            /\/commercial\/clients\/[^/]+$/.test(u.pathname) &&
            !u.pathname.endsWith("/nouveau"),
          { timeout: 45000 },
        )
        .catch(() => null);
      if (/\/commercial\/clients\/[^/?]+$/.test(page.url().replace(BASE, ""))) {
        ok("Client créé + redirect fiche");
        await shot(page, "14-client-detail");
        const t = await page.locator("body").innerText();
        if (/Modifier|Nouveau devis|Devis récents|Factures/i.test(t)) {
          ok("Fiche client sections/actions");
        } else warn("Fiche client pauvre en sections");
        // Modal modifier
        const edit = page.getByRole("button", { name: /Modifier/i });
        if (await edit.count()) {
          await edit.click();
          await page.waitForTimeout(400);
          const dlg = page.locator('[role="dialog"]');
          if (await dlg.count()) {
            ok("Modal édition client");
            await shot(page, "14b-client-edit");
            await page.keyboard.press("Escape");
          } else fail("Modifier client sans modal");
        }
      } else fail("Client : pas de redirect");
    } else fail("Form nouveau client introuvable");
  }

  // ——— Devis list + create ———
  await goto(page, "/commercial/devis", { expectText: "Devis", shotName: "15-devis" });
  {
    const search = page.locator('input[placeholder*="N°"], input[placeholder*="Rechercher"]').first();
    if (await search.count()) ok("Recherche devis");
    else warn("Recherche devis absente");
  }

  await goto(page, "/commercial/devis/nouveau", {
    expectText: "Nouveau devis",
    shotName: "16-devis-nouveau",
  });
  {
    const annuler = page.getByRole("link", { name: /Annuler/i });
    if (await annuler.count()) ok("Annuler devis → liste");
    else warn("Lien Annuler devis manquant");

    const clientSelect = page.locator("#clientId, select[name='clientId']").first();
    if (await clientSelect.count()) {
      // Prefer freshly created client
      const options = await clientSelect.locator("option").allTextContents();
      const match = options.find((o) => o.includes(clientName));
      if (match) {
        const val = await clientSelect
          .locator("option", { hasText: clientName })
          .first()
          .getAttribute("value");
        if (val) await clientSelect.selectOption(val);
      } else {
        const vals = await clientSelect.locator("option").evaluateAll((els) =>
          els.map((e) => e.value).filter(Boolean),
        );
        if (vals[0]) await clientSelect.selectOption(vals[0]);
      }

      const label = page.locator('input[placeholder*="Libellé"]').first();
      if (await label.count()) {
        await label.fill("Ligne smoke commercial");
      } else {
        // maybe empty lines need libre
        const libre = page.getByRole("button", { name: /Ligne libre/i });
        if (await libre.count()) {
          await libre.click();
          await page.locator('input[placeholder*="Libellé"]').last().fill("Ligne smoke");
        }
      }
      const price = page.locator('input[aria-label="Prix unitaire"]').first();
      if (await price.count()) await price.fill("150000");
      const qty = page.locator('input[aria-label="Quantité"]').first();
      if (await qty.count()) await qty.fill("1");

      await page.getByRole("button", { name: /Créer le devis/i }).click();
      await page
        .waitForURL(
          (u) =>
            /\/commercial\/devis\/[^/]+$/.test(u.pathname) &&
            !u.pathname.endsWith("/nouveau"),
          { timeout: 60000 },
        )
        .catch(() => null);
      const devisPath = page.url().replace(BASE, "");
      if (
        /\/commercial\/devis\/[^/?]+$/.test(devisPath) &&
        !devisPath.includes("/nouveau")
      ) {
        await page
          .getByRole("link", { name: /Retour aux devis/i })
          .waitFor({ timeout: 30000 })
          .catch(() => null);
        ok("Devis créé + redirect fiche");
        await shot(page, "17-devis-detail");
        const t = await page.locator("body").innerText();
        if (/Document PDF|Synthèse/i.test(t) && /Lignes/i.test(t)) {
          ok("Fiche devis layout (synthèse / lignes / PDF)");
        } else fail("Fiche devis layout incomplet");

        const gen = page.getByRole("button", { name: /Générer PDF/i });
        if (await gen.count()) {
          await gen.click();
          await page
            .getByRole("button", { name: /PDF déjà généré/i })
            .waitFor({ timeout: 45000 })
            .catch(() => null);
          const t2 = await page.locator("body").innerText();
          if (/PDF déjà généré/i.test(t2)) {
            ok("PDF devis généré / état visible");
            await shot(page, "17b-devis-pdf");
          } else warn("Après Générer PDF : feedback flou");
          if (await page.getByRole("button", { name: /^Générer PDF$/i }).count()) {
            fail("Bouton Générer PDF encore actif après génération");
          } else ok("Pas de re-génération PDF devis");
        } else if (/PDF déjà généré/i.test(t)) {
          ok("PDF déjà présent (pas de regen)");
        } else warn("Pas de bouton Générer PDF");

        const send = page.getByRole("button", { name: /Marquer envoyé/i });
        if (await send.count()) {
          await send.click();
          await page.waitForTimeout(1500);
          const t3 = await page.locator("body").innerText();
          if (/Envoyé/i.test(t3)) ok("Devis → Envoyé");
          else warn("Statut Envoyé non confirmé");
        }
      } else {
        fail("Création devis : pas de redirect");
        await shot(page, "17-devis-fail");
      }
    } else fail("Select client devis introuvable");
  }

  // ——— Factures ———
  await goto(page, "/commercial/factures", {
    expectText: "Factures",
    shotName: "18-factures",
  });
  {
    const search = page.locator('input[placeholder*="N°"], input[placeholder*="Rechercher"]').first();
    if (await search.count()) ok("Recherche factures");
    else warn("Recherche factures absente");

    // Open first invoice if any
    const link = page.locator('a[href*="/commercial/factures/"]').first();
    if (await link.count()) {
      await link.click();
      await page.waitForTimeout(800);
      if (page.url().includes("/commercial/factures/")) {
        ok("Ouverture fiche facture");
        await shot(page, "19-facture-detail");
        const t = await page.locator("body").innerText();
        if (/Synthèse|Lignes|Document PDF|Paiements/i.test(t)) {
          ok("Fiche facture layout pro");
        } else warn("Fiche facture layout partiel");
      }
    } else warn("Aucune facture à ouvrir");
  }

  // ——— Prospect Intéressé existant (DB) ———
  const interesse = await prisma.crmOpportunity.findFirst({
    where: { stage: "INTERESSE" },
    select: { id: true, organization: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  if (interesse) {
    await goto(page, `/crm/prospects/${interesse.id}`, {
      expectText: interesse.organization.name,
      shotName: "20-interesse",
    });
    const t = await page.locator("body").innerText();
    if (/Intéressé/i.test(t)) ok("Fiche Intéressé affichée");
    const quoteBtn = page.getByRole("button", { name: /Créer un devis|Préparation/i });
    const seeQuote = page.getByRole("link", { name: /Voir le devis/i });
    if (await seeQuote.count()) {
      ok("Prospect Intéressé : devis déjà créé (lien Voir)");
    } else if (await quoteBtn.count()) {
      await quoteBtn.click();
      // convert client peut prendre quelques secondes
      const dlg = page.locator('[role="dialog"]');
      await dlg
        .filter({ hasText: /Créer un devis|Client|Lignes|Régime|Statut Intéressé/i })
        .first()
        .waitFor({ timeout: 30000 })
        .catch(() => null);
      const dt = (await dlg.count()) ? await dlg.innerText() : "";
      if (/Créer un devis|Client|Lignes|Régime|Objet/i.test(dt)) {
        ok("Intéressé → modal création devis");
        await shot(page, "20b-interesse-modal");
        await page.keyboard.press("Escape");
      } else if (/Intéressé requis/i.test(dt)) {
        fail("Gate Intéressé à tort sur prospect déjà Intéressé");
        await shot(page, "20b-interesse-gate-bug");
      } else {
        fail("Intéressé : modal devis absente/incorrecte");
        await shot(page, "20b-interesse-fail");
      }
    } else warn("Pas de CTA devis sur Intéressé");
  } else warn("Aucun prospect INTERESSE en base pour test modal");

  // ——— Console errors ———
  const serious = pageErrors.filter(
    (e) => !/ResizeObserver|hydration|chrome-devtools|favicon/i.test(e),
  );
  if (serious.length) {
    fail(`Erreurs page: ${serious.slice(0, 3).join(" | ")}`);
  } else ok("Pas d’erreur JS page critique");

  await browser.close();
  await prisma.$disconnect();

  const passed = checks.filter((c) => c.ok && !c.warn).length;
  const warned = checks.filter((c) => c.warn).length;
  const failed = checks.filter((c) => !c.ok).length;
  const summary = {
    base: BASE,
    passed,
    warned,
    failed,
    checks,
  };
  writeFileSync(
    path.join(SHOT, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(
    `\n=== Résultat: ${passed} OK · ${warned} warn · ${failed} FAIL ===\n`,
  );
  console.log(`Screenshots: ${SHOT}`);
  if (failed) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
