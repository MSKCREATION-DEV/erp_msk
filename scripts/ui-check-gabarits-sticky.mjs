/**
 * Vérif UI sticky gabarits — Playwright headless.
 * Ouvre /ui-lab/gabarits-sticky, scroll, screenshots + assertions géométrie.
 *
 * Usage : node scripts/ui-check-gabarits-sticky.mjs
 * Prérequis : npm run dev (localhost:3000)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.UI_CHECK_BASE ?? "http://localhost:3000";
const OUT = resolve("tmp/ui-check-gabarits-sticky");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
});

const url = `${BASE}/ui-lab/gabarits-sticky`;
const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
if (!res || res.status() >= 400) {
  console.error(`FAIL navigate ${url} status=${res?.status()}`);
  await browser.close();
  process.exit(1);
}

// Attendre mesure ResizeObserver / CSS var
await page.waitForFunction(() => {
  const el = document.querySelector("[style*='--gabarits-sticky-top']");
  if (!el) return false;
  const v = getComputedStyle(el).getPropertyValue("--gabarits-sticky-top").trim();
  return Boolean(v) && Number.parseFloat(v) >= 160;
});

await page.screenshot({
  path: resolve(OUT, "01-before-scroll.png"),
  fullPage: false,
});

const main = page.locator("#lab-scroll");
await main.evaluate((el) => {
  el.scrollTop = 420;
});
await page.waitForTimeout(250);

await page.screenshot({
  path: resolve(OUT, "02-after-scroll.png"),
  fullPage: false,
});

const metrics = await page.evaluate(() => {
  const scroll = document.getElementById("lab-scroll");
  const header = document.querySelector(".sticky.top-0.z-20");
  const aside = document.querySelector("#lab-sidebar aside");
  const row0 = document.querySelector('[data-lab-row="0"]');
  const row5 = document.querySelector('[data-lab-row="5"]');
  if (!scroll || !header || !aside) {
    return { ok: false, error: "missing elements" };
  }

  const hr = header.getBoundingClientRect();
  const ar = aside.getBoundingClientRect();
  const r0 = row0?.getBoundingClientRect() ?? null;
  const r5 = row5?.getBoundingClientRect() ?? null;
  const stickyTop = getComputedStyle(
    document.querySelector("[style*='--gabarits-sticky-top']"),
  )
    .getPropertyValue("--gabarits-sticky-top")
    .trim();

  const sidebarUnderHeader = ar.top >= hr.bottom - 2;
  const mainTop = scroll.getBoundingClientRect().top;
  const headerSticky = hr.top >= mainTop - 2 && hr.top <= mainTop + 24;
  const listingScrolledUnder =
    Boolean(r0) && r0.bottom < hr.bottom && r0.top < hr.bottom;
  const overlapY = Math.max(
    0,
    Math.min(hr.bottom, ar.bottom) - Math.max(hr.top, ar.top),
  );

  return {
    ok: true,
    stickyTop,
    scrollTop: scroll.scrollTop,
    header: { top: hr.top, bottom: hr.bottom, height: hr.height },
    aside: { top: ar.top, bottom: ar.bottom, height: ar.height },
    gap: ar.top - hr.bottom,
    overlapY,
    row0: r0 ? { top: r0.top, bottom: r0.bottom } : null,
    row5: r5 ? { top: r5.top, bottom: r5.bottom } : null,
    sidebarUnderHeader,
    headerSticky,
    listingScrolledUnder,
  };
});

/** Sample pixels (CDP) — pad zone doit rester #F4F6F9, pas blanc listing. */
const client = await page.context().newCDPSession(page);
async function sampleRgb(x, y) {
  const { data } = await client.send("Page.captureScreenshot", {
    format: "png",
    clip: { x, y, width: 4, height: 4, scale: 1 },
    fromSurface: true,
  });
  return page.evaluate(async (b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    const { data: px } = ctx.getImageData(0, 0, c.width, c.height);
    let r = 0,
      g = 0,
      b = 0,
      n = px.length / 4;
    for (let i = 0; i < px.length; i += 4) {
      r += px[i];
      g += px[i + 1];
      b += px[i + 2];
    }
    return {
      r: Math.round(r / n),
      g: Math.round(g / n),
      b: Math.round(b / n),
    };
  }, data);
}

const mainBox = await page.locator("#lab-scroll").boundingBox();
const padSample = await sampleRgb(Math.round(mainBox.x + 200), Math.round(mainBox.y + 8));
const padIsShell =
  Math.abs(padSample.r - 244) <= 8 &&
  Math.abs(padSample.g - 246) <= 8 &&
  Math.abs(padSample.b - 249) <= 8;

console.log(JSON.stringify({ ...metrics, padSample, padIsShell }, null, 2));

const failures = [];
if (!metrics.ok) failures.push(metrics.error ?? "unknown");
if (!metrics.sidebarUnderHeader) {
  failures.push(
    `sidebar under header FAIL: aside.top=${metrics.aside?.top} header.bottom=${metrics.header?.bottom}`,
  );
}
if ((metrics.overlapY ?? 0) > 0) {
  failures.push(`sidebar overlaps header by ${metrics.overlapY}px`);
}
if (!metrics.headerSticky) failures.push("header not sticky at main top");
if (!metrics.listingScrolledUnder) {
  failures.push("listing did not scroll under header (scroll too small?)");
}
if (!padIsShell) {
  failures.push(
    `bleed pad zone: expected #F4F6F9 got rgb(${padSample.r},${padSample.g},${padSample.b})`,
  );
}

await browser.close();

if (failures.length) {
  console.error("UI CHECK FAILED:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`UI CHECK OK — screenshots in ${OUT}`);
