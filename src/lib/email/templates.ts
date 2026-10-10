import { brand } from "@/lib/brand";
import { company } from "@/lib/company";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const BLUE = "#1D73BC";
const INK = "#0D1330";
const CHALK = "#F5F3EF";
const PAPER = "#DCE0E8";
const CORAL = "#FF5A3C";
const MUTED = "#8A93A6";

function logoUrl() {
  return `${appUrl()}/brand/lockup.png`;
}

function emailShell(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:${CHALK};font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:${INK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:${CHALK};">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;border:1px solid ${PAPER};overflow:hidden;">
        <tr>
          <td style="background:${INK};padding:20px 28px;">
            <img src="${logoUrl()}" alt="${brand.name}" width="140" style="display:block;height:auto;max-width:140px;border:0;" />
          </td>
        </tr>
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#2A3D8E,#00ACEE);font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:32px 28px 8px;">
            <p style="margin:0 0 8px;color:${BLUE};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;">${brand.name}</p>
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:${INK};font-weight:700;">${opts.title}</h1>
            ${opts.bodyHtml}
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
              <tr>
                <td style="border-radius:10px;background:${BLUE};">
                  <a href="${opts.ctaHref}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;">
                    ${opts.ctaLabel}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 28px;border-top:1px solid ${PAPER};">
            <p style="margin:0 0 6px;font-size:11px;line-height:1.5;color:${MUTED};">
              ${company.legalForm} · ${company.addressOneLine}
            </p>
            <p style="margin:0;font-size:11px;line-height:1.5;color:${MUTED};">
              NIF ${company.fiscalId} · ${company.email} · ${company.phones}
            </p>
            <p style="margin:12px 0 0;font-size:10px;color:${CORAL};opacity:0.85;">
              Ne partagez jamais votre mot de passe. Changez-le dès la première connexion.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export function inviteEmailHtml(params: {
  firstName: string;
  email: string;
  tempPassword: string;
  packsSummary: string;
  roleHint?: string;
}) {
  const loginUrl = `${appUrl()}/login`;
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${INK};opacity:0.85;">
      Bonjour <strong>${params.firstName}</strong>, votre accès à l’ERP interne
      ${brand.name} est prêt${params.roleHint ? ` — ${params.roleHint}` : ""}.
    </p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${INK};opacity:0.85;">
      Connectez-vous puis <strong>changez immédiatement votre mot de passe</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHALK};border-radius:12px;border:1px solid ${PAPER};">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${BLUE};font-weight:700;">Identifiants</p>
        <p style="margin:0 0 8px;font-size:14px;color:${INK};"><strong>E-mail</strong><br/><span style="font-family:ui-monospace,monospace;">${params.email}</span></p>
        <p style="margin:0 0 8px;font-size:14px;color:${INK};"><strong>Mot de passe temporaire</strong><br/>
          <code style="display:inline-block;margin-top:4px;background:#fff;border:1px solid ${PAPER};padding:6px 10px;border-radius:6px;font-size:13px;letter-spacing:0.04em;">${params.tempPassword}</code>
        </p>
        <p style="margin:12px 0 0;font-size:13px;color:${MUTED};">Accès : ${params.packsSummary}</p>
      </td></tr>
    </table>
  `;
  return emailShell({
    preheader: `Votre compte ERP ${brand.name} est prêt — changez votre mot de passe à la connexion.`,
    title: "Bienvenue dans l’ERP MSK",
    bodyHtml,
    ctaLabel: "Accéder à l’ERP",
    ctaHref: loginUrl,
  });
}

export function inviteEmailText(params: {
  firstName: string;
  email: string;
  tempPassword: string;
  packsSummary: string;
}) {
  return [
    `Bonjour ${params.firstName},`,
    ``,
    `Votre accès ERP ${brand.name} est prêt.`,
    `E-mail : ${params.email}`,
    `Mot de passe temporaire : ${params.tempPassword}`,
    `Accès : ${params.packsSummary}`,
    ``,
    `Connectez-vous puis changez immédiatement votre mot de passe :`,
    `${appUrl()}/login`,
    ``,
    `${company.legalForm} — ${company.email}`,
  ].join("\n");
}

export function resetRequestNotifyHtml(params: {
  subjectName: string;
  subjectEmail: string;
  requesterHint: string;
}) {
  const adminUrl = `${appUrl()}/administration/utilisateurs`;
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:${INK};opacity:0.85;">
      Une demande de réinitialisation de mot de passe a été enregistrée.
    </p>
    <p style="margin:0 0 8px;font-size:14px;"><strong>Collaborateur :</strong> ${params.subjectName}</p>
    <p style="margin:0 0 8px;font-size:14px;"><strong>E-mail :</strong> ${params.subjectEmail}</p>
    <p style="margin:0 0 8px;font-size:14px;color:${MUTED};">${params.requesterHint}</p>
  `;
  return emailShell({
    preheader: `Demande de reset MDP — ${params.subjectName}`,
    title: "Demande de réinitialisation MDP",
    bodyHtml,
    ctaLabel: "Ouvrir l’administration",
    ctaHref: adminUrl,
  });
}
