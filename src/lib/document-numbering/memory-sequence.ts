import { formatOfficialNumber } from "./format";
import type { DocNumberKind } from "./kinds";

/**
 * Séquence en mémoire pour tests de concurrence / logique.
 * Production = allocateOfficialNumber (Prisma + SELECT FOR UPDATE).
 */
export class MemoryDocSequence {
  private readonly map = new Map<string, number>();
  private readonly locks = new Map<string, Promise<void>>();

  private key(kind: DocNumberKind, periodKey: string) {
    return `${kind}:${periodKey}`;
  }

  /** Mutex simple par clé pour simuler l’atomicité DB. */
  private async withLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    this.locks.set(
      key,
      prev.then(() => gate),
    );
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  async next(kind: DocNumberKind, periodKey: string): Promise<string> {
    const k = this.key(kind, periodKey);
    return this.withLock(k, () => {
      const current = this.map.get(k) ?? 0;
      const next = current + 1;
      this.map.set(k, next);
      return formatOfficialNumber({ kind, periodKey, sequence: next });
    });
  }
}
