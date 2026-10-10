import Link from "next/link";
import { cn } from "@/lib/utils";
import { brand, type LogoVariant } from "@/lib/brand";
import { MskMark } from "./msk-mark";

const HEIGHT_PX = {
  mark: 28,
  sm: 32,
  md: 40,
} as const;

type LogoProps = {
  variant?: LogoVariant;
  size?: keyof typeof HEIGHT_PX;
  tone?: "color" | "white";
  href?: string | null;
  className?: string;
  /** Conservé pour API — le mark SVG local n’a pas besoin de priority Image. */
  priority?: boolean;
  alt?: string;
};

/**
 * Logo shell : MskMark SVG inline (0 requête réseau) + mot « MSK ».
 * Évite les PNG manquants qui freinaient chaque navigation du layout.
 */
export function Logo({
  variant = "bloc",
  size = "sm",
  tone = "color",
  href = "/accueil",
  className,
  alt = brand.name,
}: LogoProps) {
  const heightPx = HEIGHT_PX[variant === "mark" ? "mark" : size];
  const markColor = tone === "white" ? "text-white" : "text-msk-blue";
  const textColor = tone === "white" ? "text-white" : "text-msk-ink";

  const content = (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      title={alt}
    >
      <MskMark
        className={cn("w-auto shrink-0", markColor)}
        style={{ height: heightPx }}
        title={alt}
      />
      {variant !== "mark" ? (
        <span
          className={cn(
            "text-[15px] font-semibold tracking-tight",
            textColor,
          )}
        >
          {brand.shortName}
        </span>
      ) : null}
    </span>
  );

  if (href === null) {
    return content;
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex shrink-0 cursor-pointer items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40"
      aria-label={brand.name}
    >
      {content}
    </Link>
  );
}
