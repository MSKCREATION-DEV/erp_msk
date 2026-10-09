import assert from "node:assert/strict";
import sharp from "sharp";
import { cleanSignatureImage } from "./clean";

async function makeScan(opts: {
  paper: [number, number, number];
  ink: [number, number, number];
}) {
  const w = 240;
  const h = 100;
  const raw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      // Légère texture papier
      const n = ((x * 17 + y * 31) % 7) - 3;
      raw[i] = Math.min(255, Math.max(0, opts.paper[0] + n));
      raw[i + 1] = Math.min(255, Math.max(0, opts.paper[1] + n));
      raw[i + 2] = Math.min(255, Math.max(0, opts.paper[2] + n));
    }
  }
  // Trait signature
  for (let y = 35; y < 62; y++) {
    for (let x = 50; x < 190; x++) {
      const i = (y * w + x) * 3;
      raw[i] = opts.ink[0];
      raw[i + 1] = opts.ink[1];
      raw[i + 2] = opts.ink[2];
    }
  }
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toBuffer();
}

async function assertTransparentPaper(cleaned: Buffer, label: string) {
  const meta = await sharp(cleaned).metadata();
  assert.equal(meta.format, "png", label);
  assert.ok(meta.hasAlpha, `${label}: alpha`);

  // Composite sur rouge vif : si fond opaque restait, on verrait du gris
  // On vérifie plutôt le raw : coins du canvas AVANT trim étaient papier ;
  // après trim, on étend sur rouge et on compte pixels "gris papier".
  const { data, info } = await sharp(cleaned)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let opaqueInk = 0;
  let opaquePaperish = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]!;
    if (a < 20) continue;
    const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
    if (lum > 160 && a > 200) opaquePaperish += 1;
    if (lum < 90 && a > 180) opaqueInk += 1;
  }

  assert.ok(opaqueInk > 80, `${label}: encre attendue (${opaqueInk})`);
  assert.equal(
    opaquePaperish,
    0,
    `${label}: fond papier opaque restant (${opaquePaperish}) size=${info.width}x${info.height}`,
  );
  assert.ok((meta.width ?? 0) < 240, `${label}: trim largeur`);
}

async function main() {
  const white = await cleanSignatureImage(
    await makeScan({ paper: [255, 255, 255], ink: [20, 20, 25] }),
  );
  await assertTransparentPaper(white, "papier blanc");

  // Cas réel utilisateur : fond gris/beige photo
  const gray = await cleanSignatureImage(
    await makeScan({ paper: [210, 208, 202], ink: [25, 28, 35] }),
  );
  await assertTransparentPaper(gray, "papier gris");

  const cream = await cleanSignatureImage(
    await makeScan({ paper: [232, 226, 214], ink: [30, 30, 40] }),
  );
  await assertTransparentPaper(cream, "papier crème");

  console.log("clean.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
