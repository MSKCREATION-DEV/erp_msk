import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clampFlashMessage } from "@/lib/toast/parse-flash";
import {
  FLASH_TOAST_COOKIE,
  FLASH_TOAST_MAX_AGE_SEC,
  type FlashToastPayload,
  type ToastKind,
} from "@/lib/toast/types";

/** Pose le cookie flash (Server Action / Route Handler uniquement). */
export async function setFlashToast(
  type: ToastKind,
  message: string,
): Promise<void> {
  const payload: FlashToastPayload = {
    type,
    message: clampFlashMessage(message),
  };
  if (!payload.message) return;

  const store = await cookies();
  store.set(FLASH_TOAST_COOKIE, JSON.stringify(payload), {
    path: "/",
    maxAge: FLASH_TOAST_MAX_AGE_SEC,
    sameSite: "lax",
    httpOnly: false,
  });
}

/**
 * Flash success puis `redirect()` (hors try/catch appelant).
 * @see https://nextjs.org/docs/app/guides/redirecting
 */
export async function redirectWithFlash(
  url: string,
  message: string,
  type: ToastKind = "success",
): Promise<never> {
  await setFlashToast(type, message);
  redirect(url);
  // redirect() jette — filet pour le contrôle de flux TS (Promise<never>).
  throw new Error("unreachable redirectWithFlash");
}
