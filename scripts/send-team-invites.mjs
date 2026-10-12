/**
 * One-shot : renvoie les accès ERP à Mathieu + Andile (MUST_CHANGE_PASSWORD uniquement).
 * Usage : node --env-file=.env scripts/send-team-invites.mjs
 *
 * Ne touche JAMAIS un compte ACTIVE.
 */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const APP_URL =
  process.env.INVITE_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://erp-msk.vercel.app";

const TARGETS = [
  {
    email: "m.diarra@mskcreation.net",
    firstName: "Mathieu",
    packsSummary: "Direction, Admin plateforme",
    roleHint: "Direction & administration plateforme",
  },
  {
    email: "a.boussari@mskcreation.net",
    firstName: "Andile",
    packsSummary: "Projets, Direction, Admin plateforme",
    roleHint: "Projets, Direction & administration plateforme",
  },
];

function genTempPassword() {
  return `Msk-${Math.random().toString(36).slice(2, 10)}!A1`;
}

function inviteHtml({ firstName, email, tempPassword, packsSummary, roleHint }) {
  const loginUrl = `${APP_URL.replace(/\/$/, "")}/login`;
  return `<!DOCTYPE html><html lang="fr"><body style="font-family:system-ui,sans-serif;color:#0D1330;background:#F5F3EF;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #DCE0E8;">
    <p style="font-size:13px;font-weight:700;color:#1D73BC;letter-spacing:0.06em;text-transform:uppercase;">MSK CREATION — ERP</p>
    <h1 style="font-size:22px;margin:8px 0 16px;">Bienvenue dans l’ERP MSK</h1>
    <p>Bonjour <strong>${firstName}</strong>, votre accès est prêt${roleHint ? ` — ${roleHint}` : ""}.</p>
    <p>Connectez-vous puis <strong>changez immédiatement votre mot de passe</strong>.</p>
    <div style="background:#F5F3EF;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 8px;"><strong>E-mail</strong><br/><code>${email}</code></p>
      <p style="margin:0 0 8px;"><strong>Mot de passe temporaire</strong><br/><code style="background:#fff;padding:6px 10px;border-radius:6px;display:inline-block;">${tempPassword}</code></p>
      <p style="margin:12px 0 0;font-size:13px;color:#8A93A6;">Accès : ${packsSummary}</p>
    </div>
    <p><a href="${loginUrl}" style="display:inline-block;background:#1D73BC;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">Accéder à l’ERP</a></p>
    <p style="font-size:12px;color:#8A93A6;margin-top:24px;">${loginUrl}</p>
  </div>
</body></html>`;
}

function inviteText({ firstName, email, tempPassword, packsSummary }) {
  return [
    `Bonjour ${firstName},`,
    ``,
    `Votre accès ERP MSK CREATION est prêt.`,
    `E-mail : ${email}`,
    `Mot de passe temporaire : ${tempPassword}`,
    `Accès : ${packsSummary}`,
    ``,
    `Connectez-vous puis changez immédiatement votre mot de passe :`,
    `${APP_URL.replace(/\/$/, "")}/login`,
  ].join("\n");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  if (!url || !serviceKey || !resendKey) {
    console.error("Manque NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY");
    process.exit(1);
  }

  console.log(`App URL : ${APP_URL}`);
  console.log(`From    : ${from}`);

  const prisma = new PrismaClient();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const resend = new Resend(resendKey);

  const results = [];

  for (const t of TARGETS) {
    const email = t.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      results.push({ email, ok: false, error: "Compte Prisma introuvable" });
      continue;
    }

    const activated =
      user.status === "ACTIVE" ||
      (!user.mustChangePassword && user.activatedAt != null);

    if (activated) {
      results.push({
        email,
        ok: false,
        error: "Compte ACTIVE — MDP Auth NON modifié (règle sécurité)",
      });
      console.log(`⛔ ${email} ACTIVE — skip`);
      continue;
    }

    if (
      user.status !== "MUST_CHANGE_PASSWORD" &&
      user.status !== "INVITE_PENDING"
    ) {
      results.push({
        email,
        ok: false,
        error: `Statut ${user.status} — envoi non autorisé`,
      });
      continue;
    }

    const tempPassword = genTempPassword();
    const { error: authErr } = await admin.auth.admin.updateUserById(user.id, {
      password: tempPassword,
      email_confirm: true,
    });
    if (authErr) {
      results.push({ email, ok: false, error: authErr.message });
      console.error(`✗ Auth ${email}:`, authErr.message);
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "MUST_CHANGE_PASSWORD",
        mustChangePassword: true,
        invitedAt: new Date(),
      },
    });

    const { data, error: mailErr } = await resend.emails.send({
      from,
      to: email,
      subject: "MSK CREATION — Votre accès ERP",
      html: inviteHtml({ ...t, email, tempPassword }),
      text: inviteText({ ...t, email, tempPassword }),
    });

    if (mailErr) {
      results.push({
        email,
        ok: false,
        error: mailErr.message,
        tempPassword,
        note: "MDP Auth mis à jour — e-mail Resend échoué ; communiquez le MDP manuellement",
      });
      console.error(`⚠ Mail ${email}:`, mailErr.message);
      console.error(`   MDP temporaire: ${tempPassword}`);
      continue;
    }

    results.push({
      email,
      ok: true,
      resendId: data?.id,
      tempPassword,
    });
    console.log(`✓ Invitation envoyée → ${email} (id ${data?.id})`);
  }

  await prisma.$disconnect();
  console.log("\n=== Résumé ===");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
