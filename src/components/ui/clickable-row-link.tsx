"use client";

import { useRouter } from "next/navigation";
import { useTransition, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Ligne de tableau navigable (searchParams) — feedback pending pendant la nav. */
export function ClickableRowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go() {
    start(() => {
      router.push(href);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  }

  return (
    <tr
      role="link"
      tabIndex={0}
      aria-busy={pending || undefined}
      onClick={go}
      onKeyDown={onKeyDown}
      className={cn(
        "cursor-pointer transition hover:bg-msk-chalk/60 focus-visible:bg-msk-chalk/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-msk-blue/30",
        pending && "opacity-60",
        className,
      )}
    >
      {children}
    </tr>
  );
}
