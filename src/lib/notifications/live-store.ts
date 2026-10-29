"use client";

import { createClient } from "@/lib/supabase/client";
import { isActionableNotificationKind } from "@/lib/notifications/kinds";

export const MSK_NOTIF_ACTIONABLE = "msk:notif-actionable";

export type LiveNotification = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  kind: string;
  readAt: string | null;
  createdAt: string;
};

export type LiveSnapshot = {
  items: LiveNotification[];
  unread: number;
  realtimeOk: boolean;
};

type Entry = {
  userId: string;
  snapshot: LiveSnapshot;
  listeners: Set<() => void>;
  refCount: number;
  pollTimer: ReturnType<typeof setTimeout> | null;
  cancelled: boolean;
  realtimeOk: boolean;
  channelCleanup: (() => void) | null;
  pollMs: number;
  pollMsWhenRealtimeOk: number;
  onActionable: Set<(n: LiveNotification) => void>;
};

const stores = new Map<string, Entry>();

function emit(entry: Entry) {
  for (const l of entry.listeners) l();
}

function emitActionable(entry: Entry, n: LiveNotification) {
  for (const cb of entry.onActionable) cb(n);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(MSK_NOTIF_ACTIONABLE, { detail: n }),
    );
  }
}

function prepend(entry: Entry, n: LiveNotification) {
  if (entry.snapshot.items.some((x) => x.id === n.id)) return;
  entry.snapshot = {
    ...entry.snapshot,
    items: [n, ...entry.snapshot.items].slice(0, 40),
    unread: n.readAt ? entry.snapshot.unread : entry.snapshot.unread + 1,
  };
  emit(entry);
  if (isActionableNotificationKind(n.kind)) {
    emitActionable(entry, n);
  }
}

function applyPoll(
  entry: Entry,
  data: { items?: LiveNotification[]; unread?: number },
) {
  if (!data.items) return;
  const prevIds = new Set(entry.snapshot.items.map((x) => x.id));
  for (const n of data.items) {
    if (!prevIds.has(n.id) && isActionableNotificationKind(n.kind)) {
      emitActionable(entry, n);
    }
  }
  entry.snapshot = {
    ...entry.snapshot,
    items: data.items,
    unread:
      typeof data.unread === "number" ? data.unread : entry.snapshot.unread,
  };
  emit(entry);
}

function schedulePoll(entry: Entry, ms: number) {
  if (entry.pollTimer) clearTimeout(entry.pollTimer);
  entry.pollTimer = setTimeout(() => {
    void tickPoll(entry);
  }, ms);
}

async function tickPoll(entry: Entry) {
  if (entry.cancelled || entry.refCount <= 0) return;
  try {
    const r = await fetch("/api/notifications/poll", { cache: "no-store" });
    const data = r.ok ? await r.json() : null;
    if (!entry.cancelled && data) applyPoll(entry, data);
  } catch {
    /* ignore */
  } finally {
    if (!entry.cancelled && entry.refCount > 0) {
      const next = entry.realtimeOk
        ? entry.pollMsWhenRealtimeOk
        : entry.pollMs;
      schedulePoll(entry, next);
    }
  }
}

function startRealtime(entry: Entry) {
  const supabase = createClient();
  const topic = `notif:${entry.userId}:shared`;
  let channel = supabase.channel(topic);
  try {
    channel = channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_notifications",
          filter: `userId=eq.${entry.userId}`,
        },
        (payload) => {
          if (entry.cancelled) return;
          const row = payload.new as Record<string, unknown>;
          prepend(entry, {
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
        entry.realtimeOk = status === "SUBSCRIBED";
        entry.snapshot = { ...entry.snapshot, realtimeOk: entry.realtimeOk };
        emit(entry);
      });
  } catch (err) {
    console.error("[MSK] notifications realtime", err);
    entry.realtimeOk = false;
  }

  entry.channelCleanup = () => {
    void supabase.removeChannel(channel);
  };
}

function ensureEntry(
  userId: string,
  initial: LiveNotification[],
  initialUnread: number,
  pollMs: number,
  pollMsWhenRealtimeOk: number,
): Entry {
  let entry = stores.get(userId);
  if (!entry) {
    entry = {
      userId,
      snapshot: {
        items: initial,
        unread: initialUnread,
        realtimeOk: false,
      },
      listeners: new Set(),
      refCount: 0,
      pollTimer: null,
      cancelled: false,
      realtimeOk: false,
      channelCleanup: null,
      pollMs,
      pollMsWhenRealtimeOk,
      onActionable: new Set(),
    };
    stores.set(userId, entry);
    startRealtime(entry);
    schedulePoll(entry, 1_200);
  } else {
    // 2ᵉ abonné (page /notifications) : ne pas écraser l’état live déjà pollé.
    entry.pollMs = pollMs;
    entry.pollMsWhenRealtimeOk = pollMsWhenRealtimeOk;
  }
  return entry;
}

export function subscribeLiveNotifications(opts: {
  userId: string;
  initial: LiveNotification[];
  initialUnread: number;
  pollMs?: number;
  pollMsWhenRealtimeOk?: number;
  onActionable?: (n: LiveNotification) => void;
  onStoreChange: () => void;
}): () => void {
  const entry = ensureEntry(
    opts.userId,
    opts.initial,
    opts.initialUnread,
    opts.pollMs ?? 12_000,
    opts.pollMsWhenRealtimeOk ?? 25_000,
  );
  entry.refCount += 1;
  entry.cancelled = false;
  entry.listeners.add(opts.onStoreChange);
  if (opts.onActionable) entry.onActionable.add(opts.onActionable);

  return () => {
    entry.listeners.delete(opts.onStoreChange);
    if (opts.onActionable) entry.onActionable.delete(opts.onActionable);
    entry.refCount = Math.max(0, entry.refCount - 1);
    if (entry.refCount === 0) {
      entry.cancelled = true;
      if (entry.pollTimer) clearTimeout(entry.pollTimer);
      entry.pollTimer = null;
      entry.channelCleanup?.();
      entry.channelCleanup = null;
      stores.delete(opts.userId);
    }
  };
}

export function getLiveSnapshot(userId: string): LiveSnapshot | null {
  return stores.get(userId)?.snapshot ?? null;
}

export function markLiveRead(userId: string, id: string) {
  const entry = stores.get(userId);
  if (!entry) return;
  entry.snapshot = {
    ...entry.snapshot,
    items: entry.snapshot.items.map((n) =>
      n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
    ),
    unread: Math.max(0, entry.snapshot.unread - 1),
  };
  emit(entry);
}

export function markAllLiveRead(userId: string) {
  const entry = stores.get(userId);
  if (!entry) return;
  const now = new Date().toISOString();
  entry.snapshot = {
    ...entry.snapshot,
    items: entry.snapshot.items.map((n) => ({
      ...n,
      readAt: n.readAt ?? now,
    })),
    unread: 0,
  };
  emit(entry);
}
