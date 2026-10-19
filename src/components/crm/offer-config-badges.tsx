import type { ReactNode } from "react";
import { Check, Globe2, Languages, Newspaper } from "lucide-react";
import { NetworkChannelIcon } from "@/components/brand/channel-icons";
import {
  schemaForSku,
  type OfferOptionSchema,
} from "@/lib/crm/offer-option-schemas";
import { cn } from "@/lib/utils";

function ConfigBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-msk-ink/10 bg-white px-2.5 py-1 text-xs font-medium text-msk-ink shadow-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

function badgesFromConfig(
  schema: OfferOptionSchema,
  config: Record<string, unknown>,
): ReactNode[] {
  const out: ReactNode[] = [];

  for (const field of schema.fields) {
    const v = config[field.key];

    if (field.type === "multi" && Array.isArray(v)) {
      for (const raw of v as string[]) {
        const opt = field.options.find((o) => o.value === raw);
        const label = opt?.label ?? raw;
        const isNetwork = field.key === "networks";
        out.push(
          <ConfigBadge key={`${field.key}-${raw}`}>
            {isNetwork ? (
              <NetworkChannelIcon network={raw} className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3 w-3 text-msk-blue" aria-hidden />
            )}
            {label}
          </ConfigBadge>,
        );
      }
    }

    if (field.type === "single" && typeof v === "string" && v) {
      const opt = field.options.find((o) => o.value === v);
      out.push(
        <ConfigBadge key={`${field.key}-${v}`}>
          <Globe2 className="h-3.5 w-3.5 text-msk-blue" aria-hidden />
          {field.label} · {opt?.label ?? v}
        </ConfigBadge>,
      );
    }

    if (field.type === "toggle" && v === true) {
      const Icon =
        field.key === "blog"
          ? Newspaper
          : field.key === "multilang"
            ? Languages
            : Check;
      out.push(
        <ConfigBadge
          key={field.key}
          className="border-msk-blue/20 bg-msk-blue/6 text-msk-blue"
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {field.label}
        </ConfigBadge>,
      );
    }
  }

  return out;
}

/** Badges option / réseaux pour une offre liée (fiche prospect). */
export function OfferConfigBadges({
  sku,
  config,
  className,
}: {
  sku: string;
  config: Record<string, unknown> | null | undefined;
  className?: string;
}) {
  const schema = schemaForSku(sku);
  if (!schema || !config) return null;
  const badges = badgesFromConfig(schema, config);
  if (badges.length === 0) return null;

  return (
    <div className={cn("mt-2.5 flex flex-wrap gap-1.5", className)}>
      {badges}
    </div>
  );
}
