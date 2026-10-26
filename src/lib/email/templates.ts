import { brand, colors } from "@/lib/brand";
import { company } from "@/lib/company";
import { EMAIL_CID } from "@/lib/email/brand-assets";

/**
 * Shell e-mail MSK — épuré / pro (inspiration produit moderne).
 * Couleurs = tokens charte v3 (`src/lib/brand.ts`) uniquement.
 */

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** CTA cliquable : jamais localhost dans la boîte du destinataire. */
function ctaBaseUrl() {
  const explicit = process.env.EMAIL_CTA_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const app = appUrl();
  if (app.includes("localhost") || app.includes("127.0.0.1")) {
    return "https://erp-msk.vercel.app";
  }
  return app;
}

/** Charte MSK — primary + dégradé officiels. */
const BLUE = colors.blue; // #1D73BC
const GRADIENT = `linear-gradient(90deg, ${colors.gradientFrom}, ${colors.gradientTo})`;
const INK = colors.ink;
const CANVAS = "#E8ECF2";
const WHITE = colors.white;
const MUTED = colors.muted;
const HAIRLINE = colors.paper;
const SOFT = "#F4F6F9";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Lockup blanc → fond ink uniquement. Mark → pastille / footer. */
function lockupUrl() {
  return `cid:${EMAIL_CID.lockup}`;
}

function markUrl() {
  return `cid:${EMAIL_CID.mark}`;
}

type EmailShellOpts = {
  preheader: string;
  title: string;
  /** Une phrase de soutien sous le titre (optionnel). */
  lead?: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  footerNote?: string;
  /** Alignement du corps : centre (défaut marketing) ou gauche (données). */
  align?: "center" | "left";
};

