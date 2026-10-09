/**
 * Tokens MSK CREATION — Charte graphique v3 (25 sept. 2026)
 */

export const brand = {
  name: "MSK CREATION",
  shortName: "MSK",
  tagline: "Agence de création et de digitalisation",
  url: "https://mskcreation.io",
  social: { instagram: "@mskcreation.io" },
} as const;

export const colors = {
  blue: "#1D73BC",
  gradientFrom: "#2A3D8E",
  gradientTo: "#00ACEE",
  ink: "#0D1330",
  cyan: "#00ACEE",
  vivid: "#1384CB",
  deep: "#284393",
  indigo: "#2A3D8E",
  coral: "#FF5A3C",
  chalk: "#F5F3EF",
  white: "#FFFFFF",
  paper: "#DCE0E8",
  muted: "#8A93A6",
} as const;

export const assets = {
  bloc: { src: "/brand/lockup-bloc.png", width: 998, height: 224 },
  lockup: { src: "/brand/lockup.png", width: 1092, height: 156 },
  lockupWhite: { src: "/brand/lockup-white.png", width: 995, height: 220 },
  stacked: { src: "/brand/lockup-stacked.png", width: 554, height: 312 },
  short: { src: "/brand/lockup-bloc.png", width: 998, height: 224 },
  markOnBlue: { src: "/brand/mark-on-blue.png", width: 616, height: 537 },
  markOnInk: { src: "/brand/mark-on-ink.png", width: 617, height: 536 },
} as const;

export type LogoVariant = "bloc" | "intercale" | "stacked" | "short" | "mark";
export type LogoTone = "color" | "white";
