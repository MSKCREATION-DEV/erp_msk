"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import {
  getLiveSnapshot,
  markAllLiveRead,
  markLiveRead,
  MSK_NOTIF_ACTIONABLE,
  subscribeLiveNotifications,
  type LiveNotification,
  type LiveSnapshot,
} from "@/lib/notifications/live-store";

export type { LiveNotification };
export { MSK_NOTIF_ACTIONABLE };

type Opts = {
  userId: string;
  initial: LiveNotification[];
  initialUnread: number;
  onActionable?: (n: LiveNotification) => void;
  pollMs?: number;
  pollMsWhenRealtimeOk?: number;
};

/**
 * Realtime + poll partagés par `userId` (1 seul poller même si cloche + page).
 */
export function useNotificationsLive({
  userId,
  initial,
  initialUnread,
  onActionable,
  pollMs = 12_000,
  pollMsWhenRealtimeOk = 25_000,
}: Opts) {
  const onActionableRef = useRef(onActionable);
  onActionableRef.current = onActionable;
  const bootRef = useRef({ initial, initialUnread });
  // Premier mount uniquement pour seed le store.
  if (bootRef.current.initial !== initial && !getLiveSnapshot(userId)) {
    bootRef.current = { initial, initialUnread };
  }

  const stableActionable = useCallback((n: LiveNotification) => {
    onActionableRef.current?.(n);
  }, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!userId) return () => {};
      return subscribeLiveNotifications({
        userId,
        initial: bootRef.current.initial,
        initialUnread: bootRef.current.initialUnread,
        pollMs,
        pollMsWhenRealtimeOk,
        onActionable: stableActionable,
        onStoreChange,
      });
    },
    [userId, pollMs, pollMsWhenRealtimeOk, stableActionable],
  );

  const getSnapshot = useCallback((): LiveSnapshot => {
    return (
      getLiveSnapshot(userId) ?? {
        items: bootRef.current.initial,
        unread: bootRef.current.initialUnread,
        realtimeOk: false,
      }
    );
  }, [userId]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    items: snapshot.items,
    unread: snapshot.unread,
    realtimeOk: snapshot.realtimeOk,
    markLocalRead: (id: string) => markLiveRead(userId, id),
    markAllLocalRead: () => markAllLiveRead(userId),
  };
}
