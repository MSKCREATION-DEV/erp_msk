import { brand } from "@/lib/brand";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function inviteEmailHtml(params: {
  firstName: string;
  tempPassword: string;
  packsSummary: string;
}) {
  const loginUrl = `${appUrl()}/login`;
  return `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F5F3EF;font-family:system-ui,sans-serif;color:#0D1330;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" style="background:#fff;border-radius:12px;padding:32px;border:1px solid #DCE0E8;">
        <tr><td>
          <p style="margin:0 0 8px;color:#1D73BC;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">${brand.name}</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Bienvenue, ${params.firstName}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0D1330cc;">
            Votre compte ERP interne a été créé. Connectez-vous puis <strong>changez immédiatement votre mot de passe</strong>.
          </p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>E-mail :</strong> fourni lors de l’invitation</p>
          <p style="margin:0 0 16px;font-size:14px;"><strong>Mot de passe temporaire :</strong>
            <code style="background:#F5F3EF;padding:4px 8px;border-radius:4px;">${params.tempPassword}</code>
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#0D1330aa;">Accès prévus : ${params.packsSummary}</p>
          <a href="${loginUrl}" style="display:inline-block;background:#1D73BC;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;">
            Se connecter
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export function resetRequestNotifyHtml(params: {
  subjectName: string;
  subjectEmail: string;
  requesterHint: string;
}) {
  const adminUrl = `${appUrl()}/administration/utilisateurs`;
  return `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#F5F3EF;font-family:system-ui,sans-serif;color:#0D1330;">
  <div style="max-width:520px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;border:1px solid #DCE0E8;">
    <p style="color:#1D73BC;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">${brand.name} · IAM</p>
    <h1 style="font-size:20px;">Demande de réinitialisation MDP</h1>
    <p>Collaborateur : <strong>${params.subjectName}</strong> (${params.subjectEmail})</p>
    <p style="color:#0D1330aa;">${params.requesterHint}</p>
    <a href="${adminUrl}" style="display:inline-block;margin-top:16px;background:#1D73BC;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">Ouvrir l’administration</a>
  </div>
</body>
</html>`.trim();
}
