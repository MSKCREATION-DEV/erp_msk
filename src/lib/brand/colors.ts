import { HEX_COLOR_RE } from "@/lib/brand/constants";

export type Rgb = { r: number; g: number; b: number; a?: number };
export type Hsl = { h: number; s: number; l: number; a?: number };

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function expandShortHex(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

/** Normalise vers `#RRGGBB` (ignore alpha si présent). */
export function normalizeHex(input: string): string | null {
  const raw = input.trim();
  if (!HEX_COLOR_RE.test(raw)) return null;
  const expanded = expandShortHex(raw.toUpperCase());
  if (expanded.length === 9) return expanded.slice(0, 7);
  return expanded;
}

export function hexToRgb(hex: string): Rgb | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => clampByte(v).toString(16).padStart(2, "0").toUpperCase();
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const R = clampByte(r) / 255;
  const G = clampByte(g) / 255;
  const B = clampByte(b) / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case R:
      h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
      break;
    case G:
      h = ((B - R) / d + 2) / 6;
      break;
    default:
      h = ((R - G) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 1000) / 10, l: Math.round(l * 1000) / 10 };
}

function hue2rgb(p: number, q: number, t: number) {
  let T = t;
  if (T < 0) T += 1;
  if (T > 1) T -= 1;
  if (T < 1 / 6) return p + (q - p) * 6 * T;
  if (T < 1 / 2) return q;
  if (T < 2 / 3) return p + (q - p) * (2 / 3 - T) * 6;
  return p;
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const H = ((h % 360) + 360) % 360 / 360;
  const S = Math.max(0, Math.min(100, s)) / 100;
  const L = Math.max(0, Math.min(100, l)) / 100;
  if (S === 0) {
    const v = clampByte(L * 255);
    return { r: v, g: v, b: v };
  }
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
  const p = 2 * L - q;
  return {
    r: clampByte(hue2rgb(p, q, H + 1 / 3) * 255),
    g: clampByte(hue2rgb(p, q, H) * 255),
    b: clampByte(hue2rgb(p, q, H - 1 / 3) * 255),
  };
}

export function parseColorInput(input: string): { hex: string; rgb: Rgb; hsl: Hsl } | null {
  const trimmed = input.trim();
  const hex = normalizeHex(trimmed);
  if (hex) {
    const rgb = hexToRgb(hex)!;
    return { hex, rgb, hsl: rgbToHsl(rgb.r, rgb.g, rgb.b) };
  }
  const rgba =
    /^rgb(?:a)?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([0-9.]+)\s*)?\)$/i.exec(
      trimmed,
    );
  if (rgba) {
    const r = Number(rgba[1]);
    const g = Number(rgba[2]);
    const b = Number(rgba[3]);
    if ([r, g, b].some((v) => v > 255)) return null;
    const h = rgbToHex(r, g, b);
    return { hex: h, rgb: { r, g, b }, hsl: rgbToHsl(r, g, b) };
  }
  const hsl =
    /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*([0-9.]+)\s*)?\)$/i.exec(
      trimmed,
    );
  if (hsl) {
    const h = Number(hsl[1]);
    const s = Number(hsl[2]);
    const l = Number(hsl[3]);
    if (h > 360 || s > 100 || l > 100) return null;
    const rgb = hslToRgb(h, s, l);
    return { hex: rgbToHex(rgb.r, rgb.g, rgb.b), rgb, hsl: { h, s, l } };
  }
  return null;
}

/** Luminance relative WCAG (sRGB). */
export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const lin = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

export function contrastRatio(fgHex: string, bgHex: string): number | null {
  const L1 = relativeLuminance(fgHex);
  const L2 = relativeLuminance(bgHex);
  if (L1 == null || L2 == null) return null;
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function wcagLevel(
  ratio: number,
  opts?: { largeText?: boolean },
): "AAA" | "AA" | "fail" {
  const aa = opts?.largeText ? 3 : 4.5;
  const aaa = opts?.largeText ? 4.5 : 7;
  if (ratio >= aaa) return "AAA";
  if (ratio >= aa) return "AA";
  return "fail";
}

export function slugifyTokenKey(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
