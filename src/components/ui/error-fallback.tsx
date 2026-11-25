"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  toUserFacingError,
  type UserFacingKind,
} from "@/lib/errors/user-facing";
import { isRemoveChildDomError } from "@/lib/ui/dom-safe";

type Props = {
  error: Error & { digest?: string };
  reset?: () => void;
  /** `inline` = dans le layout app ; `page` = plein écran (global-error) */
  variant?: "inline" | "page";
  className?: string;
  /** Log scope pour corréler côté serveur */
  scope?: string;
};

const ICON: Record<UserFacingKind, typeof AlertTriangle> = {
  transient: WifiOff,
  forbidden: AlertTriangle,
  not_found: AlertTriangle,
  unknown: AlertTriangle,
};

/** Anti-boucle si removeChild revient immédiatement après reset. */
let lastRemoveChildAutoResetAt = 0;

export function ErrorFallback({
  error,
  reset,
  variant = "inline",
  className,
  scope = "app-error",
}: Props) {
  const facing = toUserFacingError(error);
  const Icon = ICON[facing.kind];
  const autoResetAttempted = useRef(false);
  const [suppressUi, setSuppressUi] = useState(() =>
    isRemoveChildDomError(error),
  );

  useEffect(() => {
    // Toujours logger le détail côté navigateur (devtools) — jamais dans l’UI
    console.error(`[MSK ${scope}]`, {
      digest: error.digest,
      message: error.message,
      name: error.name,
    });
  }, [error, scope]);

  /**
   * Filet removeChild : auto-réessayer une fois (extensions autofill).
   * Si ça revient < 2,5 s → afficher l’UI d’erreur (évite boucle).
   */
  useEffect(() => {
    if (!reset || !isRemoveChildDomError(error)) {
      setSuppressUi(false);
      return;
    }
    if (autoResetAttempted.current) return;
    const now = Date.now();
    if (now - lastRemoveChildAutoResetAt < 2500) {
      setSuppressUi(false);
      return;
    }
    autoResetAttempted.current = true;
    lastRemoveChildAutoResetAt = now;
    setSuppressUi(true);
    const t = window.setTimeout(() => {
      reset();
    }, 0);
    return () => window.clearTimeout(t);
  }, [error, reset]);

  if (suppressUi && isRemoveChildDomError(error)) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex w-full flex-col items-center justify-center px-4",
        variant === "page" ? "min-h-screen py-16" : "min-h-[50vh] py-12",
        className,
      )}
    >
      <div className="w-full max-w-md text-center">
        <div
          className={cn(
            "mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ring-4",
            facing.kind === "transient"
              ? "bg-msk-blue/10 text-msk-blue ring-msk-blue/15"
              : "bg-msk-coral/10 text-msk-coral ring-msk-coral/15",
          )}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-msk-ink sm:text-2xl">
          {facing.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-msk-ink/55">
          {facing.description}
        </p>
        {facing.hint ? (
          <p className="mt-2 text-xs leading-relaxed text-msk-ink/40">
            {facing.hint}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Link prefetch={false}
            href="/accueil"
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium tracking-tight text-msk-ink transition hover:bg-msk-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/30 sm:min-w-36"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Link>
          {reset ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="sm:min-w-36"
              onClick={reset}
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          ) : null}
        </div>

        {error.digest ? (
          <p className="mt-6 font-mono text-[11px] tracking-wide text-msk-ink/30">
            Réf.{" "}
            <span className="select-all text-msk-ink/45">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
