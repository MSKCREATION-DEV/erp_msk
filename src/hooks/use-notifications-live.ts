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
  /** Poll de secours — toujours actif (Realtime peut être « SUBSCRIBED » sans events). */
  pollMs?: number;
};

/**
 * Realtime Supabase + **poll toujours actif** (secours).
 * Topic unique par instance pour éviter le crash « callbacks after subscribe ».
 */
export function useNotificationsLive({
  userId,
  initial,
  initialUnread,
  onActionable,
  pollMs = 4000,
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

  const applyPoll = useCallback(
    (data: { items?: LiveNotification[]; unread?: number }) => {
      if (!data.items) return;
      setItems((prev) => {
        // Détecter nouveaux IDs pour callbacks actionnables
        const prevIds = new Set(prev.map((x) => x.id));
        for (const n of data.items!) {
          if (!prevIds.has(n.id) && isActionableNotificationKind(n.kind)) {
            onActionableRef.current?.(n);
          }
        }
        return data.items!;
      });
      if (typeof data.unread === "number") setUnread(data.unread);
    },
    [],
  );

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

  // Poll **toujours** — Realtime seul n’est pas fiable (RLS / faux SUBSCRIBED).
  useEffect(() => {
    if (!userId) return;

    function tick() {
      void fetch("/api/notifications/poll", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) applyPoll(data);
        })
        .catch(() => {});
    }

    // Premier tick rapide pour rattraper une notif créée pendant la session.
    const first = window.setTimeout(tick, 800);
    const t = window.setInterval(tick, pollMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [userId, pollMs, applyPoll]);

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

  return {
    items,
    unread,
    realtimeOk,
    markLocalRead,
    markAllLocalRead,
    prepend,
  };
}
