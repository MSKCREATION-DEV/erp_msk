import { getActiveCssBrandTokens } from "@/lib/brand/config";

/**
 * Injecte les tokens couleur actifs (DB) sur `:root` pour sync design system runtime.
 * Les valeurs seed = charte v3 ; modification admin → CSS sans rebuild.
 */
export async function BrandCssVars() {
  let tokens: Record<string, string> = {};
  try {
    tokens = await getActiveCssBrandTokens();
  } catch {
    return null;
  }
  const entries = Object.entries(tokens);
  if (!entries.length) return null;

  const css = entries
    .map(([key, hex]) => `--color-${key}: ${hex};`)
    .join("\n  ");

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root {\n  ${css}\n}`,
      }}
    />
  );
}
