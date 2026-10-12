/**
 * Schémas d’options par famille d’offre catalogue (config JSON sur lien prospect↔offre).
 */
export type OfferOptionField =
  | {
      key: string;
      label: string;
      type: "multi";
      options: { value: string; label: string }[];
    }
  | {
      key: string;
      label: string;
      type: "single";
      options: { value: string; label: string }[];
    }
  | {
      key: string;
      label: string;
      type: "toggle";
    };

export type OfferOptionSchema = {
  fields: OfferOptionField[];
};

const NETWORKS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "snapchat", label: "Snapchat" },
];

export const SCHEMA_RS: OfferOptionSchema = {
  fields: [
    {
      key: "networks",
      label: "Réseaux sociaux",
      type: "multi",
      options: NETWORKS,
    },
  ],
};

export const SCHEMA_WEB: OfferOptionSchema = {
  fields: [
    {
      key: "siteType",
      label: "Type de site",
      type: "single",
      options: [
        { value: "vitrine", label: "Vitrine" },
        { value: "sur_mesure", label: "Sur-mesure" },
        { value: "refonte", label: "Refonte" },
      ],
    },
    {
      key: "blog",
      label: "Blog / actualités",
      type: "toggle",
    },
    {
      key: "multilang",
      label: "Multilingue",
      type: "toggle",
    },
  ],
};

export const SCHEMA_ECOM: OfferOptionSchema = {
  fields: [
    {
      key: "paymentIncluded",
      label: "Paiement en ligne inclus",
      type: "toggle",
    },
    {
      key: "deliveryManaged",
      label: "Gestion livraison",
      type: "toggle",
    },
    {
      key: "inventory",
      label: "Stock / catalogue produits",
      type: "toggle",
    },
  ],
};

/** Map SKU prefix / code → schéma. */
export function schemaForSku(sku: string): OfferOptionSchema | null {
  const s = sku.toUpperCase();
  if (s.startsWith("CNT-RS") || s.includes("-RS-")) return SCHEMA_RS;
  if (s.includes("ECOM") || s.includes("BOUTIQUE")) return SCHEMA_ECOM;
  if (s.startsWith("WEB") || s.includes("SITE")) return SCHEMA_WEB;
  return null;
}

export function summarizeConfig(
  schema: OfferOptionSchema | null,
  config: Record<string, unknown> | null | undefined,
): string {
  if (!schema || !config) return "";
  const parts: string[] = [];
  for (const f of schema.fields) {
    const v = config[f.key];
    if (f.type === "multi" && Array.isArray(v) && v.length) {
      const labels = f.options
        .filter((o) => (v as string[]).includes(o.value))
        .map((o) => o.label);
      if (labels.length) parts.push(labels.join(", "));
    } else if (f.type === "single" && typeof v === "string") {
      const lab = f.options.find((o) => o.value === v)?.label;
      if (lab) parts.push(lab);
    } else if (f.type === "toggle" && v === true) {
      parts.push(f.label);
    }
  }
  return parts.join(" · ");
}
