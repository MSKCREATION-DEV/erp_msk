/**
 * Revue PDF : devis (WinAnsi CR) + gabarits RH + docs collab/contrat.
 * Usage: BASE_URL=http://localhost:3000 NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/review-pdf-docs.mjs
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
function pass(msg) {
  console.log(`  ✓ ${msg}`);
  results.push({ ok: true, msg });
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  results.push({ ok: false, msg });
}

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
    console.error("Serveur inaccessible — npm run dev");
    process.exit(1);
  }

  // Prépare un devis avec CR dans l'objet (régression WinAnsi)
  const quote = await prisma.comQuote.findFirst({
    where: { number: "DEV-2026-0010" },
    select: { id: true, object: true },
  });
  if (quote) {
    await prisma.comQuote.update({
      where: { id: quote.id },
      data: {
        object:
          "Gestion professionnelle des réseaux sociaux sur une durée de 3 mois.\r\nMSK CREATION prend en charge l'ensemble de votre présence digitale.\rObjectif Bamako.",
      },
    });
    pass("DB: objet devis avec \\r injecté");
  } else {
    fail("DB: DEV-2026-0010 introuvable (skip PDF devis)");
  }

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

  console.log("\n══ PDF Devis (WinAnsi CR) ══");
  if (quote) {
    await page.goto(`${BASE}/commercial/devis/${quote.id}`, {
      waitUntil: "networkidle",
    });
    const pdfBtn = page.getByRole("button", { name: /Générer PDF/i });
    if (await pdfBtn.count()) {
      await pdfBtn.click();
      await page.waitForTimeout(4000);
      const body = await page.locator("body").innerText();
      if (/WinAnsi|0x000d|Génération PDF:/i.test(body)) {
        fail(`PDF devis KO: ${body.match(/Génération PDF:[^\n]+|WinAnsi[^\n]+/)?.[0] ?? "erreur"}`);
      } else if (/PDF généré|classé|GED/i.test(body) || !/msk-coral|text-msk-coral/i.test(body)) {
        // succès message OU pas d'erreur rouge visible
        const err = page.locator(".text-msk-coral");
        const errText = (await err.count()) ? await err.first().innerText() : "";
        if (errText && /Génération|WinAnsi/i.test(errText)) {
          fail(`PDF devis erreur UI: ${errText}`);
        } else {
          pass("PDF devis généré sans erreur WinAnsi");
        }
      } else {
        pass("PDF devis — pas d'erreur WinAnsi visible");
      }
    } else {
      fail("Bouton Générer PDF absent");
    }
  }

  console.log("\n══ Gabarits démo RH ══");
  await page.goto(`${BASE}/administration/gabarits`, { waitUntil: "networkidle" });
  const bodyG = await page.locator("body").innerText();
  const needed = [
    "Contrat de travail",
    "Contrat de stage",
    "Attestation",
    "Règlement",
    "Solde",
    "Fiche de paie",
  ];
  for (const n of needed) {
    if (bodyG.toLowerCase().includes(n.toLowerCase())) pass(`Gabarit listé: ${n}`);
    else fail(`Gabarit manquant: ${n}`);
  }

  // Génère 2 démos (contrat travail + attestation)
  const demoBtns = page.getByRole("button", { name: /Générer|Démo|PDF/i });
  const nDemo = await demoBtns.count();
  if (nDemo >= 2) {
    await demoBtns.nth(0).click();
    await page.waitForTimeout(3500);
    await demoBtns.nth(Math.min(2, nDemo - 1)).click();
    await page.waitForTimeout(3500);
    const after = await page.locator("body").innerText();
    if (/WinAnsi|0x000d/i.test(after)) fail("Démo gabarit WinAnsi");
    else pass("Démos gabarits déclenchées sans WinAnsi");
  } else {
    fail("Pas assez de boutons démo gabarits");
  }

  console.log("\n══ PDF Contrat RH ══");
  const contract = await prisma.rhContract.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true },
  });
  if (contract) {
    await page.goto(`${BASE}/rh/contrats/${contract.id}`, {
      waitUntil: "networkidle",
    });
    const btn = page.getByRole("button", { name: /Générer PDF contrat/i });
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(5000);
      const t = await page.locator("body").innerText();
      if (/WinAnsi|0x000d|Génération PDF:/i.test(t)) {
        fail(`PDF contrat KO: ${t.match(/Génération PDF:[^\n]+/)?.[0] ?? "err"}`);
      } else if (/PDF contrat|classé GED|GED/i.test(t)) {
        pass(`PDF contrat ${contract.type} OK`);
      } else {
        const err = page.locator(".text-msk-coral");
        const et = (await err.count()) ? await err.first().innerText() : "";
        if (et) fail(`PDF contrat: ${et}`);
        else pass("PDF contrat — pas d'erreur visible");
      }
    } else fail("Bouton PDF contrat absent");
  } else fail("Aucun contrat RH en base");

  console.log("\n══ PDF Collaborateur ══");
  const emp = await prisma.rhEmployee.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, firstName: true, lastName: true },
  });
  if (emp) {
    await page.goto(`${BASE}/rh/collaborateurs/${emp.id}`, {
      waitUntil: "networkidle",
    });
    for (const name of ["Attestation", "Règlement"]) {
      const b = page.getByRole("button", { name: new RegExp(name, "i") });
      if (await b.count()) {
        await b.first().click();
        await page.waitForTimeout(5000);
        await page.getByRole("button", { name: /Attestation/i }).first().waitFor({
          state: "visible",
          timeout: 10000,
        }).catch(() => null);
        const t = await page.locator("body").innerText();
        if (/WinAnsi|0x000d/i.test(t)) fail(`${name}: WinAnsi`);
        else pass(`${name} PDF pour ${emp.firstName}`);
      } else fail(`Bouton ${name} absent`);
    }
    const solde = page.getByRole("button", { name: /Solde de tout compte/i });
    if (await solde.count()) {
      await solde.click();
      await page.waitForTimeout(4000);
      const t = await page.locator("body").innerText();
      if (/WinAnsi/i.test(t)) fail("Solde WinAnsi");
      else pass("Solde de tout compte PDF");
    }
  } else fail("Aucun collaborateur ACTIVE");

  await browser.close();
  await prisma.$disconnect();

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n══ Bilan PDF docs : ${results.filter((r) => r.ok).length}/${results.length} PASS ══`,
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
