/**
 * Smoke / preview e-mails Resend (même shell que la prod).
 *
 * Usage :
 *   npm run test:email              → mail technique
 *   npm run test:email:invite       → aperçu invitation (compte créé)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Resend } from "resend";
import { brandInlineAttachments } from "../src/lib/email/brand-assets";
import {
  inviteEmailHtml,
  inviteEmailText,
  systemTestEmailHtml,
  systemTestEmailText,
} from "../src/lib/email/templates";

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
const preview =
  process.env.EMAIL_PREVIEW ||
  (process.argv.includes("--invite") ? "invite" : "system");

if (!apiKey) {
  console.error("RESEND_API_KEY manquant dans .env.local");
  process.exit(1);
}

/** Données fictives — même forme que `inviteUserAction` après création. */
const inviteSample = {
  firstName: "Amadou",
  email: to,
  tempPassword: "Msk-Temp-Demo!2026",
  packsSummary: "Commercial, CRM",
  roleHint: "Collaborateur",
};

async function main() {
  const resend = new Resend(apiKey);

  const payload =
    preview === "invite"
      ? {
          subject: "Bienvenue dans l’ERP MSK — votre accès est prêt",
          html: inviteEmailHtml(inviteSample),
          text: inviteEmailText(inviteSample),
        }
      : {
          subject: "ERP MSK — test e-mail brandé",
          html: systemTestEmailHtml(),
          text: systemTestEmailText(),
        };

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    ...payload,
    attachments: brandInlineAttachments(),
  });

  if (error) {
    console.error("Échec envoi:", error);
    process.exit(1);
  }

  console.log("OK — preview =", preview, "| vers", to, "| id:", data?.id);
  if (preview === "invite") {
    console.log("Données :", {
      firstName: inviteSample.firstName,
      email: inviteSample.email,
      packsSummary: inviteSample.packsSummary,
      tempPassword: "(affiché dans le mail)",
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
