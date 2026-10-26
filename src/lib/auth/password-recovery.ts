import { UserStatus } from "@prisma/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  passwordRecoveryLinkHtml,
  passwordRecoveryLinkText,
  tempPasswordEmailHtml,
  tempPasswordEmailText,
} from "@/lib/email/templates";

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

/** URL publique pour CTA e-mail (évite localhost côté destinataire). */
export function authPublicBaseUrl() {
  const explicit = process.env.EMAIL_CTA_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const app = appUrl();
  if (app.includes("localhost") || app.includes("127.0.0.1")) {
    return "https://erp-msk.vercel.app";
  }
  return app;
}

export function genTempPassword() {
  return `Msk-${Math.random().toString(36).slice(2, 10)}!A1`;
}

export function isPasswordResetEligible(status: UserStatus): boolean {
  return (
    status !== UserStatus.ARCHIVED && status !== UserStatus.SUSPENDED
  );
}

/**
 * Lien de vérif serveur (token_hash) — plus fiable que l’action_link Supabase
 * (PKCE / hash fragment) pour un e-mail custom Resend.
 */
export function buildRecoveryVerifyUrl(opts: {
  baseUrl: string;
  tokenHash: string;
  next?: string;
}): string {
  const next = opts.next ?? "/reinitialiser-mot-de-passe";
  const u = new URL(`${opts.baseUrl.replace(/\/$/, "")}/auth/callback`);
  u.searchParams.set("token_hash", opts.tokenHash);
  u.searchParams.set("type", "recovery");
  u.searchParams.set("next", next);
  return u.toString();
}

/**
 * Génère un lien recovery Supabase et l’envoie au collaborateur via Resend.
 * Ne retourne jamais le lien au client appelant (sauf erreur technique).
 */
export async function sendRecoveryLinkEmail(opts: {
  email: string;
  firstName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const nextPath = "/reinitialiser-mot-de-passe";
  // redirectTo = filet si un flux Supabase natif est déclenché ; l’e-mail
  // utilise toujours token_hash → /auth/callback (vérif serveur).
  const redirectTo = `${authPublicBaseUrl()}/auth/recover`;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: opts.email,
    options: { redirectTo },
  });

  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) {
    return {
      ok: false,
      error:
        error?.message ??
        "Impossible de générer le jeton de réinitialisation",
    };
  }

  const resetUrl = buildRecoveryVerifyUrl({
    baseUrl: authPublicBaseUrl(),
    tokenHash: hashed,
    next: nextPath,
  });

  try {
    await sendEmail({
      to: opts.email,
      subject: "MSK CREATION — Réinitialiser votre mot de passe",
      html: passwordRecoveryLinkHtml({
        firstName: opts.firstName,
        resetUrl,
      }),
      text: passwordRecoveryLinkText({
        firstName: opts.firstName,
        resetUrl,
      }),
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Échec d’envoi de l’e-mail de réinitialisation",
    };
  }

  return { ok: true };
}

/**
 * Pose un MDP temporaire Auth + envoie uniquement par e-mail (jamais renvoyé à l’UI).
 */
export async function setTempPasswordAndEmail(opts: {
  userId: string;
  email: string;
  firstName: string;
  tempPassword?: string;
}): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const temp = opts.tempPassword ?? genTempPassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(opts.userId, {
    password: temp,
  });
  if (error) return { ok: false, error: error.message };

  try {
    await sendEmail({
      to: opts.email,
      subject: "MSK CREATION — Mot de passe temporaire",
      html: tempPasswordEmailHtml({
        firstName: opts.firstName,
        email: opts.email,
        tempPassword: temp,
      }),
      text: tempPasswordEmailText({
        firstName: opts.firstName,
        email: opts.email,
        tempPassword: temp,
      }),
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "MDP mis à jour mais e-mail non délivré",
    };
  }

  return { ok: true };
}
