/**
 * Audit responsive ERP MSK — matrice pages × viewports.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/responsive-audit.mjs
 *
 * Prérequis: `npm run dev` (ou `next start`) déjà lancé.
 * Produit: tmp/responsive-audit/report.json + report.md + screenshots P0.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "a.guiro@mskcreation.net";
const OUT = path.join(process.cwd(), "tmp/responsive-audit");

const VIEWPORTS = {
  xs: { width: 320, height: 740 },
  sm: { width: 375, height: 812 },
  md: { width: 768, height: 1024 },
  lg: { width: 1024, height: 768 },
  xl: { width: 1280, height: 720 },
  ref: { width: 1366, height: 768 },
  "2k": { width: 1440, height: 900 },
  fhd: { width: 1920, height: 1080 },
};

/** P0 : tous viewports · P1 : xs,md,ref,fhd · P2 : xs,ref */
const ROUTES = [
  { priority: "P0", path: "/accueil", expect: "Bonjour" },
  { priority: "P0", path: "/commercial", expect: "Commercial" },
  { priority: "P0", path: "/crm", expect: "Tableau de bord" },
  { priority: "P0", path: "/crm/prospects", expect: "Prospects" },
  { priority: "P0", path: "/crm/prospects/nouveau", expect: "prospect" },
  { priority: "P0", path: "/crm/relances", expect: "Relances" },
  { priority: "P0", path: "/crm/rdv", expect: "RDV" },
  { priority: "P0", path: "/crm/affectations", expect: "Affectations" },
  { priority: "P0", path: "/commercial/clients", expect: "Clients" },
  { priority: "P0", path: "/ged", expect: "Documents" },
  { priority: "P0", path: "/notifications", expect: null },
  { priority: "P0", path: "/administration/utilisateurs", expect: "Utilisateurs" },
  { priority: "P1", path: "/crm/scripts", expect: "Scripts" },
  { priority: "P1", path: "/crm/objectifs", expect: "Objectifs" },
  { priority: "P1", path: "/crm/equipe", expect: "Équipe" },
  // Rapport semaine : page lourde — couverte en P2 (moins de viewports).
  { priority: "P2", path: "/crm/rapport-semaine", expect: "Rapport" },
  { priority: "P1", path: "/catalogue", expect: "Catalogue" },
  { priority: "P1", path: "/commercial/devis", expect: "Devis" },
  { priority: "P1", path: "/commercial/factures", expect: "Factures" },
  { priority: "P1", path: "/guides", expect: "Guides" },
  { priority: "P1", path: "/organisation", expect: "Organisation" },
  { priority: "P2", path: "/comptabilite", expect: "Comptabilit" },
  { priority: "P2", path: "/rh", expect: "RH" },
  { priority: "P2", path: "/rh/collaborateurs", expect: "Collaborateurs" },
  { priority: "P2", path: "/stocks", expect: "Stocks" },
  { priority: "P2", path: "/patrimoine", expect: "Patrimoine" },
  { priority: "P2", path: "/projets", expect: "Projets" },
  { priority: "P2", path: "/ops/anomalies", expect: "Anomal" },
  { priority: "P2", path: "/espace", expect: null },
  { priority: "P2", path: "/administration/charte", expect: "Charte" },
  { priority: "P2", path: "/administration/gabarits", expect: "Gabarits" },
  { priority: "P2", path: "/administration/signatures", expect: "Signatures" },
];

const QUICK = process.env.RESPONSIVE_QUICK === "1";

function viewportsFor(priority) {
  // QUICK : viewports critiques uniquement (xs / md / ref 1366 / fhd).
  if (QUICK) return ["xs", "md", "ref", "fhd"];
  if (priority === "P0") return Object.keys(VIEWPORTS);
  if (priority === "P1") return ["xs", "md", "ref", "fhd"];
  return ["xs", "ref"];
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

async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const pageOverflow = doc.scrollWidth - doc.clientWidth;

    const offenders = [];
    const vw = window.innerWidth;
    const nodes = document.querySelectorAll("body *");
    for (const el of nodes) {
      if (!(el instanceof HTMLElement)) continue;
      const style = window.getComputedStyle(el);
      if (style.position === "fixed" || style.position === "sticky") continue;
      if (style.visibility === "hidden" || style.display === "none") continue;
      // Tables dans un scroll local légitime
      if (el.closest("[data-list-table-scroll], .overflow-x-auto")) continue;
      // Portails / drawers
      if (el.closest("[data-vaul-drawer], [role='dialog'], [data-radix-portal]"))
        continue;
      // Skeletons de chargement (temporaires)
      if (el.closest(".animate-pulse")) continue;

      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.right > vw + 1) {
        const tag = el.tagName.toLowerCase();
        const cls = (el.className && String(el.className).slice(0, 80)) || "";
        offenders.push({
          tag,
          cls,
          right: Math.round(r.right),
          vw,
        });
        if (offenders.length >= 8) break;
      }
    }
    return { pageOverflow, offenders };
  });
}

