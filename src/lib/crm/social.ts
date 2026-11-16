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

function normalizeUrlForCompare(raw: string): string {
  let v = raw.trim().toLowerCase().replace(/\/$/, "");
  v = v.replace(/^https?:\/\/www\./, (m) =>
    m.startsWith("https") ? "https://" : "http://",
  );
  return v;
}

/** Comparaison migration — ignore casse, slash final, www. */
export function socialUrlsEquivalent(a: string, b: string): boolean {
  return normalizeUrlForCompare(a) === normalizeUrlForCompare(b);
}

function pathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

/**
 * URL HTTPS canonique par réseau (sans www., sans slash final).
 * Retourne null si le chemin est vide (profil incomplet) — sauf WhatsApp.
 */
function canonicalizeSocialUrl(
  network: SocialNetworkKey,
  urlString: string,
): string | null {
  try {
    const u = new URL(
      urlString.includes("://") ? urlString : `https://${urlString}`,
    );
    const segs = pathSegments(u.pathname);

    if (network === "whatsapp") {
      if (u.hostname.toLowerCase() === "wa.me") {
        const n = segs[0] ?? digitsOnly(u.pathname);
        if (n.length >= 8) return `https://wa.me/${n}`;
      }
      u.protocol = "https:";
      return u.toString().replace(/\/$/, "");
    }

    if (segs.length === 0) return null;

    switch (network) {
      case "instagram": {
        const handle = segs[0]!.replace(/^@+/, "");
        if (!handle || ["p", "reel", "reels", "stories"].includes(handle)) {
          u.protocol = "https:";
          return u.toString().replace(/\/$/, "");
        }
        return `https://instagram.com/${handle}`;
      }
      case "linkedin": {
        if (segs[0] === "company" && segs[1]) {
          return `https://linkedin.com/company/${segs[1]}`;
        }
        if (segs[0] === "in" && segs[1]) {
          return `https://linkedin.com/in/${segs[1]}`;
        }
        if (segs[0] === "school" && segs[1]) {
          return `https://linkedin.com/school/${segs[1]}`;
        }
        const slug = segs[segs.length - 1]!;
        if (slug) return `https://linkedin.com/company/${slug}`;
        return null;
      }
      case "tiktok": {
        let user = segs[0]!;
        if (user === "@" || user === "") return null;
        if (!user.startsWith("@")) user = `@${user.replace(/^@+/, "")}`;
        return `https://tiktok.com/${user}`;
      }
      case "facebook": {
        const page = segs[0]!;
        if (!page) return null;
        return `https://facebook.com/${page}`;
      }
      default:
        u.protocol = "https:";
        return u.toString().replace(/\/$/, "");
    }
  } catch {
    return null;
  }
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
        const canon = canonicalizeSocialUrl("whatsapp", withScheme);
        if (!canon) return { ok: false, error: "Lien WhatsApp invalide" };
        return { ok: true, url: canon };
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
      const canon = canonicalizeSocialUrl(network, withScheme);
      if (!canon) {
        return {
          ok: false,
          error: `Lien ${def.label} incomplet — ajoutez le nom du compte ou l’URL complète.`,
        };
      }
      return { ok: true, url: canon };
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

/**
 * Re-normalise une valeur déjà persistée (sanitize ancien, handle seul derrière https://).
 * Ne jamais effacer une URL sans remplacement valide.
 */
export function remigrateSocialField(
  field: SocialField,
  stored: string,
): NormalizeSocialResult {
  const trimmed = stored.trim();
  if (!trimmed) return { ok: true, url: null };

  const attempts: NormalizeSocialResult[] = [
    normalizeSocialField(field, trimmed),
  ];

  const withoutProto = trimmed.replace(/^https?:\/\//i, "").trim();
  if (withoutProto && withoutProto !== trimmed) {
    attempts.push(normalizeSocialField(field, withoutProto));
  }

  const net = SOCIAL_NETWORKS.find((n) => n.field === field);
  if (net && !/^https?:\/\//i.test(trimmed)) {
    attempts.push(normalizeSocialUrl(net.key, trimmed));
  }

  const winner = attempts.find((r) => r.ok && r.url);
  if (winner) return winner;

  const lastOk = attempts.find((r) => r.ok);
  if (lastOk) return lastOk;

  return attempts[0] ?? { ok: false, error: "Impossible de normaliser" };
}
