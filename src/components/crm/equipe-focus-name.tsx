"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

/** Clic sur le nom → focus `?owner=` (pending visible). */
export function EquipeFocusName({
  ownerId,
  name,
  subtitle,
  focused,
}: {
  ownerId: string;
  name: string;
  subtitle: string;
  focused: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function focusCollab() {
    if (focused) return;
    start(() => {
      router.push(`/crm/equipe?owner=${ownerId}`);
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
