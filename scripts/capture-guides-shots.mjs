/**
 * Captures d’écran réelles pour le centre de guides → public/guides/shots/
 * Usage: BASE_URL=http://localhost:3000 node scripts/capture-guides-shots.mjs
 * Prérequis: `npm run dev` + env Supabase (même auth que smoke-ui).
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
const OUT = path.join(process.cwd(), "public/guides/shots");

const SHOTS = [
  { name: "accueil", route: "/accueil", clip: null },
  { name: "guides-home", route: "/guides", clip: null },
  { name: "commercial-hub", route: "/commercial", clip: null },
  { name: "crm-dashboard", route: "/crm", clip: null },
  { name: "crm-prospects", route: "/crm/prospects", clip: null },
  { name: "crm-prospects-nouveau", route: "/crm/prospects/nouveau", clip: null },
  { name: "crm-relances", route: "/crm/relances", clip: null },
  { name: "ged", route: "/ged", clip: null },
  { name: "espace", route: "/espace", clip: null },
  { name: "admin-users", route: "/administration/utilisateurs", clip: null },
];

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

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.25,
});
const cookies = await getAuthCookies();
await context.addCookies(
  cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: "localhost",
    path: "/",
  })),
);
const page = await context.newPage();

for (const shot of SHOTS) {
  try {
    const res = await page.goto(`${BASE}${shot.route}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    if (!res || res.status() >= 400) {
      console.warn(`skip ${shot.name}: HTTP ${res?.status()}`);
      continue;
    }
    // Flouter données perso (noms, e-mails, lignes métier) — structure UI lisible
    await page.evaluate(() => {
      const blur = (el, px = 6) => {
        if (el) el.style.filter = `blur(${px}px)`;
      };
      // Profil sidebar
      document.querySelectorAll("aside .mt-auto").forEach((el) => blur(el, 7));
      // Titres « Bonjour … » (identité)
      document.querySelectorAll("h1").forEach((el) => {
        if (/^bonjour\b/i.test((el.textContent || "").trim())) blur(el, 7);
      });
      // E-mails visibles
      document.querySelectorAll("main, aside").forEach((root) => {
        root.querySelectorAll("*").forEach((el) => {
          if (
            el.children.length === 0 &&
            /[^\s@]+@[^\s@]+\.[^\s@]+/.test(el.textContent || "")
          ) {
            blur(el, 6);
          }
        });
      });
      // Tableaux / listes nominatives
      document
        .querySelectorAll("main table tbody, main [role='rowgroup']")
        .forEach((el) => blur(el, 5));
    });
    await page.waitForTimeout(350);
    const file = path.join(OUT, `${shot.name}.png`);
    await page.screenshot({
      path: file,
      type: "png",
      fullPage: false,
      animations: "disabled",
    });
    console.log(`✓ ${shot.name} → ${file}`);
  } catch (err) {
    console.warn(`✗ ${shot.name}:`, err.message);
  }
}

await browser.close();
console.log("Captures guides terminées.");
