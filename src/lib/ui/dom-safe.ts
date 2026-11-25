/**
 * Helpers anti-removeChild (extensions autofill / Brave / gestionnaires MDP).
 * Voir `.cursor/rules/react-removechild-dom.mdc`.
 */

/** True si l’erreur est la désync DOM React classique. */
export function isRemoveChildDomError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error);
  return (
    /removeChild/i.test(msg) ||
    /not a child of this node/i.test(msg) ||
    /The node to be removed is not a child/i.test(msg)
  );
}

/** Quitte le focus avant un unmount / hide d’étape (autofill lâche le nœud). */
export function blurActiveElement(): void {
  if (typeof document === "undefined") return;
  const el = document.activeElement;
  if (el instanceof HTMLElement && typeof el.blur === "function") {
    el.blur();
  }
}

/**
 * Enchaîne blur → double rAF puis callback.
 * Laisse le navigateur / extensions finir de toucher le DOM avant
 * que React cache une étape (date/time, file, modal).
 */
export function afterDomSettled(fn: () => void): void {
  blurActiveElement();
  if (typeof requestAnimationFrame !== "function") {
    fn();
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}
