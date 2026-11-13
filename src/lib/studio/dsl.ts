/**
 * Studio documentaire — DSL texte ↔ blocs pour l’éditeur de contenu
 * `ENGINE_BLOCKS` (Phase 1 : éditeur simple « 1 champ », pas encore le
 * Playground 3 zones visé à terme — voir dette dans l’audit).
 *
 * Syntaxe (une intention par ligne, proche Markdown) :
 *   # Titre                → bloc heading
 *   > Texte en évidence    → bloc highlight (lignes `>` consécutives fusionnées)
 *   ---                    → bloc spacer
 *   [[SIGNATURE: Gauche | Droite]] → bloc signature (ignoré si signature OFF)
 *   [[COMPOSITE: commercial_devis]] → section tableau (générateur historique)
 *   (ligne(s) normales)    → bloc paragraph (lignes consécutives fusionnées,
 *                             séparées par un saut de ligne vide)
 */
import { isCompositeRenderer } from "@/lib/studio/composite";
import { type TemplateBlock } from "@/lib/studio/types";

const SIGNATURE_RE = /^\[\[SIGNATURE:\s*(.+?)\s*\|\s*(.+?)\s*\]\]$/;
const COMPOSITE_RE = /^\[\[COMPOSITE:\s*([a-z0-9_]+)\s*\]\]$/i;

export function textToBlocks(source: string): TemplateBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: TemplateBlock[] = [];
  let paragraphBuffer: string[] = [];
  let highlightBuffer: string[] = [];

  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraphBuffer.join(" ").trim() });
      paragraphBuffer = [];
    }
  }
  function flushHighlight() {
    if (highlightBuffer.length > 0) {
      blocks.push({ kind: "highlight", text: highlightBuffer.join(" ").trim() });
      highlightBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("> ") || line === ">") {
      flushParagraph();
      highlightBuffer.push(line.replace(/^>\s?/, ""));
      continue;
    }
    flushHighlight();

    if (line === "") {
      flushParagraph();
      continue;
    }
    if (line === "---") {
      flushParagraph();
      blocks.push({ kind: "spacer" });
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      blocks.push({ kind: "heading", text: line.slice(2).trim() });
      continue;
    }
    const sigMatch = SIGNATURE_RE.exec(line);
    if (sigMatch) {
      flushParagraph();
      blocks.push({
        kind: "signature",
        leftLabel: sigMatch[1],
        rightLabel: sigMatch[2],
      });
      continue;
    }
    const compositeMatch = COMPOSITE_RE.exec(line);
    if (compositeMatch) {
      flushParagraph();
      const renderer = compositeMatch[1].toLowerCase();
      if (isCompositeRenderer(renderer)) {
        blocks.push({ kind: "composite", renderer });
      }
      continue;
    }
    paragraphBuffer.push(line);
  }
  flushParagraph();
  flushHighlight();

  return blocks.filter((b) => {
    if (b.kind === "paragraph" || b.kind === "heading" || b.kind === "highlight") {
      return b.text.trim().length > 0;
    }
    return true;
  });
}

/** Inverse de `textToBlocks` — utilisé pour pré-remplir l’éditeur en édition. */
export function blocksToText(blocks: TemplateBlock[]): string {
  const lines: string[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case "heading":
        lines.push(`# ${b.text}`);
        break;
      case "paragraph":
        lines.push(b.text);
        break;
      case "highlight":
        lines.push(`> ${b.text}`);
        break;
      case "spacer":
        lines.push("---");
        break;
      case "signature":
        lines.push(`[[SIGNATURE: ${b.leftLabel} | ${b.rightLabel}]]`);
        break;
      case "composite":
        lines.push(`[[COMPOSITE: ${b.renderer}]]`);
        break;
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
