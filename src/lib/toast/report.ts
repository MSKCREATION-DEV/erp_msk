"use client";

import { notify } from "@/lib/toast/notify";

const DEFAULT_ERROR = "Une erreur est survenue.";
const DEFAULT_SUCCESS = "Enregistré.";

/**
 * Toast error + optionnellement met à jour l’état inline (conservé).
 * Retourne le message affiché.
 */
export function reportActionError(
  error: string | null | undefined,
  setError?: (msg: string | null) => void,
  fallback: string = DEFAULT_ERROR,
): string {
  const msg = (error?.trim() || fallback).trim() || DEFAULT_ERROR;
  notify.error(msg);
  setError?.(msg);
  return msg;
}

/** Toast success standard (édition / action sans redirect). */
export function reportActionSuccess(
  message: string = DEFAULT_SUCCESS,
  opts?: { toastId?: string },
): void {
  const msg = message.trim() || DEFAULT_SUCCESS;
  notify.success(msg, opts?.toastId ? { toastId: opts.toastId } : undefined);
}

/**
 * Si `res.ok === false` → toast + setError, retourne true (échec).
 * Si ok / null (redirect en cours) → false.
 * (Pas de type predicate : `ActionResult` utilise souvent `ok: boolean`.)
 */
export function failAction(
  res: { ok: boolean; error?: string | null } | null | undefined,
  setError?: (msg: string | null) => void,
  fallback: string = DEFAULT_ERROR,
): boolean {
  if (!res || res.ok !== false) return false;
  reportActionError(res.error, setError, fallback);
  return true;
}
