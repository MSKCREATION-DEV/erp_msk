/**
 * Audit responsive — fiches détail uniquement.
 * Usage: BASE_URL=http://localhost:3000 node scripts/responsive-audit-details.mjs
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

/** Aligné sur `src/lib/commercial/gates.ts` — devis/factures gelés. */
const COM_DOCS_GATED = true;

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "a.guiro@mskcreation.net";
const OUT = path.join(process.cwd(), "tmp/responsive-audit");

const VIEWPORTS = {
  xs: { width: 320, height: 740 },
  md: { width: 768, height: 1024 },
  ref: { width: 1366, height: 768 },
  fhd: { width: 1920, height: 1080 },
};

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

async function loadIds() {
  const prisma = new PrismaClient();
  try {
    const [opp, client, devis, facture] = await Promise.all([
      prisma.crmOpportunity.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      }),
      prisma.comClient.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      }),
      prisma.comQuote.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      }),
      prisma.comInvoice.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      }),
    ]);
    return {
      prospectId: opp?.id ?? null,
      clientId: client?.id ?? null,
      devisId: devis?.id ?? null,
      factureId: facture?.id ?? null,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const pageOverflow = doc.scrollWidth - doc.clientWidth;
    const offenders = [];
    const vw = window.innerWidth;
    for (const el of document.querySelectorAll("body *")) {
      if (!(el instanceof HTMLElement)) continue;
      const style = window.getComputedStyle(el);
      if (style.position === "fixed" || style.position === "sticky") continue;
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (el.closest("[data-list-table-scroll], .overflow-x-auto")) continue;
      if (el.closest("[data-vaul-drawer], [role='dialog'], [data-radix-portal]"))
        continue;
      if (el.closest(".animate-pulse")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.right > vw + 1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || "").slice(0, 80),
          right: Math.round(r.right),
        });
        if (offenders.length >= 6) break;
      }
    }
    return { pageOverflow, offenders };
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(path.join(OUT, "shots"), { recursive: true });

  const ids = await loadIds();
  console.log("IDs:", ids);

  const routes = [];
  if (ids.prospectId)
    routes.push({
      path: `/crm/prospects/${ids.prospectId}`,
      label: "prospect",
    });
  if (ids.clientId)
    routes.push({
      path: `/commercial/clients/${ids.clientId}`,
      label: "client",
    });
  const skipped = [];
  if (COM_DOCS_GATED) {
    skipped.push({
      path: "/commercial/devis/[id]",
      reason: "COM_DOCS_GATED — redirect /commercial",
    });
    skipped.push({
      path: "/commercial/factures/[id]",
      reason: "COM_DOCS_GATED — redirect /commercial",
    });
  } else {
    if (ids.devisId)
      routes.push({
        path: `/commercial/devis/${ids.devisId}`,
        label: "devis",
      });
    if (ids.factureId)
      routes.push({
        path: `/commercial/factures/${ids.factureId}`,
        label: "facture",
      });
  }
  if (!ids.factureId && !COM_DOCS_GATED) {
    skipped.push({
      path: "/commercial/factures/[id]",
      reason: "aucune facture en base",
    });
  }

  if (routes.length === 0) {
    console.error("Aucun ID détail disponible");
    process.exit(1);
  }
  if (skipped.length) {
    console.log("Skipped:", skipped);
  }

  const jar = await getAuthCookies();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORTS.ref,
    locale: "fr-FR",
  });
  const cookieDomain = new URL(BASE).hostname;
  await context.addCookies(
    jar.map((c) => ({
      name: c.name,
      value: c.value,
      domain: cookieDomain,
      path: "/",
      httpOnly: false,
      secure: BASE.startsWith("https"),
      sameSite: "Lax",
    })),
  );

  const page = await context.newPage();
  await page.route("**/api/notifications/**", (route) => route.abort());

  const results = [];
  let failed = 0;

  for (const route of routes) {
    for (const [vpId, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(vp);
      const entry = {
        path: route.path,
        label: route.label,
        viewport: vpId,
        ok: true,
        issues: [],
      };
      try {
        const res = await page.goto(`${BASE}${route.path}`, {
          waitUntil: "commit",
          timeout: 60000,
        });
        await page.locator("main").first().waitFor({
          state: "attached",
          timeout: 45000,
        });
        await page.waitForTimeout(400);
        const status = res?.status() ?? 0;
        const body = await page.locator("body").innerText().catch(() => "");

        if (status >= 400) {
          entry.ok = false;
          entry.issues.push(`HTTP ${status}`);
        }
        if (page.url().includes("/login")) {
          entry.ok = false;
          entry.issues.push("redirigé /login");
        }
        if (/Une erreur est survenue|Invalid `prisma/i.test(body)) {
          entry.ok = false;
          entry.issues.push("erreur UI");
        }
        if (/Page introuvable|404/i.test(body) && body.length < 500) {
          entry.ok = false;
          entry.issues.push("404");
        }

        const width = vp.width;
        if (width < 768) {
          const trigger = page.getByTestId("mobile-nav-trigger");
          await trigger
            .waitFor({ state: "visible", timeout: 15000 })
            .catch(() => {});
          const ham = await trigger.isVisible().catch(() => false);
          if (!ham) {
            entry.ok = false;
            entry.issues.push("hamburger manquant");
          }
        }

        const overflow = await measureOverflow(page);
        if (overflow.pageOverflow > 1) {
          entry.ok = false;
          entry.issues.push(`overflow page +${overflow.pageOverflow}px`);
        }
        if (overflow.offenders.length) {
          entry.ok = false;
          entry.issues.push(
            `hors viewport: ${overflow.offenders
              .slice(0, 2)
              .map((o) => `${o.tag}.${o.cls}`)
              .join(" | ")}`,
          );
        }

        const shot = `DETAIL_${route.label}_${vpId}.png`;
        await page.screenshot({
          path: path.join(OUT, "shots", shot),
          fullPage: false,
        });
        entry.screenshot = shot;

        if (!entry.ok) failed += 1;
        console.log(
          `${entry.ok ? "✓" : "✗"} ${route.path} @${vpId} ${entry.issues.join("; ") || "OK"}`,
        );
      } catch (e) {
        entry.ok = false;
        entry.issues.push(String(e.message || e));
        failed += 1;
        console.log(`✗ ${route.path} @${vpId} ${e.message}`);
      }
      results.push(entry);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    kind: "detail-fiches",
    ids,
    skipped,
    summary: {
      tested: results.length,
      failed,
      skipped: skipped.length,
    },
    results,
  };
  writeFileSync(
    path.join(OUT, "report-details.json"),
    JSON.stringify(report, null, 2),
  );
  const md = [
    `# Audit responsive — fiches détail`,
    ``,
    `Généré : ${report.generatedAt}`,
    ``,
    `| Métrique | Valeur |`,
    `|---|---|`,
    `| Testées | ${results.length} |`,
    `| Échecs | ${failed} |`,
    `| Non vérifiées (skipped) | ${skipped.length} |`,
    ``,
    "```json",
    JSON.stringify(ids, null, 2),
    "```",
    ``,
    `| Statut | Route | Viewport | Issues |`,
    `|---|---|---|---|`,
    ...results.map(
      (r) =>
        `| ${r.ok ? "ok" : "FAIL"} | \`${r.path}\` | ${r.viewport} | ${(r.issues || []).join(" · ") || "—"} |`,
    ),
    ...skipped.map(
      (s) => `| skipped | \`${s.path}\` | — | ${s.reason} |`,
    ),
    ``,
  ].join("\n");
  writeFileSync(path.join(OUT, "report-details.md"), md);
  console.log(`\nRapport : ${path.join(OUT, "report-details.md")}`);
  console.log(`Échecs : ${failed} / ${results.length}`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
