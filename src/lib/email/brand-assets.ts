import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Content-IDs Resend — référencés en HTML via `cid:…`
 * (indépendant de Vercel Protection / localhost).
 *
 * | CID           | Fichier              | Usage template      |
 * |---------------|----------------------|---------------------|
 * | msk-lockup    | lockup-white.png     | Bandeau identité    |
 * | msk-mark      | mark-on-ink.png      | Signature footer    |
 */
export const EMAIL_CID = {
  lockup: "msk-lockup",
  mark: "msk-mark",
} as const;

function readBrandPng(filename: string) {
  return readFileSync(join(process.cwd(), "public", "brand", filename));
}

/** Pièces jointes inline obligatoires pour tout e-mail brandé MSK. */
export function brandInlineAttachments() {
  return [
    {
      filename: "msk-lockup-white.png",
      content: readBrandPng("lockup-white.png"),
      contentId: EMAIL_CID.lockup,
    },
    {
      filename: "msk-mark-on-ink.png",
      content: readBrandPng("mark-on-ink.png"),
      contentId: EMAIL_CID.mark,
    },
  ];
}
