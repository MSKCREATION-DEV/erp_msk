/**
 * Met à jour DATABASE_URL vers le pooler Supabase si le direct (IPv6) est injoignable.
 * N'affiche jamais le mot de passe.
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const current = process.env.DATABASE_URL;
if (!current) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}

const url = new URL(current.replace(/^postgresql:/, "http:"));
const password = decodeURIComponent(url.password);
const ref = "mbyanjrdwhttiabjsodf";
const regions = [
  "eu-west-1",
  "eu-central-1",
  "eu-west-2",
  "eu-west-3",
  "us-east-1",
  "ap-southeast-1",
];

async function tryUrl(conn) {
  const client = new pg.Client({ connectionString: conn, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    await client.query("select 1");
    await client.end();
    return true;
  } catch {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return false;
  }
}

console.log("Test connexion directe…");
if (await tryUrl(current)) {
  console.log("OK — DATABASE_URL direct fonctionne");
  process.exit(0);
}

console.log("Direct injoignable — essai pooler…");
for (const region of regions) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const pooler = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:6543/postgres?sslmode=require&pgbouncer=true`;
  process.stdout.write(`  ${host} … `);
  if (await tryUrl(pooler)) {
    console.log("OK");
    const envPath = ".env.local";
    let text = readFileSync(envPath, "utf8");
    const direct =
      current.includes("sslmode=")
        ? current
        : current + (current.includes("?") ? "&" : "?") + "sslmode=require";
    if (!/^DIRECT_URL=/m.test(text)) {
      text += `\nDIRECT_URL=${direct}\n`;
    } else {
      text = text.replace(/^DIRECT_URL=.*$/m, `DIRECT_URL=${direct}`);
    }
    // DATABASE_URL = pooler (app) ; DIRECT_URL = direct (migrations)
    text = text.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${pooler}`);
    writeFileSync(envPath, text);
    writeFileSync(".env", text);
    console.log("DATABASE_URL mis à jour vers le pooler ; DIRECT_URL = direct");
    process.exit(0);
  }
  console.log("non");
}

console.error("Aucun pooler joignable");
process.exit(1);
