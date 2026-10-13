"use client";

import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

/**
 * Feedback pending d’un `<Link>` parent — doit être enfant direct/descendant du Link.
 * Les icônes restent des children (slots serveur), jamais des props fonction.
 */
export function ActionLinkPendingIcon({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
    );
  }
  return children;
}
