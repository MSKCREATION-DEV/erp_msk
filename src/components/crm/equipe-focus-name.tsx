"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

/** Clic sur le nom → focus `?owner=` en conservant la période (query fournie par le serveur). */
export function EquipeFocusName({
  ownerId,
  name,
  subtitle,
  focused,
  /** Query actuelle sans `owner` (ex. `periode=mois&mois=2026-09`). */
  baseQuery = "",
}: {
  ownerId: string;
  name: string;
  subtitle: string;
  focused: boolean;
  baseQuery?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function focusCollab() {
    if (focused) return;
    const p = new URLSearchParams(baseQuery);
    p.set("owner", ownerId);
    const href = `/crm/equipe?${p.toString()}`;
    start(() => {
      router.replace(href, { scroll: false });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={focusCollab}
      disabled={focused || pending}
      aria-busy={pending || undefined}
      className={cn(
        "text-left transition",
        !focused && "cursor-pointer hover:opacity-80",
        focused && "cursor-default",
        pending && "opacity-60",
      )}
    >
      <h2 className="text-lg font-semibold text-msk-ink">{name}</h2>
      <p className="mt-1 text-sm text-msk-ink/50">
        {subtitle}
        {!focused ? (
          <span className="ml-1 text-msk-blue/70">· voir</span>
        ) : null}
      </p>
    </button>
  );
}
