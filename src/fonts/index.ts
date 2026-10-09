import localFont from "next/font/local";

/**
 * Typographie MSK CREATION
 * - Jost : texte, UI, boutons, chiffres
 * - Bricolage Grotesque ExtraBold : impact (hero / titres forts)
 * - Instrument Serif Italic : accent (un mot par titre, en bleu)
 */

export const jost = localFont({
  src: [
    { path: "./jost/Jost-Light.ttf", weight: "300", style: "normal" },
    { path: "./jost/Jost-Book.ttf", weight: "400", style: "normal" },
    { path: "./jost/Jost-Medium.ttf", weight: "500", style: "normal" },
    { path: "./jost/Jost-Semi.ttf", weight: "600", style: "normal" },
    { path: "./jost/Jost-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-jost",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

/** Variable font — ExtraBold (800) pour l'impact */
export const bricolage = localFont({
  src: "./bricolage/BricolageGrotesque.ttf",
  variable: "--font-bricolage",
  display: "swap",
  weight: "200 800",
  fallback: ["system-ui", "sans-serif"],
});

export const instrumentSerif = localFont({
  src: [
    {
      path: "./instrument-serif/InstrumentSerif-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./instrument-serif/InstrumentSerif-Italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-instrument",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

/** Classes CSS variables à appliquer sur <html> */
export const fontVariables = `${jost.variable} ${bricolage.variable} ${instrumentSerif.variable}`;
