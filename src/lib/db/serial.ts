/**
 * Runtime Prisma = `connection_limit=1` (voir `src/lib/prisma.ts`).
 * Interdit : `Promise.all([ prisma…, prisma… ])` — saturation pool (P2024).
 * Utiliser ces helpers pour enchaîner les requêtes.
 */

/** Exécute les tâches une par une (ordre conservé). */
export async function mapSeries<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i++) {
    out.push(await fn(items[i]!, i));
  }
  return out;
}

/** Enchaîne des thunks async (ex. plusieurs count Prisma). */
export async function runSeries<T>(fns: (() => Promise<T>)[]): Promise<T[]> {
  const out: T[] = [];
  for (const fn of fns) {
    out.push(await fn());
  }
  return out;
}
