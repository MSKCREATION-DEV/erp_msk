/**
 * Smoke PDF : WinAnsi CR + tous gabarits RH (sans DB).
 * Usage: node scripts/test-pdf-docs.mjs
 */
import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsx", "src/lib/pdf/rh.test.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (r.status !== 0) process.exit(r.status ?? 1);

const w = spawnSync("npx", ["tsx", "src/lib/pdf/winansi.test.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(w.status ?? 0);
