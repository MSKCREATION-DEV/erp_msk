"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Pending fiable pour mutations async.
 * Ne pas utiliser `startTransition(async () => …)` : isPending se termine
 * avant la Promise → bouton / UI figés ou trompeurs.
 */
export function usePendingAction() {
  const [pending, setPending] = useState(false);
  const lock = useRef(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      await fn();
    } catch {
      // L’appelant gère l’erreur UI ; on évite un « Uncaught (in promise) »
      // si run() est fire-and-forget (void run(...)).
    } finally {
      lock.current = false;
      setPending(false);
    }
  }, []);

  return { pending, run } as const;
}
