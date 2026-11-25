/**
 * Garde-fou : pas de démontage conditionnel autour des inputs file / phases
 * du justificatif absence (removeChild).
 *
 * Patterns interdits dans le picker :
 * - `phase === "…" ? (…jsx…) : null` (unmount d’actions)
 * - `disabled={…}` sur `<input type="file">`
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pickerPath = join(
  process.cwd(),
  "src/components/suivi/absence-justificatif-picker.tsx",
);
const formPath = join(
  process.cwd(),
  "src/components/suivi/absence-form.tsx",
);
const latePath = join(
  process.cwd(),
  "src/components/suivi/late-form.tsx",
);

const picker = readFileSync(pickerPath, "utf8");
const form = readFileSync(formPath, "utf8");
const late = readFileSync(latePath, "utf8");

const offenders: string[] = [];

// Action bars / icônes démontées selon phase
if (/phase\s*===\s*["']ready["'][^?\n]{0,80}\?\s*\(/.test(picker)) {
  offenders.push(
    "absence-justificatif-picker: ternaire phase===ready ? (…) — cacher, ne pas démonter",
  );
}
if (/phase\s*===\s*["']confirmed["'][^?\n]{0,80}\?\s*\(/.test(picker)) {
  offenders.push(
    "absence-justificatif-picker: ternaire phase===confirmed ? (…) — cacher, ne pas démonter",
  );
}
if (/phase\s*===\s*["']reading["']\s*\?\s*\(/.test(picker)) {
  offenders.push(
    "absence-justificatif-picker: ternaire phase===reading ? (…) — cacher, ne pas démonter",
  );
}

// File input disabled (extensions + disabled toggle → removeChild)
{
  const fileInputMatch = picker.match(
    /<input\b[^>]*type=["']file["'][^>]*>|<input\b[^>]*\n(?:[^>]|\n)*?type=["']file["'](?:[^>]|\n)*?>/,
  );
  const fileBlock = fileInputMatch?.[0] ?? "";
  if (fileBlock && /\bdisabled=/.test(fileBlock)) {
    offenders.push(
      "absence-justificatif-picker: <input type=file> ne doit pas être disabled — gate dans onChange",
    );
  }
}

// Input file doit rester présent
if (!/type=["']file["']/.test(picker)) {
  offenders.push("absence-justificatif-picker: input type=file manquant");
}

// Formulaire absences : panels d’étape toujours montés (clés stables)
for (const key of ["step-collab", "step-details", "step-justif", "step-recap"]) {
  if (!form.includes(`key="${key}"`)) {
    offenders.push(`absence-form: clé stable manquante ${key}`);
  }
}

// Footer : pas de ternaire step > 0 ? Button : Link (unmount)
if (/step\s*>\s*0\s*\?\s*\([\s\S]{0,120}<Button/.test(form)) {
  offenders.push(
    "absence-form: footer Annuler/Retour en ternaire — toujours montés + hidden",
  );
}
if (/step\s*<\s*steps\.length\s*-\s*1\s*\?\s*\(/.test(form)) {
  offenders.push(
    "absence-form: footer Continuer/Submit en ternaire — toujours montés + hidden",
  );
}

// Retards : date/time ne doivent pas être disabled selon l’étape
if (/type=["']date["'][\s\S]{0,220}disabled=\{pending\s*\|\|/.test(late)) {
  offenders.push(
    "late-form: input date disabled selon étape — utiliser disabled={pending} + inert",
  );
}
if (/type=["']time["'][\s\S]{0,220}disabled=\{pending\s*\|\|/.test(late)) {
  offenders.push(
    "late-form: input time disabled selon étape — utiliser disabled={pending} + inert",
  );
}
if (!late.includes("useSafeStep")) {
  offenders.push("late-form: utiliser useSafeStep (blur avant changement d’étape)");
}

assert.deepEqual(
  offenders,
  [],
  `Garde-fou removeChild DOM — violations:\n${offenders.join("\n")}`,
);

console.log("removechild-dom-guard.test.ts OK");
