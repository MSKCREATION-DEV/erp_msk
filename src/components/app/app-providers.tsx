"use client";

import type { ReactNode } from "react";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

/** Providers client du shell authentifié (confirmations, etc.). */
export function AppProviders({ children }: { children: ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
