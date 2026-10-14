import type { CrmContactChannelType } from "@prisma/client";

export const CHANNEL_TYPE_LABELS: Record<CrmContactChannelType, string> = {
  PHONE: "Téléphone",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  AUTRE: "Autre",
};

export const CHANNEL_TYPE_ORDER: CrmContactChannelType[] = [
  "PHONE",
  "EMAIL",
  "WHATSAPP",
  "INSTAGRAM",
  "LINKEDIN",
  "AUTRE",
];

export type ChannelInput = {
  type: CrmContactChannelType;
  value: string;
  isPrimary: boolean;
};

/** Normalize for duplicate search / storage. */
export function normalizeChannelValue(
  type: CrmContactChannelType,
  value: string,
): string {
  const raw = value.trim();
  if (!raw) return "";
  if (type === "EMAIL") return raw.toLowerCase();
  if (type === "PHONE" || type === "WHATSAPP") {
    return raw.replace(/[^\d+]/g, "");
  }
  return raw.toLowerCase();
}

/** Digits-only for loose phone match (ignore + and leading 0 variants loosely). */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function mirrorPhoneEmail(channels: ChannelInput[]): {
  phone: string | null;
  email: string | null;
} {
  const primary = channels.find((c) => c.isPrimary) ?? channels[0];
  let phone: string | null = null;
  let email: string | null = null;
  for (const c of channels) {
    if (!c.value.trim()) continue;
    if (c.type === "EMAIL" && !email) email = c.value.trim();
    if ((c.type === "PHONE" || c.type === "WHATSAPP") && !phone) {
      phone = c.value.trim();
    }
  }
  if (primary?.type === "EMAIL") email = primary.value.trim() || email;
  if (primary?.type === "PHONE" || primary?.type === "WHATSAPP") {
    phone = primary.value.trim() || phone;
  }
  return { phone, email };
}

export function parseChannelsJson(raw: string): ChannelInput[] | null {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: ChannelInput[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const type = (row as { type?: string }).type;
      const value = String((row as { value?: unknown }).value ?? "").trim();
      const isPrimary = Boolean((row as { isPrimary?: unknown }).isPrimary);
      if (
        !type ||
        !CHANNEL_TYPE_ORDER.includes(type as CrmContactChannelType)
      ) {
        continue;
      }
      if (!value) continue;
      out.push({
        type: type as CrmContactChannelType,
        value,
        isPrimary,
      });
    }
    return out;
  } catch {
    return null;
  }
}

export function validateChannels(
  channels: ChannelInput[],
): string | null {
  if (channels.length < 1) {
    return "Au moins un moyen de contact est obligatoire.";
  }
  const primaries = channels.filter((c) => c.isPrimary);
  if (primaries.length !== 1) {
    return "Indiquez exactement un moyen de contact principal.";
  }
  for (const c of channels) {
    if (c.type === "EMAIL") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value.trim())) {
        return "Adresse e-mail invalide.";
      }
    }
    if (
      (c.type === "PHONE" || c.type === "WHATSAPP") &&
      phoneDigits(c.value).length < 6
    ) {
      return "Numéro trop court.";
    }
  }
  return null;
}
