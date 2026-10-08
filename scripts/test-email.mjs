import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Resend } from "resend";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
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
}

loadEnvLocal();

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
const to = process.env.EMAIL_TEST_TO || "a.guiro@mskcreation.net";

if (!apiKey) {
  console.error("RESEND_API_KEY manquant dans .env.local");
  process.exit(1);
}

const resend = new Resend(apiKey);
const { data, error } = await resend.emails.send({
  from,
  to: [to],
  subject: "ERP MSK — test Phase -1",
  html: `<p>Test d’envoi Resend pour la Phase -1 du socle ERP MSK.</p>
<p>Si vous lisez ceci, Resend est opérationnel côté dev.</p>`,
  text: "Test d’envoi Resend pour la Phase -1 du socle ERP MSK.",
});

if (error) {
  console.error("Échec envoi:", error);
  process.exit(1);
}

console.log("OK — e-mail envoyé vers", to, "| id:", data?.id);
