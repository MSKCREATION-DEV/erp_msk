"use client";

import { useEffect, useRef } from "react";
import { notify } from "@/lib/toast/notify";

type ActionStateLike =
  | { ok: boolean; error?: string | null }
  | null
  | undefined;

/**
 * Pour `useActionState` : toast error quand l’état passe à `{ ok: false }`.
 * Le message inline (state.error) reste affiché par le formulaire.
 * `toastId` évite les doublons Strict Mode / re-render.
 */
export function useActionStateToast(state: ActionStateLike): void {
  const seen = useRef<WeakSet<object>>(new WeakSet());

  useEffect(() => {
    if (!state || state.ok !== false) return;
    if (typeof state === "object" && seen.current.has(state)) return;
    if (typeof state === "object") seen.current.add(state);

    const msg = (state.error?.trim() || "Une erreur est survenue.").trim();
    notify.error(msg, { toastId: `action-error:${msg}` });
  }, [state]);
}
