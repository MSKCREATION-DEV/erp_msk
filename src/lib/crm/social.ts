/** LOT-F — réseaux sociaux entreprise (colonnes URL). */

export const SOCIAL_NETWORKS = [
  {
    key: "instagram",
    label: "Instagram",
    field: "instagramUrl" as const,
    placeholder: "https://instagram.com/… ou @compte",
    hosts: ["instagram.com", "www.instagram.com"],
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    field: "linkedinUrl" as const,
    placeholder: "https://linkedin.com/company/… ou nom",
    hosts: ["linkedin.com", "www.linkedin.com"],
  },
  {
    key: "tiktok",
    label: "TikTok",
    field: "tiktokUrl" as const,
    placeholder: "https://tiktok.com/@… ou @compte",
    hosts: ["tiktok.com", "www.tiktok.com"],
  },
  {
    key: "facebook",
    label: "Facebook",
    field: "facebookUrl" as const,
    placeholder: "https://facebook.com/… ou page",
    hosts: ["facebook.com", "www.facebook.com", "fb.com", "www.fb.com", "m.facebook.com"],
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    field: "whatsappUrl" as const,
    placeholder: "https://wa.me/221… ou n° téléphone",
    hosts: ["wa.me", "api.whatsapp.com", "whatsapp.com", "www.whatsapp.com", "chat.whatsapp.com"],
  },
] as const;

export type SocialNetworkKey = (typeof SOCIAL_NETWORKS)[number]["key"];
export type SocialField = (typeof SOCIAL_NETWORKS)[number]["field"];

export type SocialUrls = Partial<Record<SocialField, string | null>>;

export type NormalizeSocialResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

/** Préfixe https si schéma absent (rétrocompat). */
export function sanitizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v;
}

function stripHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").replace(/^\/+/, "");
}

function looksLikeUrl(raw: string): boolean {
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return true;
  if (/^(www\.)?(instagram|linkedin|tiktok|facebook|fb|wa\.me|whatsapp|api\.whatsapp)\./i.test(v)) {
    return true;
  }
  return false;
}

function hostOf(url: string): string | null {
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostAllowed(
  host: string,
  allowed: readonly string[],
): boolean {
  return allowed.some(
    (h) => host === h || host.endsWith(`.${h.replace(/^www\./, "")}`),
  );
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D+/g, "");
}

/**
 * Normalise une saisie réseau social :
 * - vide → null
 * - URL / domaine → valide le host du réseau, force https
 * - handle / pseudo / téléphone (WhatsApp) → construit l’URL canonique
 */
export function normalizeSocialUrl(
  network: SocialNetworkKey,
  raw: string,
): NormalizeSocialResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: null };

  const def = SOCIAL_NETWORKS.find((n) => n.key === network);
  if (!def) return { ok: false, error: "Réseau inconnu" };

  if (network === "whatsapp") {
    if (looksLikeUrl(trimmed) || /wa\.me|whatsapp/i.test(trimmed)) {
      const withScheme = sanitizeUrl(trimmed);
      if (!withScheme) return { ok: true, url: null };
      const host = hostOf(withScheme);
      if (!host || !hostAllowed(host, def.hosts)) {
        return {
          ok: false,
          error:
            "Lien WhatsApp invalide — utilisez wa.me/… ou un numéro international.",
        };
      }
      try {
        const u = new URL(withScheme);
        u.protocol = "https:";
        return { ok: true, url: u.toString().replace(/\/$/, "") };
      } catch {
        return { ok: false, error: "Lien WhatsApp invalide" };
      }
    }
    const digits = digitsOnly(trimmed);
    if (digits.length < 8 || digits.length > 15) {
      return {
        ok: false,
        error:
          "Indiquez un numéro WhatsApp (ex. 22170…) ou un lien wa.me complet.",
      };
    }
    return { ok: true, url: `https://wa.me/${digits}` };
  }

  if (looksLikeUrl(trimmed)) {
    const withScheme = sanitizeUrl(trimmed);
    if (!withScheme) return { ok: true, url: null };
    const host = hostOf(withScheme);
    if (!host || !hostAllowed(host, def.hosts)) {
      return {
        ok: false,
        error: `Ce lien ne correspond pas à ${def.label}. Vérifiez l’URL ou saisissez uniquement le nom du compte.`,
      };
    }
    try {
      const u = new URL(withScheme);
      u.protocol = "https:";
      return { ok: true, url: u.toString().replace(/\/$/, "") };
    } catch {
      return { ok: false, error: `Lien ${def.label} invalide` };
    }
  }

  const handle = stripHandle(trimmed);
  if (!handle || /\s/.test(handle)) {
    return {
      ok: false,
      error: `Indiquez un compte ${def.label} (sans espaces) ou l’URL complète du profil.`,
    };
  }

  switch (network) {
    case "instagram":
      return { ok: true, url: `https://instagram.com/${handle}` };
    case "linkedin":
      if (/^(company|in|school)\//i.test(handle)) {
        return { ok: true, url: `https://linkedin.com/${handle}` };
      }
      return { ok: true, url: `https://linkedin.com/company/${handle}` };
    case "tiktok": {
      const user = handle.startsWith("@") ? handle : `@${handle}`;
      return { ok: true, url: `https://tiktok.com/${user}` };
    }
    case "facebook":
      return { ok: true, url: `https://facebook.com/${handle}` };
    default:
      return { ok: false, error: "Réseau inconnu" };
  }
}

/** Persistance create/update — une URL normalisée ou erreur. */
export function normalizeSocialField(
  field: SocialField,
  raw: string,
): NormalizeSocialResult {
  const net = SOCIAL_NETWORKS.find((n) => n.field === field);
  if (!net) return { ok: false, error: "Réseau inconnu" };
  return normalizeSocialUrl(net.key, raw);
}
