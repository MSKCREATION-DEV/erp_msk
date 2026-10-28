"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isActionableNotificationKind } from "@/lib/notifications/kinds";

export type LiveNotification = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  kind: string;
  readAt: string | null;
  createdAt: string;
};

type Opts = {
  userId: string;
  initial: LiveNotification[];
  initialUnread: number;
  onActionable?: (n: LiveNotification) => void;
  pollMs?: number;
};

/**
 * Realtime Supabase sur app_notifications (SELECT own) + fallback poll 5 s.
 *
 * Topic **unique par instance** (`notif:{userId}:{hookId}`) : la cloche topbar
 * et `/notifications` (ou AffectationsLive) peuvent coexister. Réutiliser le
 * même nom de channel après `subscribe()` fait planter :
 * « cannot add postgres_changes callbacks … after subscribe() ».
 */
export function useNotificationsLive({
  userId,
  initial,
  initialUnread,
  onActionable,
  pollMs = 5000,
}: Opts) {
  const instanceId = useId().replace(/:/g, "");
  const [items, setItems] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [realtimeOk, setRealtimeOk] = useState(false);
  const onActionableRef = useRef(onActionable);
  onActionableRef.current = onActionable;

  const prepend = useCallback((n: LiveNotification) => {
    setItems((prev) => {
      if (prev.some((x) => x.id === n.id)) return prev;
      return [n, ...prev].slice(0, 40);
    });
    if (!n.readAt) {
      setUnread((u) => u + 1);
    }
    if (isActionableNotificationKind(n.kind)) {
      onActionableRef.current?.(n);
    }
  }, []);

  useEffect(() => {
    setItems(initial);
    setUnread(initialUnread);
  }, [initial, initialUnread]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const topic = `notif:${userId}:${instanceId}`;
    let channel = supabase.channel(topic);
    let cancelled = false;

    try {
      channel = channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "app_notifications",
            filter: `userId=eq.${userId}`,
          },
          (payload) => {
            if (cancelled) return;
            const row = payload.new as Record<string, unknown>;
            prepend({
              id: String(row.id),
              title: String(row.title ?? ""),
              body: (row.body as string | null) ?? null,
              href: (row.href as string | null) ?? null,
              kind: String(row.kind ?? ""),
              readAt: (row.readAt as string | null) ?? null,
              createdAt: String(row.createdAt ?? new Date().toISOString()),
            });
          },
        )
        .subscribe((status) => {
          if (!cancelled) setRealtimeOk(status === "SUBSCRIBED");
        });
    } catch (err) {
      console.error("[MSK] notifications realtime", err);
      setRealtimeOk(false);
    }

    return () => {
      cancelled = true;
      setRealtimeOk(false);
      void supabase.removeChannel(channel);
    };
  }, [userId, instanceId, prepend]);

  useEffect(() => {
    if (realtimeOk || !userId) return;
    const t = window.setInterval(() => {
      void fetch("/api/notifications/poll", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { items?: LiveNotification[]; unread?: number } | null) => {
          if (!data?.items) return;
          setItems(data.items);
          if (typeof data.unread === "number") setUnread(data.unread);
        })
        .catch(() => {});
    }, pollMs);
    return () => window.clearInterval(t);
  }, [realtimeOk, userId, pollMs]);

  function markLocalRead(id: string) {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
    setUnread((u) => Math.max(0, u - 1));
  }

  function markAllLocalRead() {
    setItems((prev) =>
      prev.map((n) => ({
        ...n,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
    );
    setUnread(0);
  }

  return { items, unread, realtimeOk, markLocalRead, markAllLocalRead, prepend };
}
