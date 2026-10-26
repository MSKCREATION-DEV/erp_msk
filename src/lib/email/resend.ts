import { Resend } from "resend";
import { brandInlineAttachments } from "@/lib/email/brand-assets";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY manquant");
  return new Resend(key);
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Inclure logo MSK en CID (défaut true). */
  brandAssets?: boolean;
}) {
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const resend = getResend();
  const withBrand = params.brandAssets !== false;
  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    ...(withBrand ? { attachments: brandInlineAttachments() } : {}),
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
