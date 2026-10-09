import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { assets, brand, type LogoVariant } from "@/lib/brand";
import { MskMark } from "./msk-mark";

const HEIGHT_PX = {
  mark: 16,
  sm: 40,
  md: 40,
} as const;

type LogoProps = {
  variant?: LogoVariant;
  size?: keyof typeof HEIGHT_PX;
  tone?: "color" | "white";
  href?: string | null;
  className?: string;
  priority?: boolean;
  alt?: string;
};

function resolveAsset(
  variant: Exclude<LogoVariant, "mark">,
  tone: "color" | "white",
) {
  if (tone === "white") return assets.lockupWhite;
  if (variant === "stacked") return assets.stacked;
  if (variant === "intercale") return assets.lockup;
  return assets.bloc;
}

export function Logo({
  variant = "bloc",
  size = "sm",
  tone = "color",
  href = "/accueil",
  className,
  priority = false,
  alt = brand.name,
}: LogoProps) {
  const heightPx = HEIGHT_PX[variant === "mark" ? "mark" : size];

  const content =
    variant === "mark" ? (
      <MskMark
        className={cn(
          "w-auto",
          tone === "white" ? "text-white" : "text-msk-blue",
          className,
        )}
        style={{ height: heightPx }}
        title={alt}
      />
    ) : (
      (() => {
        const asset = resolveAsset(variant, tone);
        const widthPx = Math.round((asset.width / asset.height) * heightPx);
        return (
          <Image
            src={asset.src}
            alt={alt}
            width={asset.width}
            height={asset.height}
            priority={priority}
            unoptimized
            className="object-contain object-left"
            style={{ height: heightPx, width: widthPx, maxWidth: "100%" }}
          />
        );
      })()
    );

  if (href === null) {
    return (
      <span className={cn("inline-flex shrink-0 items-center", className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40",
        className,
      )}
      aria-label={brand.name}
    >
      {content}
    </Link>
  );
}
