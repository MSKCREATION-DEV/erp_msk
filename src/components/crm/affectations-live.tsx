"use client";

import { useRouter } from "next/navigation";
import { useNotificationsLive } from "@/hooks/use-notifications-live";

/** Rafraîchit la file affectations dès qu’une notif actionnable arrive. */
export function AffectationsLive({
  userId,
}: {
  userId: string;
}) {
  const router = useRouter();
  useNotificationsLive({
    userId,
    initial: [],
    initialUnread: 0,
    onActionable: (n) => {
      if (
        n.kind === "crm.assignment_request" ||
        n.kind === "crm.assignment_resolved" ||
        n.kind === "crm.assigned"
      ) {
        router.refresh();
      }
    },
  });
  return null;
}
