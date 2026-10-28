"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import {
  useNotificationsLive,
  type LiveNotification,
} from "@/hooks/use-notifications-live";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

export function NotificationsBell({
  userId,
  initialItems,
  initialUnread,
}: {
  userId: string;
  initialItems: LiveNotification[];
  initialUnread: number;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [open, setOpen] = useState(false);
  const { items, unread, markLocalRead, markAllLocalRead } =
    useNotificationsLive({
      userId,
      initial: initialItems,
      initialUnread,
      onActionable: () => {
        router.refresh();
      },
    });

  function openOne(n: LiveNotification) {
    setOpen(false);
    if (!n.readAt) {
      const fd = new FormData();
      fd.set("notificationId", n.id);
      void run(async () => {
        await markNotificationReadAction(fd);
        markLocalRead(n.id);
      });
    }
    if (n.href) router.push(n.href);
    else router.push("/notifications");
  }

  function markAll() {
    void run(async () => {
      await markAllNotificationsReadAction();
      markAllLocalRead();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-msk-ink/10 text-msk-ink/70 transition hover:bg-msk-chalk hover:text-msk-ink"
        aria-label={
          unread > 0
            ? `Notifications — ${unread} non lues`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-msk-coral px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-msk-ink/10 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-msk-ink/6 px-3 py-2">
              <p className="text-sm font-semibold text-msk-ink">Notifications</p>
              {unread > 0 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-msk-blue hover:underline disabled:opacity-50"
                  disabled={pending}
                  onClick={markAll}
                >
                  Tout marquer lu
                </button>
              ) : null}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-msk-ink/45">
                  Aucune notification
                </li>
              ) : (
                items.slice(0, 12).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full px-3 py-2.5 text-left transition hover:bg-msk-chalk/80",
                        !n.readAt && "bg-msk-blue/4",
                      )}
                      onClick={() => openOne(n)}
                    >
                      <p className="text-sm font-medium text-msk-ink">
                        {n.title}
                      </p>
                      {n.body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-msk-ink/55">
                          {n.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-msk-ink/35">
                        {new Date(n.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-msk-ink/6 px-3 py-2">
              <Link
                href="/notifications"
                className="text-xs font-medium text-msk-blue hover:underline"
                onClick={() => setOpen(false)}
              >
                Voir toutes les notifications
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
