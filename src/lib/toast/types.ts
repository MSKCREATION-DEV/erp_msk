/** Payload flash cookie / notify — types partagés client & serveur. */

export type ToastKind = "success" | "error" | "info" | "warning";

export type FlashToastPayload = {
  type: ToastKind;
  message: string;
};

/** Nom du cookie flash (lisible client pour le listener). */
export const FLASH_TOAST_COOKIE = "msk_flash";

export const FLASH_TOAST_MAX_AGE_SEC = 20;

/** Plafond message (cookie + UX). */
export const FLASH_TOAST_MAX_MESSAGE = 180;
