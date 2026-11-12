import {
  FLASH_TOAST_MAX_MESSAGE,
  type FlashToastPayload,
} from "@/lib/toast/types";

function clampMessage(message: string): string {
  const t = message.trim().replace(/\s+/g, " ");
  if (t.length <= FLASH_TOAST_MAX_MESSAGE) return t;
  return `${t.slice(0, FLASH_TOAST_MAX_MESSAGE - 1)}…`;
}

export function clampFlashMessage(message: string): string {
  return clampMessage(message);
}

/** Parse JSON cookie flash — safe client & serveur. */
export function parseFlashToastCookie(
  raw: string | undefined | null,
): FlashToastPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<FlashToastPayload>;
    if (
      !data ||
      typeof data.message !== "string" ||
      !data.message.trim() ||
      (data.type !== "success" &&
        data.type !== "error" &&
        data.type !== "info" &&
        data.type !== "warning")
    ) {
      return null;
    }
    return {
      type: data.type,
      message: clampMessage(data.message),
    };
  } catch {
    return null;
  }
}
