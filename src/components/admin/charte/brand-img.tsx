import { cn } from "@/lib/utils";

/** Aperçu brand — `<img>` natif (signed URL Storage + SVG public, sans remotePatterns). */
export function BrandImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase + SVG brand
    <img src={src} alt={alt} className={cn("object-contain", className)} />
  );
}
