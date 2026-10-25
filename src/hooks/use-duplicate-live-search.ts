"use client";

import { useEffect, useRef, useState } from "react";

export type LiveSearchStatus = "idle" | "pending" | "ok" | "error";

/**
 * Recherche live debounce + anti-course (séquence).
 * Les Server Actions ne s’annulent pas côté serveur : on ignore les réponses périmées.
 * Au changement de saisie : résultats précédents effacés immédiatement (pas de stale UI).
 */
export function useDuplicateLiveSearch<T>({
  queryKey,
  enabled,
  debounceMs = 320,
  search,
}: {
  /** Clé sérialisée de la saisie (change → relance). */
  queryKey: string;
  enabled: boolean;
  debounceMs?: number;
  search: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>;
}): {
  status: LiveSearchStatus;
  data: T | null;
  error: string | null;
  /** Relance immédiate (ex. après erreur). */
  refresh: () => void;
} {
  const [status, setStatus] = useState<LiveSearchStatus>("idle");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (!enabled) {
      seq.current += 1;
      setStatus("idle");
      setData(null);
      setError(null);
      return;
    }

    const mySeq = ++seq.current;
    // Nouvelle saisie : ne pas laisser d’anciennes cards actives
    setData(null);
    setError(null);
    setStatus("idle");

    const timer = window.setTimeout(() => {
      if (mySeq !== seq.current) return;
      setStatus("pending");
      void (async () => {
        try {
          const res = await search();
          if (mySeq !== seq.current) return;
          if (!res.ok) {
            setData(null);
            setError(res.error);
            setStatus("error");
            return;
          }
          setData(res.data);
          setError(null);
          setStatus("ok");
        } catch {
          if (mySeq !== seq.current) return;
          setData(null);
          setError("Vérification impossible. Réessayez.");
          setStatus("error");
        }
      })();
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
    };
    // search volontairement exclu : queryKey porte les entrées
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryKey + tick pilotent
  }, [queryKey, enabled, debounceMs, tick]);

  return {
    status,
    data,
    error,
    refresh: () => setTick((n) => n + 1),
  };
}
