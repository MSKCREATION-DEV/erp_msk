import { existsSync } from "node:fs";
import path from "node:path";

/** Vérifie qu’une capture existe sous `public/` (Server Components uniquement). */
export function guideShotExists(src: string): boolean {
  if (!src.startsWith("/")) return false;
  return existsSync(
    path.join(process.cwd(), "public", src.replace(/^\//, "")),
  );
}