function emailShell(opts: EmailShellOpts) {
  const align = opts.align ?? "center";
  const textAlign = align === "center" ? "center" : "left";
  const ctaAlign = align === "center" ? "center" : "left";
  const footerNote =
    opts.footerNote ??
    "E-mail automatique — ne partagez jamais vos identifiants.";
  const siteHost = brand.url.replace(/^https?:\/\//, "");

  const leadBlock = opts.lead
    ? `<p style="margin:0 0 28px;font-size:16px;line-height:1.55;color:${MUTED};text-align:${textAlign};">
        ${escapeHtml(opts.lead)}
      </p>`
    : "";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(opts.preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">

          <!-- Identité : lockup CID sur ink (bandeau, PAS un bouton) -->
          <tr>
            <td style="padding:0 0 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INK};border-radius:20px;">
                <tr>
                  <td align="center" style="padding:28px 28px 24px;">
                    <img
                      src="${lockupUrl()}"
                      alt="${escapeHtml(brand.name)}"
                      width="176"
                      style="display:block;margin:0 auto;width:176px;max-width:70%;height:auto;border:0;outline:none;"
                    />
                    <p style="margin:14px 0 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A93A6;font-weight:600;">
                      ${escapeHtml(brand.tagline)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Carte principale -->
          <tr>
            <td style="background:${WHITE};border-radius:24px;border:1px solid ${HAIRLINE};padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:40px 36px 40px;" align="${textAlign}">

                    <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:700;color:${INK};letter-spacing:-0.02em;text-align:${textAlign};">
                      ${escapeHtml(opts.title)}
                    </h1>

                    ${leadBlock}

                    <div style="text-align:${textAlign};">
                      ${opts.bodyHtml}
                    </div>

                    <!-- CTA charte : dégradé #2A3D8E → #00ACEE (MSO = bleu primary) -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:36px auto 0;" align="${ctaAlign}">
                      <tr>
                        <td align="center" style="border-radius:999px;background:${BLUE};">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${opts.ctaHref}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="50%" stroke="f" fillcolor="${BLUE}">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Segoe UI,sans-serif;font-size:16px;font-weight:700;">
                              ${escapeHtml(opts.ctaLabel)} →
                            </center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-- -->
                          <a href="${opts.ctaHref}" style="display:inline-block;padding:16px 36px;color:${WHITE};text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.01em;border-radius:999px;background:${BLUE};background-image:${GRADIENT};">
                            ${escapeHtml(opts.ctaLabel)}&nbsp;&nbsp;→
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:${MUTED};text-align:${textAlign};">
                      Lien de secours ·
                      <a href="${opts.ctaHref}" style="color:${MUTED};text-decoration:underline;word-break:break-all;">${escapeHtml(opts.ctaHref)}</a>
                    </p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer soft (style produit) -->
          <tr>
            <td style="padding:28px 8px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SOFT};border-radius:16px;border:1px solid ${HAIRLINE};">
                <tr>
                  <td style="padding:20px 24px;" align="center">
                    <!-- Mark CID + raison sociale (signature, pas CTA) -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 14px;">
                      <tr>
                        <td valign="middle" style="padding-right:10px;">
                          <img
                            src="${markUrl()}"
                            alt="${escapeHtml(brand.shortName)}"
                            width="32"
                            height="32"
                            style="display:block;width:32px;height:32px;border:0;border-radius:8px;"
                          />
                        </td>
                        <td valign="middle" style="text-align:left;">
                          <span style="display:block;font-size:13px;font-weight:700;letter-spacing:0.04em;color:${INK};">
                            ${escapeHtml(brand.name)}
                          </span>
                          <span style="display:block;font-size:10px;color:${MUTED};margin-top:2px;">
                            ${escapeHtml(company.legalForm)}
                          </span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 10px;font-size:11px;line-height:1.55;color:${MUTED};">
                      ${escapeHtml(company.addressOneLine)}
                    </p>
                    <p style="margin:0 0 12px;font-size:11px;line-height:1.55;color:${MUTED};">
                      <a href="mailto:${company.email}" style="color:${MUTED};text-decoration:underline;">${escapeHtml(company.email)}</a>
                      &nbsp;·&nbsp;
                      <a href="${brand.url}" style="color:${MUTED};text-decoration:underline;">${escapeHtml(siteHost)}</a>
                    </p>
                    <p style="margin:0;font-size:10px;line-height:1.5;color:${MUTED};opacity:0.85;">
                      ${escapeHtml(footerNote)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function detailCard(innerHtml: string) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;background:${SOFT};border-radius:16px;border:1px solid ${HAIRLINE};text-align:left;">
      <tr><td style="padding:20px 22px;text-align:left;">
        ${innerHtml}
      </td></tr>
    </table>
  `;
}

export function inviteEmailHtml(params: {
  firstName: string;
  email: string;
  tempPassword: string;
  packsSummary: string;
  roleHint?: string;
}) {
  const loginUrl = `${ctaBaseUrl()}/login`;
  const roleBit = params.roleHint ? ` (${escapeHtml(params.roleHint)})` : "";
  const bodyHtml = detailCard(`
    <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${BLUE};font-weight:700;">Identifiants</p>
    <p style="margin:0 0 14px;font-size:14px;color:${INK};line-height:1.5;text-align:left;">
      <span style="display:block;font-size:11px;color:${MUTED};margin-bottom:4px;">E-mail</span>
      <span style="font-family:ui-monospace,Consolas,monospace;font-size:13px;">${escapeHtml(params.email)}</span>
    </p>
    <p style="margin:0 0 14px;font-size:14px;color:${INK};line-height:1.5;text-align:left;">
      <span style="display:block;font-size:11px;color:${MUTED};margin-bottom:4px;">Mot de passe temporaire</span>
      <code style="display:inline-block;background:${WHITE};border:1px solid ${HAIRLINE};padding:8px 12px;border-radius:10px;font-size:14px;letter-spacing:0.04em;font-family:ui-monospace,Consolas,monospace;color:${INK};">${escapeHtml(params.tempPassword)}</code>
    </p>
    <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.5;text-align:left;">
      Accès : ${escapeHtml(params.packsSummary)}${roleBit}
    </p>
  `);

  return emailShell({
    preheader: `Votre accès ERP ${brand.name} est prêt.`,
    title: `Bonjour ${params.firstName}`,
    lead: `Votre espace ERP ${brand.name} est prêt. Connectez-vous, puis changez immédiatement votre mot de passe.`,
    bodyHtml,
    ctaLabel: "Ouvrir l’ERP",
    ctaHref: loginUrl,
    align: "center",
    footerNote:
      "Ne partagez jamais ce mot de passe. Changez-le dès la première connexion.",
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
    `${ctaBaseUrl()}/login`,
    ``,
    `${company.legalForm} — ${company.email}`,
  ].join("\n");
}

export function passwordRecoveryLinkHtml(params: {
  firstName: string;
  resetUrl: string;
}) {
  return emailShell({
    preheader: "Réinitialisez votre mot de passe ERP MSK",
    title: `Bonjour ${params.firstName}`,
    lead: "Une réinitialisation de mot de passe a été demandée pour votre compte ERP.",
    bodyHtml: `
      <p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};text-align:left;">
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
        Ce lien est à usage unique et expire rapidement. Si vous n’êtes pas à
        l’origine de cette demande, ignorez cet e-mail.
      </p>
    `,
    ctaLabel: "Choisir un nouveau mot de passe",
    ctaHref: params.resetUrl,
    align: "center",
    footerNote: "Ne transférez pas cet e-mail. Lien personnel et temporaire.",
  });
}

export function passwordRecoveryLinkText(params: {
  firstName: string;
  resetUrl: string;
}) {
  return [
    `Bonjour ${params.firstName},`,
    ``,
    `Réinitialisez votre mot de passe ERP ${brand.name} :`,
    params.resetUrl,
    ``,
    `Lien à usage unique. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.`,
    ``,
    `${company.legalForm} — ${company.email}`,
  ].join("\n");
}

export function tempPasswordEmailHtml(params: {
  firstName: string;
  email: string;
  tempPassword: string;
}) {
  const loginUrl = `${ctaBaseUrl()}/login`;
  const bodyHtml = detailCard(`
    <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${BLUE};font-weight:700;">Connexion temporaire</p>
    <p style="margin:0 0 14px;font-size:14px;color:${INK};line-height:1.5;text-align:left;">
      <span style="display:block;font-size:11px;color:${MUTED};margin-bottom:4px;">E-mail</span>
      <span style="font-family:ui-monospace,Consolas,monospace;font-size:13px;">${escapeHtml(params.email)}</span>
    </p>
    <p style="margin:0;font-size:14px;color:${INK};line-height:1.5;text-align:left;">
      <span style="display:block;font-size:11px;color:${MUTED};margin-bottom:4px;">Mot de passe temporaire</span>
      <code style="display:inline-block;background:${WHITE};border:1px solid ${HAIRLINE};padding:8px 12px;border-radius:10px;font-size:14px;letter-spacing:0.04em;font-family:ui-monospace,Consolas,monospace;color:${INK};">${escapeHtml(params.tempPassword)}</code>
    </p>
  `);

  return emailShell({
    preheader: "Mot de passe temporaire ERP MSK",
    title: `Bonjour ${params.firstName}`,
    lead: "Un mot de passe temporaire a été généré. Connectez-vous puis choisissez immédiatement votre mot de passe définitif.",
    bodyHtml,
    ctaLabel: "Se connecter",
    ctaHref: loginUrl,
    align: "center",
    footerNote:
      "Ne partagez jamais ce mot de passe. Changez-le dès la première connexion.",
  });
}

export function tempPasswordEmailText(params: {
  firstName: string;
  email: string;
  tempPassword: string;
}) {
  return [
    `Bonjour ${params.firstName},`,
    ``,
    `Mot de passe temporaire ERP ${brand.name} :`,
    `E-mail : ${params.email}`,
    `Mot de passe temporaire : ${params.tempPassword}`,
    ``,
    `Connectez-vous puis changez immédiatement votre mot de passe :`,
    `${ctaBaseUrl()}/login`,
    ``,
    `${company.legalForm} — ${company.email}`,
  ].join("\n");
}

export function resetRequestNotifyHtml(params: {
  subjectName: string;
  subjectEmail: string;
  requesterHint: string;
}) {
  const adminUrl = `${ctaBaseUrl()}/administration/utilisateurs`;
  const bodyHtml = detailCard(`
    <p style="margin:0 0 12px;font-size:14px;color:${INK};line-height:1.5;text-align:left;">
      <span style="display:block;font-size:11px;color:${MUTED};margin-bottom:4px;">Collaborateur</span>
      ${escapeHtml(params.subjectName)}
    </p>
    <p style="margin:0 0 12px;font-size:14px;color:${INK};line-height:1.5;text-align:left;">
      <span style="display:block;font-size:11px;color:${MUTED};margin-bottom:4px;">E-mail</span>
      <span style="font-family:ui-monospace,Consolas,monospace;font-size:13px;">${escapeHtml(params.subjectEmail)}</span>
    </p>
    <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.5;text-align:left;">
      ${escapeHtml(params.requesterHint)}
    </p>
  `);

  return emailShell({
    preheader: `Demande de reset MDP — ${params.subjectName}`,
    title: "Réinitialisation demandée",
    lead: "Une demande de réinitialisation de mot de passe a été enregistrée.",
    bodyHtml,
    ctaLabel: "Voir dans l’admin",
    ctaHref: adminUrl,
    align: "center",
    footerNote:
      "Réservé aux administrateurs. Vérifiez l’identité avant toute action.",
  });
}

export function systemTestEmailHtml() {
  const loginUrl = `${ctaBaseUrl()}/login`;
  return emailShell({
    preheader: `Test Resend — ${brand.name}`,
    title: "Votre e-mail MSK est prêt",
    lead: "Socle Resend opérationnel : expéditeur vérifié, template brandé, logos embarqués.",
    bodyHtml: `
      <p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};">
        Si ce message est lisible et bien mis en page, l’intégration e-mail de l’ERP est validée.
      </p>
    `,
    ctaLabel: "Ouvrir l’ERP",
    ctaHref: loginUrl,
    align: "center",
    footerNote: "E-mail de test — vous pouvez l’ignorer.",
  });
}

export function systemTestEmailText() {
  return [
    `Test d’envoi Resend — ERP ${brand.name}.`,
    `Si vous lisez ceci, Resend est opérationnel.`,
    `${ctaBaseUrl()}/login`,
    ``,
    `${company.legalForm} — ${company.email}`,
  ].join("\n");
}
