/**
 * Tokens MSK CREATION — Charte graphique v3 (25 sept. 2026)
 *
 * Assets livrés en repo : SVG dans `public/brand/`.
 * Les PNG lockup haute-rés (sources charte) peuvent être ajoutés plus tard
 * sans casser le shell — le Logo bascule sur le SVG / MskMark.
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

/** Chemins publics — uniquement des fichiers présents (évite 404 bloquants). */
export const assets = {
  bloc: { src: "/brand/logo-white.svg", width: 320, height: 72 },
  lockup: { src: "/brand/logo-white.svg", width: 320, height: 72 },
  lockupWhite: { src: "/brand/logo-white.svg", width: 320, height: 72 },
  stacked: { src: "/brand/logo-white.svg", width: 320, height: 72 },
  short: { src: "/brand/logo-white.svg", width: 320, height: 72 },
  mark: { src: "/brand/mark-white.svg", width: 64, height: 64 },
  markOnBlue: { src: "/brand/mark-white.svg", width: 64, height: 64 },
  markOnInk: { src: "/brand/mark-white.svg", width: 64, height: 64 },
} as const;

export type LogoVariant = "bloc" | "intercale" | "stacked" | "short" | "mark";
export type LogoTone = "color" | "white";