async function checkShell(page, vpId) {
  const width = VIEWPORTS[vpId].width;
  if (width < 768) {
    const trigger = page.getByTestId("mobile-nav-trigger");
    await trigger
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {});
    const visible = await trigger.isVisible().catch(() => false);
    return {
      ok: visible,
      detail: visible
        ? "hamburger visible"
        : "hamburger manquant sous md",
    };
  }
  const aside = page.locator("aside").first();
  await aside.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const visible = await aside.isVisible().catch(() => false);
  return {
    ok: visible,
    detail: visible ? "sidebar desktop visible" : "sidebar desktop absente",
  };
}

function slug(route) {
  return route.replace(/\//g, "_").replace(/^_/, "") || "root";
}

/**
 * Les listes CRM/Commercial utilisent ClickableRowLink (<tr> sans <a href>).
 * On résout donc les IDs via Prisma (script dédié), pas via le DOM.
 */
async function resolveDynamicIds(_page) {
  const { spawnSync } = await import("child_process");
  const r = spawnSync(
    process.execPath,
    [path.join(process.cwd(), "scripts/responsive-detail-ids.mjs")],
    {
      encoding: "utf8",
      env: process.env,
      cwd: process.cwd(),
    },
  );
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || "resolveDynamicIds failed");
  }
  const out = r.stdout || "";
  const start = out.indexOf("{");
  const end = out.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Pas de JSON IDs");
  const parsed = JSON.parse(out.slice(start, end + 1));
  return {
    prospectId: parsed.prospectId ?? null,
    clientId: parsed.clientId ?? null,
    devisId: parsed.devisId ?? null,
    factureId: parsed.factureId ?? null,
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(path.join(OUT, "shots"), { recursive: true });

  try {
    const r = await fetch(`${BASE}/login`);
    if (!r.ok) throw new Error(`login HTTP ${r.status}`);
  } catch (e) {
    console.error(`Serveur inaccessible (${BASE}) — lance npm run dev`);
    console.error(e.message);
    process.exit(1);
  }

  const jar = await getAuthCookies();
  console.log(`Session ${EMAIL}`);

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
  // Réduit la charge serveur pendant l’audit (Realtime / poll cloche).
  await page.route("**/api/notifications/**", (route) => route.abort());
  await page.route("**/rest/v1/**", (route) => route.abort());

  let ids = {
    prospectId: null,
    clientId: null,
    devisId: null,
    factureId: null,
  };
  try {
    ids = await resolveDynamicIds(page);
  } catch (e) {
    console.warn("IDs dynamiques indisponibles:", e.message || e);
  }
  console.log("IDs dynamiques:", ids);

  const dynamicRoutes = [];
  if (ids.prospectId) {
    dynamicRoutes.push({
      priority: "P0",
      path: `/crm/prospects/${ids.prospectId}`,
      expect: null,
      shot: true,
    });
  } else {
    console.warn("SKIP fiche prospect — aucun ID");
  }
  if (ids.clientId) {
    dynamicRoutes.push({
      priority: "P0",
      path: `/commercial/clients/${ids.clientId}`,
      expect: null,
      shot: true,
    });
  } else {
    console.warn("SKIP fiche client — aucun ID");
  }
  if (ids.devisId) {
    dynamicRoutes.push({
      priority: "P1",
      path: `/commercial/devis/${ids.devisId}`,
      expect: null,
    });
  }
  if (ids.factureId) {
    dynamicRoutes.push({
      priority: "P1",
      path: `/commercial/factures/${ids.factureId}`,
      expect: null,
    });
  }

  const allRoutes = [...ROUTES, ...dynamicRoutes];
  const results = [];
  let failed = 0;
  let tested = 0;
  let skipped = 0;

  for (const route of allRoutes) {
    const vps = viewportsFor(route.priority);
    for (const vpId of vps) {
      const vp = VIEWPORTS[vpId];
      await page.setViewportSize(vp);
      const entry = {
        path: route.path,
        priority: route.priority,
        viewport: vpId,
        size: `${vp.width}x${vp.height}`,
        status: "tested",
        ok: true,
        issues: [],
      };

      try {
        const res = await page.goto(`${BASE}${route.path}`, {
          waitUntil: "commit",
          timeout: 60000,
        });
        // Laisse hydrater le shell (MobileNav Suspense) sans bloquer sur networkidle.
        await page
          .locator("main, [data-testid='mobile-nav-trigger'], aside")
          .first()
          .waitFor({ state: "attached", timeout: 45000 })
          .catch(() => {});
        // Attendre un peu de contenu texte (évite faux négatifs pendant stream RSC).
        await page
          .waitForFunction(
            () => (document.body?.innerText || "").trim().length > 40,
            null,
            { timeout: 8000 },
          )
          .catch(() => {});
        await page.waitForTimeout(100);
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
        if (
          /Service temporairement saturé|Une erreur est survenue|Invalid `prisma/i.test(
            body,
          )
        ) {
          entry.ok = false;
          entry.issues.push("erreur UI");
        }
        if (
          route.expect &&
          !body.toLowerCase().includes(String(route.expect).toLowerCase())
        ) {
          // Soft : ne fait pas échouer si le shell + overflow sont OK (stream lent).
          entry.issues.push(`texte attendu absent: ${route.expect}`);
        }

        const shell = await checkShell(page, vpId);
        if (!shell.ok) {
          entry.ok = false;
          entry.issues.push(shell.detail);
        }

        const overflow = await measureOverflow(page);
        if (overflow.pageOverflow > 1) {
          entry.ok = false;
          entry.issues.push(
            `overflow page +${overflow.pageOverflow}px`,
          );
        }
        if (overflow.offenders.length > 0) {
          entry.ok = false;
          entry.issues.push(
            `éléments hors viewport: ${overflow.offenders
              .slice(0, 3)
              .map((o) => `${o.tag}.${o.cls}`)
              .join(" | ")}`,
          );
        }

        const wantShot =
          route.priority === "P0" &&
          (vpId === "xs" || vpId === "ref" || vpId === "fhd" || route.shot);
        if (wantShot) {
          const name = `${route.priority}_${slug(route.path)}_${vpId}.png`;
          await page.screenshot({
            path: path.join(OUT, "shots", name),
            fullPage: false,
          });
          entry.screenshot = name;
        }

        tested += 1;
        if (!entry.ok) failed += 1;
        const mark = entry.ok ? "✓" : "✗";
        console.log(
          `${mark} ${route.path} @${vpId} ${entry.issues.join("; ") || "OK"}`,
        );
      } catch (e) {
        entry.status = "failed";
        entry.ok = false;
        entry.issues.push(String(e.message || e));
        failed += 1;
        tested += 1;
        console.log(`✗ ${route.path} @${vpId} ${e.message}`);
      }
      results.push(entry);
    }
  }

  // Routes non couvertes (inventaire) — documentaires
  const uncovered = [
    "/crm/prospects/[id]/edit",
    "/crm/rdv/nouveau",
    "/crm/scripts/nouveau",
    "/commercial/clients/nouveau",
    "/commercial/devis/nouveau",
    "/comptabilite/plan",
    "/comptabilite/ecritures",
    "/comptabilite/banques",
    "/comptabilite/etats",
    "/comptabilite/budget",
    "/rh/contrats",
    "/rh/paie",
    "/stocks/articles",
    "/stocks/achats",
    "/guides/[guideId]",
    "/administration/utilisateurs/[id]",
  ];
  for (const p of uncovered) {
    results.push({
      path: p,
      priority: "—",
      viewport: "—",
      status: "skipped",
      ok: null,
      issues: ["hors matrice automatisée de cette livraison"],
    });
    skipped += 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    email: EMAIL,
    dynamicIds: ids,
    summary: { tested, failed, skipped, totalRows: results.length },
    results,
  };

  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  const md = [
    `# Rapport audit responsive — ERP MSK`,
    ``,
    `Généré : ${report.generatedAt}`,
    `Base : ${BASE}`,
    ``,
    `## Résumé`,
    ``,
    `| Métrique | Valeur |`,
    `|---|---|`,
    `| Combinaisons testées | ${tested} |`,
    `| Échecs | ${failed} |`,
    `| Skipped (non vérifiées) | ${skipped} |`,
    ``,
    `## IDs dynamiques`,
    ``,
    "```json",
    JSON.stringify(ids, null, 2),
    "```",
    ``,
    `## Résultats`,
    ``,
    `| Statut | Route | Viewport | Issues |`,
    `|---|---|---|---|`,
    ...results.map((r) => {
      const st =
        r.status === "skipped"
          ? "skipped"
          : r.ok
            ? "ok"
            : "FAIL";
      return `| ${st} | \`${r.path}\` | ${r.viewport} | ${(r.issues || []).join(" · ") || "—"} |`;
    }),
    ``,
    `## Légende`,
    ``,
    `- **ok / tested** : page ouverte + checks overflow/shell exécutés`,
    `- **FAIL** : au moins un check a échoué`,
    `- **skipped** : non vérifiée dans cette livraison`,
    ``,
  ].join("\n");

  writeFileSync(path.join(OUT, "report.md"), md);
  console.log(`\nRapport : ${path.join(OUT, "report.md")}`);
  console.log(`Échecs : ${failed} / ${tested}`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
