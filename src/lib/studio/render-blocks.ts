/**
 * Studio documentaire — moteur de rendu PDF des gabarits `ENGINE_BLOCKS`.
 * Réutilise les primitives pdf-lib charte MSK déjà éprouvées par les
 * générateurs RH (`src/lib/pdf/rh.ts`) — même en-tête / pied de page / police
 * / couleurs, pas de nouvelle mise en page parallèle.
 */
import {
  BLUE,
  createCtx,
  draw,
  drawFooter,
  drawHeader,
  type DrawHeaderOptions,
  drawParagraph,
  drawSignatureBlock,
  drawTitle,
  ensureSpace,
  LIGHT,
  MARGIN,
} from "@/lib/pdf/rh";
import { resolveTemplateString } from "@/lib/studio/variables";
import type { TemplateBlock } from "@/lib/studio/types";

export type RenderBlocksOptions = {
  /** Titre affiché dans l’en-tête (ex. nom du gabarit). */
  title: string;
  /** Contexte de résolution des variables `{{slug}}`. */
  context: Record<string, unknown>;
  /** `true` en génération officielle (erreur si variable obligatoire manquante). */
  strictVariables: boolean;
  /** Reflète `DocumentTemplate.signatureEnabled` — bloc signature ignoré si `false`. */
  signatureEnabled: boolean;
  signaturePng?: Uint8Array | Buffer;
  signatureLabel?: string;
  logoAlign?: DrawHeaderOptions["logoAlign"];
};

function drawHighlight(ctx: Awaited<ReturnType<typeof createCtx>>, text: string) {
  const lines = text.match(/.{1,95}(\s|$)/g) ?? [text];
  const height = 10 + lines.length * 13;
  ensureSpace(ctx, height + 12);
  ctx.y -= 4;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - height + 10,
    width: ctx.width - MARGIN * 2,
    height,
    color: LIGHT,
  });
  let y = ctx.y;
  for (const line of lines) {
    draw(ctx.page, line.trim(), {
      x: MARGIN + 10,
      y: y - 10,
      size: 9,
      font: ctx.fontBold,
      color: BLUE,
    });
    y -= 13;
  }
  ctx.y -= height + 4;
}

/**
 * Rend une liste de blocs (gabarit publié) en PDF. Lève `MissingVariableError`
 * (via `resolveTemplateString`) si `strictVariables` et qu’un slug obligatoire
 * est absent — jamais de document officiel avec un trou silencieux.
 */
export async function renderBlocksToPdf(
  blocks: TemplateBlock[],
  opts: RenderBlocksOptions,
): Promise<Uint8Array> {
  const ctx = await createCtx();
  await drawHeader(ctx, opts.title.toUpperCase(), {
    logoAlign: opts.logoAlign,
  });

  const resolve = (text: string) =>
    resolveTemplateString(text, opts.context, { strict: opts.strictVariables });

  for (const block of blocks) {
    switch (block.kind) {
      case "heading":
        drawTitle(ctx, resolve(block.text));
        break;
      case "paragraph":
        drawParagraph(ctx, resolve(block.text));
        break;
      case "highlight":
        drawHighlight(ctx, resolve(block.text));
        break;
      case "spacer":
        ctx.y -= 10;
        break;
      case "signature":
        if (opts.signatureEnabled) {
          await drawSignatureBlock(
            ctx,
            resolve(block.leftLabel),
            resolve(block.rightLabel),
            opts.signaturePng,
            opts.signatureLabel,
          );
        }
        break;
      case "composite":
        break;
      default:
        break;
    }
  }

  drawFooter(ctx);
  return ctx.pdf.save();
}
