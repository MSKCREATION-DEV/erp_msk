"use client";

import { useEffect, useRef, useState } from "react";

export type LiveSearchStatus = "idle" | "pending" | "ok" | "error";

/**
 * Recherche live debounce + anti-course (séquence).
 * Les Server Actions ne s’annulent pas côté serveur : on ignore les réponses périmées.
 * Feedback immédiat « pending » dès le déclenchement (dès 3 car.), puis debounce avant l’appel.
 */
export function useDuplicateLiveSearch<T>({
  queryKey,
  enabled,
  debounceMs = 280,
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
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    if (!enabled) {
      seq.current += 1;
      setStatus("idle");
      setData(null);
      setError(null);
      return;
    }

    const mySeq = ++seq.current;
    // Feedback immédiat dès la 3ᵉ lettre (pas d’attente silencieuse)
    setData(null);
    setError(null);
    setStatus("pending");

    const timer = window.setTimeout(() => {
      if (mySeq !== seq.current) return;
      void (async () => {
        try {
          const res = await searchRef.current();
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
  }, [queryKey, enabled, debounceMs, tick]);

  return {
    status,
    data,
    error,
    refresh: () => setTick((n) => n + 1),
  };
}
