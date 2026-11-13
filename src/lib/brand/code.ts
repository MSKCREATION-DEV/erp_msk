import { slugifyTokenKey } from "@/lib/brand/colors";

/** Code unique stable (slug + suffixe court si collision). */
export function makeBrandCode(label: string, suffix?: string): string {
  const base = slugifyTokenKey(label) || "asset";
  if (!suffix) return base;
  return `${base}-${suffix}`.slice(0, 64);
}

export function safeStorageFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

export function extForMime(mime: string): string {
  switch (mime) {
    case "image/svg+xml":
      return "svg";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "font/woff2":
    case "application/font-woff2":
      return "woff2";
    case "font/woff":
    case "application/font-woff":
      return "woff";
    case "font/ttf":
    case "application/x-font-ttf":
      return "ttf";
    case "font/otf":
    case "application/x-font-otf":
      return "otf";
    default:
      return "bin";
  }
}
