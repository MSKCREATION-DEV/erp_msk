"use client";

import { useCallback, useRef, useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { toUserFacingError } from "@/lib/errors/user-facing";
import { notify } from "@/lib/toast/notify";

/**
 * Pending fiable pour mutations async.
 * Ne pas utiliser `startTransition(async () => …)` : isPending se termine
 * avant la Promise → bouton / UI figés ou trompeurs.
 *
 * Throw non-redirect → toast error (l’appelant peut aussi gérer l’inline).
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
    } catch (e) {
      // redirect() / notFound() — propager (flash toast géré côté action).
      unstable_rethrow(e);
      const facing = toUserFacingError(
        e instanceof Error ? e : new Error("Une erreur est survenue"),
      );
      notify.error(facing.description);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }, []);

  return { pending, run } as const;
}
