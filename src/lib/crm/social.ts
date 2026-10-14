/** LOT-F — réseaux sociaux entreprise (colonnes URL). */

export const SOCIAL_NETWORKS = [
  {
    key: "instagram",
    label: "Instagram",
    field: "instagramUrl" as const,
    placeholder: "https://instagram.com/…",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    field: "linkedinUrl" as const,
    placeholder: "https://linkedin.com/company/…",
  },
  {
    key: "tiktok",
    label: "TikTok",
    field: "tiktokUrl" as const,
    placeholder: "https://tiktok.com/@…",
  },
  {
    key: "facebook",
    label: "Facebook",
    field: "facebookUrl" as const,
    placeholder: "https://facebook.com/…",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    field: "whatsappUrl" as const,
    placeholder: "https://wa.me/221…",
  },
] as const;

export type SocialField = (typeof SOCIAL_NETWORKS)[number]["field"];

export type SocialUrls = Partial<Record<SocialField, string | null>>;

export function sanitizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v;
}
