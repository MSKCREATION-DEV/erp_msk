"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MSK_NOTIF_ACTIONABLE,
  type LiveNotification,
} from "@/hooks/use-notifications-live";

const ACTIONABLE_KINDS = new Set([
  "crm.assignment_request",
  "crm.assignment_resolved",
  "crm.assigned",
]);

/**
 * Rafraîchit la file affectations dès qu’une notif actionnable arrive.
 * Écoute l’event bus de la cloche — **pas** de 2ᵉ poll / Realtime.
 */
export function AffectationsLive({ userId }: { userId: string }) {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    if (!userId) return;

    function onActionable(e: Event) {
      const n = (e as CustomEvent<LiveNotification>).detail;
      if (!n || !ACTIONABLE_KINDS.has(n.kind)) return;
      // Anti-tempête : max 1 refresh / 2 s.
      const now = Date.now();
      if (now - lastRefresh.current < 2_000) return;
      lastRefresh.current = now;
      router.refresh();
    }

    window.addEventListener(MSK_NOTIF_ACTIONABLE, onActionable);
    return () => window.removeEventListener(MSK_NOTIF_ACTIONABLE, onActionable);
  }, [userId, router]);

  return null;
}
