"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Settings2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

function TabLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <>{pending ? "…" : label}</>;
}

/**
 * Basculer Assignation globale ↔ Par collaborateur (pages /assigner).
 */
export function GoalsAssignTabs({
  mode,
  firstCollabId,
  currentUserId,
}: {
  mode: "equipe" | "collab";
  firstCollabId: string | null;
  /** Collab actuellement édité — conserve le focus en bascule. */
  currentUserId?: string;
}) {
  const collabTarget = currentUserId ?? firstCollabId;
  const tabs = [
    {
      key: "equipe" as const,
      href: "/crm/objectifs/assigner",
      label: "Assignation globale",
      Icon: Settings2,
    },
    {
      key: "collab" as const,
      href: collabTarget
        ? `/crm/objectifs/assigner/${collabTarget}`
        : "/crm/objectifs/assigner",
      label: "Par collaborateur",
      Icon: UserRound,
      disabled: !collabTarget,
    },
  ];

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Type d’assignation"
    >
      {tabs.map((t) => {
        const active = mode === t.key;
        const Icon = t.Icon;
        if (t.disabled) {
          return (
            <span
              key={t.key}
              className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-msk-ink/10 px-3 text-sm font-medium text-msk-ink/30"
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {t.label}
            </span>
          );
        }
        return (
          <Link
            key={t.key}
            prefetch={false}
            href={t.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition",
              active
                ? "bg-msk-blue text-white"
                : "border border-msk-ink/12 bg-white text-msk-ink/70 hover:border-msk-blue/30 hover:text-msk-ink",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <TabLabel label={t.label} />
          </Link>
        );
      })}
    </div>
  );
}
