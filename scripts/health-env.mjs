import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    console.log("ABSENT .env.local — copier depuis .env.example");
    return false;
  }
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
  return true;
}

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "NEXT_PUBLIC_APP_URL",
];

loadEnvLocal();
let ok = true;
for (const k of keys) {
  const v = process.env[k];
  const set = Boolean(v && String(v).trim());
  console.log(`${set ? "OK" : "MANQUANT"}  ${k}`);
  if (!set) ok = false;
}
process.exit(ok ? 0 : 2);
