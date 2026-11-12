export {
  FLASH_TOAST_COOKIE,
  FLASH_TOAST_MAX_AGE_SEC,
  FLASH_TOAST_MAX_MESSAGE,
  type FlashToastPayload,
  type ToastKind,
} from "@/lib/toast/types";

export { parseFlashToastCookie, clampFlashMessage } from "@/lib/toast/parse-flash";

/** Flash serveur : importer depuis `@/lib/toast/flash` (server-only). */
