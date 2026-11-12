"use client";

import { toast, type Id, type ToastOptions } from "react-toastify";
import type { ToastKind } from "@/lib/toast/types";

/**
 * API toast MSK — seul point d’émission autorisé côté client.
 * Ne pas appeler `toast.*` hors de ce module.
 */

const base: ToastOptions = {
  role: "status",
};

function emit(kind: ToastKind, message: string, opts?: ToastOptions): Id {
  const text = message.trim();
  if (!text) return toast("Notification", { ...base, ...opts });

  switch (kind) {
    case "success":
      return toast.success(text, { ...base, ...opts });
    case "error":
      return toast.error(text, { ...base, autoClose: 6500, ...opts });
    case "warning":
      return toast.warn(text, { ...base, autoClose: 6000, ...opts });
    case "info":
      return toast.info(text, { ...base, ...opts });
    default:
      return toast(text, { ...base, ...opts });
  }
}

export const notify = {
  success: (message: string, opts?: ToastOptions) =>
    emit("success", message, opts),
  error: (message: string, opts?: ToastOptions) => emit("error", message, opts),
  warning: (message: string, opts?: ToastOptions) =>
    emit("warning", message, opts),
  info: (message: string, opts?: ToastOptions) => emit("info", message, opts),
  dismiss: (id?: Id) => toast.dismiss(id),
} as const;

export type { ToastOptions, Id };
