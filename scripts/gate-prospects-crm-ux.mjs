/**
 * Gate UX — Plan Prospects CRM (listing, hard-delete UI, fiche, relances, social).
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/gate-prospects-crm-ux.mjs
 *
 * Auth : magic link service role (SMOKE_EMAIL, défaut Super Admin).
 * Preuves : tmp/gate-prospects-crm-ux/*.png + report.json
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.SMOKE_EMAIL ?? "a.guiro@mskcreation.net";
const OUT = path.join(process.cwd(), "tmp/gate-prospects-crm-ux");
const isLocal = /localhost|127\.0\.0\.1/.test(BASE);
const cookieDomain = isLocal ? "localhost" : new URL(BASE).hostname;

/** @type {{ id: string; pass: boolean; proof: string; note?: string }[]} */
const matrix = [];

function record(id, pass, proof, note) {
  matrix.push({ id, pass, proof, note });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`${mark}  ${id}`);
  console.log(`      → ${proof}${note ? ` (${note})` : ""}`);
  if (!pass) process.exitCode = 1;
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
    path: path.join(OUT, `${name}.png`),
    fullPage: true,
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const consoleErrors = [];
  const pageErrors = [];

  try {
    const r = await fetch(`${BASE}/login`);
    if (!r.ok) throw new Error(`login HTTP ${r.status}`);
  } catch (e) {
    record("serveur", false, `Injoignable : ${e.message}`);
    writeFileSync(
      path.join(OUT, "report.json"),
      JSON.stringify({ matrix, consoleErrors, pageErrors, blocked: "serveur" }, null, 2),
    );
    process.exit(1);
  }

  let jar;
  try {
    jar = await getAuthCookies();
    record("auth", true, `Session Playwright ${EMAIL} (magic link admin)`);
  } catch (e) {
    record("auth", false, String(e.message ?? e), "BLOQUÉ runtime");
    writeFileSync(
      path.join(OUT, "report.json"),
      JSON.stringify({ matrix, blocked: "auth" }, null, 2),
    );
    process.exit(1);
  }

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
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  // ——— Listing prospects ———
  await page.goto(`${BASE}/crm/prospects`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page
    .locator("table thead th, text=Prospects")
    .first()
    .waitFor({ timeout: 90000 })
    .catch(() => null);
  await page.waitForTimeout(1500);
  await shot(page, "01-prospects-list");

  if (page.url().includes("/login")) {
    record("liste-prospects", false, "Redirect login", "BLOQUÉ");
  } else {
    record("liste-prospects", true, `url=${page.url()}`);
    const headers = await page.locator("table thead th").allInnerTexts();
    const flat = headers.map((h) => h.trim()).filter(Boolean);
    const hasCreePar = flat.some((h) => /Créé par/i.test(h));
    const hasCreeCol = flat.some((h) => /^Créé$/i.test(h));
    record(
      "liste-colonne-cree",
      !hasCreeCol && hasCreePar,
      `thead=${JSON.stringify(flat)}`,
      !hasCreeCol && hasCreePar ? undefined : "colonnes incorrectes",
    );

    const createdByCell = page.locator("table tbody tr").first().locator("td").nth(9);
    if ((await page.locator("table tbody tr").count()) > 0) {
      const cellText = await createdByCell.innerText();
      const hasDate = /\d{1,2}\/\d{1,2}\/\d{4}/.test(cellText);
      record(
        "liste-date-sous-createur",
        hasDate,
        `cellule Créé par : ${cellText.replace(/\n/g, " | ")}`,
      );
    } else {
      record("liste-date-sous-createur", true, "Liste vide — skip cellule", "empty");
    }

    const search = page.locator(
      'input[placeholder*="Rechercher"], input[type="search"]',
    ).first();
    if (!(await search.count())) {
      record("liste-recherche-url", false, "Input recherche absent");
    } else await search.fill("a");
    await page.waitForURL(/[?&]q=/, { timeout: 15000 }).catch(() => null);
    if (await search.count()) {
      const qOk = page.url().includes("q=");
      record("liste-recherche-url", qOk, `url=${page.url()}`);
      await search.fill("");
    }
    await page.goto(`${BASE}/crm/prospects`, { waitUntil: "domcontentloaded" });
    await page
      .locator("table thead th")
      .first()
      .waitFor({ state: "visible", timeout: 60000 })
      .catch(() => null);

    const sortLink = page
      .getByRole("link", { name: /Trier par Entreprise/i })
      .first();
    if (await sortLink.count()) {
      await sortLink.click();
      await page
        .waitForURL(/[?&]sort=/, { timeout: 15000 })
        .catch(() => null);
      const sortOk = /sort=/.test(page.url());
      record("liste-tri", sortOk, `url après tri=${page.url()}`);
    } else {
      record("liste-tri", false, "Lien tri thead absent");
    }

    const pageBtn = page.getByRole("link", { name: /^2$/ }).first();
    if (await pageBtn.count()) {
      await pageBtn.click();
      await page.waitForTimeout(900);
      record("liste-pagination", /[?&]page=2/.test(page.url()), `url=${page.url()}`);
    } else {
      record("liste-pagination", true, "Une seule page — pagination N/A");
    }

    const menuBtn = page
      .locator('table tbody tr[role="link"]')
      .first()
      .getByRole("button", { name: /Actions —/i });
    const hasMenu = (await page.locator("table tbody tr").count()) === 0 || (await menuBtn.count()) > 0;
    record(
      "liste-menu-actions",
      hasMenu,
      hasMenu
        ? "ActionMenu présent sur 1ʳᵉ ligne (ou liste vide)"
        : "Pas de menu ⋯ sur ligne",
    );
    if (await menuBtn.count()) {
      await menuBtn.click();
      await page.waitForTimeout(300);
      const deleteItem = page.getByRole("menuitem", { name: /Supprimer/i });
      const canDelete = (await deleteItem.count()) > 0;
      record(
        "liste-delete-droit",
        canDelete,
        canDelete ? "Menu Supprimer visible" : "Supprimer absent (droits ?)",
      );
      await page.keyboard.press("Escape");
    }

    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return {
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
        hScroll: el.scrollWidth > el.clientWidth + 2,
      };
    });
    record(
      "liste-overflow-page",
      !overflow.hScroll,
      `scrollW=${overflow.scrollW} clientW=${overflow.clientW}`,
      overflow.hScroll ? "scroll horizontal page" : undefined,
    );
  }

  // ——— Fiche prospect (1ʳᵉ ligne) ———
  let prospectId = null;
  await page.goto(`${BASE}/crm/prospects`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const firstProspectRow = page.locator("table tbody tr[role='link']").first();
  if (await firstProspectRow.count()) {
    await firstProspectRow.click();
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(1000);
  if (/\/crm\/prospects\/[^/]+$/.test(new URL(page.url()).pathname)) {
    prospectId = page.url().match(/\/crm\/prospects\/([^/?]+)/)?.[1] ?? null;
  }
  if (prospectId) {
    await page
      .locator("h1")
      .first()
      .waitFor({ state: "visible", timeout: 60000 })
      .catch(() => null);
    await page
      .getByText(/Entreprise\s*&\s*notes/i)
      .first()
      .waitFor({ state: "visible", timeout: 60000 })
      .catch(() => null);
    await shot(page, "02-prospect-detail");

    const h1Count = await page.locator("h1").count();
    record(
      "fiche-hide-title",
      h1Count === 1,
      `${h1Count}× h1 (attendu 1 dans bandeau)`,
    );

    const body = await page.locator("main, body").first().innerText();
    record(
      "fiche-entreprise-notes",
      /Entreprise\s*&\s*notes/i.test(body),
      /Entreprise\s*&\s*notes/i.test(body) ? "Section fusionnée présente" : "Section absente",
    );
    record(
      "fiche-suivi-enrichi",
      /Suivi/i.test(body) &&
        /Prochaine action/i.test(body) &&
        /Prochaine relance|Dernière action/i.test(body),
      "Sections Suivi / prochaine action / relance",
    );

    const deleteBtn = page.getByRole("button", { name: /^Supprimer$/i });
    const menuDetail = page.getByRole("button", { name: /Actions —/i });
    if (await deleteBtn.count()) {
      await deleteBtn.click();
    } else if (await menuDetail.count()) {
      await menuDetail.click();
      await page.getByRole("menuitem", { name: /Supprimer/i }).click();
    }
    await page
      .locator('[role="dialog"]')
      .getByText(/Chargement de l'inventaire/i)
      .waitFor({ state: "hidden", timeout: 20000 })
      .catch(() => null);
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.count()) {
      await Promise.race([
        dialog
          .getByRole("button", { name: /Confirmer la suppression/i })
          .waitFor({ state: "visible", timeout: 25000 }),
        dialog
          .getByText(/déjà lié|fiche client|Suppression impossible/i)
          .waitFor({ state: "visible", timeout: 25000 }),
      ]).catch(() => null);
      const dlg = await dialog.first().innerText();
      const blocked = /déjà lié|fiche client|Suppression impossible/i.test(dlg);
      const invOk =
        /Suppression définitive/i.test(dlg) &&
        (/Éléments qui seront effacés|Aucun sous-élément/i.test(dlg) || blocked);
      record("fiche-modal-inventaire", invOk, dlg.slice(0, 220).replace(/\n/g, " "));
      const danger = await dialog
        .getByRole("button", { name: /Confirmer la suppression/i })
        .count();
      record(
        "fiche-modal-danger",
        danger > 0 || blocked,
        danger > 0
          ? "CTA danger présent"
          : blocked
            ? "Bloqué converti — pas de confirm (attendu)"
            : "État modal inconnu",
      );
      await shot(page, "02b-delete-modal");
      await page.keyboard.press("Escape");
    } else {
      record("fiche-modal-inventaire", false, "Modal delete non ouverte");
    }

    // ——— Édition réseaux sociaux ———
    await page.goto(`${BASE}/crm/prospects/${prospectId}/edit`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(800);
    const ig = page.locator("#social-instagramUrl, [id='social-instagramUrl']").first();
    if (!(await ig.count())) {
      const addSocial = page.getByRole("button", { name: /Instagram|Réseau/i }).first();
      if (await addSocial.count()) await addSocial.click().catch(() => null);
    }
    const igField = page.locator('[id^="social-"]').first();
    if (await igField.count()) {
      await igField.fill("@smoke_gate_ux");
      await page.waitForTimeout(300);
      await shot(page, "03-prospect-edit-social");
      record("social-edit-saisie", true, `Champ social rempli (@handle)`);
    } else {
      record("social-edit-saisie", false, "Champs réseaux non trouvés", "BLOQUÉ partiel");
    }
  } else {
    record("fiche-prospect", false, "Aucune ligne prospect pour ouvrir fiche", "BLOQUÉ");
  }

  // ——— Clients commercial ———
  await page.goto(`${BASE}/commercial/clients`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1000);
  await shot(page, "04-clients-list");
  record(
    "clients-liste",
    !page.url().includes("/login"),
    `url=${page.url()}`,
  );

  const firstClientRow = page.locator("table tbody tr[role='link']").first();
  if (await firstClientRow.count()) {
    await firstClientRow.click();
    await page.waitForTimeout(2500);
  }
  const onClientDetail = /\/commercial\/clients\/[^/]+$/.test(
    new URL(page.url()).pathname,
  );
  record("client-fiche-url", onClientDetail, `url=${page.url()}`);
  if (onClientDetail) {
    await page
      .locator("h1")
      .first()
      .waitFor({ state: "visible", timeout: 60000 })
      .catch(() => null);
    await shot(page, "05-client-detail");
    const h1c = await page.locator("h1").count();
    record("client-hide-title", h1c === 1, `${h1c}× h1`);
    const delClient =
      (await page.getByRole("button", { name: /^Supprimer$/i }).count()) +
      (await page.getByRole("menuitem", { name: /Supprimer/i }).count());
    const delLabel =
      (await page.getByRole("button", { name: /^Supprimer$/i }).count()) > 0
        ? "Bouton Supprimer dans bandeau"
        : (await page.getByText(/Supprimer/i).count()) > 0
          ? "Libellé Supprimer présent"
          : "Absent (droits ?)";
    record("client-delete-cta", delClient > 0, delLabel);
  } else {
    record("client-hide-title", false, "Pas sur fiche client", "BLOQUÉ");
    record("client-delete-cta", false, "Navigation fiche échouée", "BLOQUÉ");
  }

  // ——— Relances : focus recherche ———
  await page.goto(`${BASE}/crm/relances`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1000);
  const relSearch = page.locator('input[placeholder*="Rechercher"]').first();
  await relSearch.click();
  await relSearch.fill("bag");
  await page.waitForTimeout(1200);
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    return el?.tagName === "INPUT" && /Rechercher|search/i.test(el.getAttribute("placeholder") ?? "");
  });
  record(
    "relances-recherche-focus",
    focused,
    focused ? "Focus conservé après debounce" : "Focus perdu (régression Suspense)",
  );
  await shot(page, "06-relances-search");

  record(
    "console-errors",
    consoleErrors.length === 0 && pageErrors.length === 0,
    `console=${consoleErrors.length} pageerror=${pageErrors.length}`,
    consoleErrors[0] ?? pageErrors[0],
  );

  writeFileSync(
    path.join(OUT, "report.json"),
    JSON.stringify(
      {
        base: BASE,
        email: EMAIL,
        at: new Date().toISOString(),
        matrix,
        consoleErrors,
        pageErrors,
        screenshots: OUT,
      },
      null,
      2,
    ),
  );

  await browser.close();
  console.log(`\nRapport : ${path.join(OUT, "report.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});