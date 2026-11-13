/**
 * Sanitisation SVG défensive — stockage uniquement.
 * Affichage UI : toujours via `<img>` / signed URL, jamais innerHTML.
 */
const BLOCKED_TAGS =
  /\b(script|foreignObject|iframe|object|embed|link|meta|base|use)\b/i;

export function sanitizeSvg(raw: string): string {
  let out = raw.replace(/^\uFEFF/, "");
  // Declarations XML / DOCTYPE externes
  out = out.replace(/<!DOCTYPE[^>]*>/gi, "");
  out = out.replace(/<\?xml[^>]*\?>/gi, "");
  // Scripts & event handlers
  out = out.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/javascript\s*:/gi, "");
  out = out.replace(/data\s*:\s*text\/html/gi, "");
  // Balises dangereuses restantes (self-closing ou ouvertes)
  out = out.replace(
    /<\/?(script|foreignObject|iframe|object|embed|link|meta|base)\b[^>]*>/gi,
    "",
  );
  // xlink:href / href vers javascript
  out = out.replace(
    /\s(xlink:)?href\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi,
    "",
  );
  if (BLOCKED_TAGS.test(out) && /<(script|foreignObject|iframe)/i.test(out)) {
    throw new Error("SVG rejeté : contenu non autorisé");
  }
  if (!/<svg[\s>]/i.test(out)) {
    throw new Error("Fichier SVG invalide");
  }
  return out.trim();
}

export function isSvgMime(mime: string) {
  return mime === "image/svg+xml" || mime.endsWith("+xml");
}
