"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Formulaire de filtres (année / compte…) avec pending visible.
 * Navigation App Router via searchParams — jamais de freeze silencieux.
 */
export function GetFilterForm({
  children,
  submitLabel = "Afficher",
  className,
  submitClassName,
}: {
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  submitClassName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of fd.entries()) {
      const v = String(value).trim();
      if (v) params.set(key, v);
    }
    const qs = params.toString();
    start(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex flex-wrap items-end gap-3",
        pending && "opacity-70",
        className,
      )}
      aria-busy={pending || undefined}
    >
      {children}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-lg bg-msk-blue px-4 text-sm font-medium text-white transition hover:bg-msk-blue/90 disabled:pointer-events-none disabled:opacity-50",
          submitClassName,
        )}
      >
        {pending ? "Chargement…" : submitLabel}
      </button>
    </form>
  );
}
