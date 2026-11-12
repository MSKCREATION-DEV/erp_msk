"use client";

import { useEffect } from "react";
import { notify } from "@/lib/toast/notify";
import {
  FLASH_TOAST_COOKIE,
  type FlashToastPayload,
  type ToastKind,
} from "@/lib/toast/types";
import { parseFlashToastCookie } from "@/lib/toast/parse-flash";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    if (key !== name) continue;
    return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function emitFlash(payload: FlashToastPayload) {
  const kind: ToastKind = payload.type;
  const msg = payload.message;
  switch (kind) {
    case "success":
      notify.success(msg);
      break;
    case "error":
      notify.error(msg);
      break;
    case "warning":
      notify.warning(msg);
      break;
    case "info":
      notify.info(msg);
      break;
  }
}

/**
 * Lit le cookie flash posé avant `redirect()`, émet un toast, efface le cookie.
 * Monté une fois via ToastProvider (root).
 */
export function FlashToastListener() {
  useEffect(() => {
    const raw = readCookie(FLASH_TOAST_COOKIE);
    if (!raw) return;
    const payload = parseFlashToastCookie(raw);
    clearCookie(FLASH_TOAST_COOKIE);
    if (payload) emitFlash(payload);
  }, []);

  return null;
}
