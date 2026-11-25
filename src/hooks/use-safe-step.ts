"use client";

import { useCallback, useState } from "react";
import { afterDomSettled } from "@/lib/ui/dom-safe";

/**
 * Index d’étape stepper qui change **après** blur + settle DOM.
 * Évite NotFoundError removeChild quand on cache date/time/file focusés
 * (extensions autofill).
 */
export function useSafeStep(initial = 0) {
  const [step, setStepRaw] = useState(initial);

  const setStep = useCallback((next: number | ((s: number) => number)) => {
    afterDomSettled(() => {
      setStepRaw((prev) =>
        typeof next === "function" ? next(prev) : next,
      );
    });
  }, []);

  return [step, setStep] as const;
}
