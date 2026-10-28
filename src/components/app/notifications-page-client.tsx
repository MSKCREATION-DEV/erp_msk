"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import {
  useNotificationsLive,
  type LiveNotification,
} from "@/hooks/use-notifications-live";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

export function NotificationsPageClient({
  userId,
  initialItems,
}: {
  userId: string;
  initialItems: LiveNotification[];
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const unreadInitial = initialItems.filter((n) => !n.readAt).length;
  const { items, unread, markLocalRead, markAllLocalRead } =
    useNotificationsLive({
      userId,
      initial: initialItems,
      initialUnread: unreadInitial,
      onActionable: () => router.refresh(),
    });

  return (
    <div>
      <div className="flex items-center justify-between border-b border-msk-ink/6 px-4 py-3 sm:px-5">
        <p className="text-sm text-msk-ink/55">
          {unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}` : "À jour"}
        </p>
        {unread > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              void run(async () => {
                await markAllNotificationsReadAction();
                markAllLocalRead();
              })
            }
          >
            {pending ? "…" : "Tout marquer lu"}
          </Button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-msk-ink/45">
          Aucune notification pour le moment.
        </p>
      ) : (
        <ul className="divide-y divide-msk-ink/6">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={n.href || "/notifications"}
                className={cn(
                  "block px-4 py-3.5 transition hover:bg-msk-chalk/60 sm:px-5",
                  !n.readAt && "bg-msk-blue/4",
                )}
                onClick={() => {
                  if (!n.readAt) {
                    const fd = new FormData();
                    fd.set("notificationId", n.id);
                    void markNotificationReadAction(fd).then(() =>
                      markLocalRead(n.id),
                    );
                  }
                }}
              >
                <p className="text-sm font-semibold text-msk-ink">{n.title}</p>
                {n.body ? (
                  <p className="mt-1 text-sm text-msk-ink/60">{n.body}</p>
                ) : null}
                <p className="mt-1.5 text-xs text-msk-ink/35">
                  {new Date(n.createdAt).toLocaleString("fr-FR")} · {n.kind}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
