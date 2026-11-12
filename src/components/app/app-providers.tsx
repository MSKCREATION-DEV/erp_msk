"use client";

import type { ReactNode } from "react";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast-provider";

/** Providers client root (confirmations, toasts). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConfirmProvider>
      {children}
      <ToastProvider />
    </ConfirmProvider>
  );
}
