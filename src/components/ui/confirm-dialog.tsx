"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Info,
  Loader2,
  LogOut,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toUserFacingError } from "@/lib/errors/user-facing";

export type ConfirmTone = "danger" | "primary" | "neutral";
export type ConfirmIcon = "trash" | "logout" | "warning" | "info";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Libellé pendant l’action (ex. « Suppression… »). */
  loadingLabel?: string;
  tone?: ConfirmTone;
  icon?: ConfirmIcon;
  /**
   * Action exécutée après clic Confirmer.
   * La modal reste ouverte en loading jusqu’à résolution.
   * Throw / reject → message d’erreur, modal reste ouverte.
   */
  action?: () => void | Promise<void>;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

const ICONS: Record<ConfirmIcon, LucideIcon> = {
  trash: Trash2,
  logout: LogOut,
  warning: AlertTriangle,
  info: Info,
};

const TONE_STYLES: Record<
  ConfirmTone,
  {
    ring: string;
    iconBg: string;
    iconColor: string;
    button: "danger" | "primary";
  }
> = {
  danger: {
    ring: "ring-msk-coral/20",
    iconBg: "bg-msk-coral/10",
    iconColor: "text-msk-coral",
    button: "danger",
  },
  primary: {
    ring: "ring-msk-blue/20",
    iconBg: "bg-msk-blue/10",
    iconColor: "text-msk-blue",
    button: "primary",
  },
  neutral: {
    ring: "ring-msk-ink/10",
    iconBg: "bg-msk-ink/5",
    iconColor: "text-msk-ink/60",
    button: "primary",
  },
};

/** Si l’action ne se termine pas (hang réseau), débloquer l’UI. */
const PENDING_SAFETY_MS = 45_000;

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const optionsRef = useRef<ConfirmOptions | null>(null);
  const pendingRef = useRef(false);

  const confirm = useCallback<ConfirmFn>((opts) => {
    optionsRef.current = opts;
    setOptions(opts);
    setOpen(true);
    setPending(false);
    pendingRef.current = false;
    setError(null);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function finish(value: boolean) {
    resolverRef.current?.(value);
    resolverRef.current = null;
    optionsRef.current = null;
    setOpen(false);
    setPending(false);
    pendingRef.current = false;
    setError(null);
  }

  function onOpenChange(next: boolean) {
    if (pendingRef.current) return; // bloque fermeture pendant l’action
    if (!next) finish(false);
    else setOpen(true);
  }

  // Safety : si pending reste coincé (action qui hang), libérer l’UI.
  useEffect(() => {
    if (!pending) return;
    const t = window.setTimeout(() => {
      if (!pendingRef.current) return;
      setPending(false);
      pendingRef.current = false;
      setError(
        "L’opération met trop de temps. Vous pouvez réessayer ou fermer.",
      );
    }, PENDING_SAFETY_MS);
    return () => window.clearTimeout(t);
  }, [pending]);

  async function onConfirm() {
    const opts = optionsRef.current;
    setError(null);
    setPending(true);
    pendingRef.current = true;
    try {
      if (opts?.action) {
        await opts.action();
      }
      finish(true);
    } catch (e) {
      // redirect() / notFound() — propager sans avaler (sinon pending reste true).
      unstable_rethrow(e);
      setPending(false);
      pendingRef.current = false;
      const facing = toUserFacingError(
        e instanceof Error ? e : new Error("Une erreur est survenue"),
      );
      setError(facing.description);
    }
  }

  const tone = options?.tone ?? "danger";
  const styles = TONE_STYLES[tone];
  const Icon = ICONS[options?.icon ?? (tone === "danger" ? "warning" : "info")];

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {/* Voile global pendant l’action (feedback même si modal bouge) */}
      {pending ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[55] bg-msk-ink/10"
          aria-hidden
        />
      ) : null}

      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        {open ? (
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-60 bg-msk-ink/45 backdrop-blur-[2px]" />
            <Dialog.Content
              className={cn(
                "fixed left-1/2 top-1/2 z-60 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-msk-ink/8 bg-white shadow-2xl shadow-msk-ink/25 outline-none",
                "focus:outline-none",
              )}
              onEscapeKeyDown={(e) => {
                if (pending) e.preventDefault();
              }}
              onPointerDownOutside={(e) => {
                if (pending) e.preventDefault();
              }}
              onOpenAutoFocus={(e) => {
                const root = e.currentTarget as HTMLElement | null;
                const target = root?.querySelector<HTMLButtonElement>(
                  "[data-confirm-primary]",
                );
                if (target) {
                  e.preventDefault();
                  target.focus();
                }
              }}
            >
              <div className="px-6 pb-2 pt-6">
                <div
                  className={cn(
                    "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ring-4",
                    styles.iconBg,
                    styles.iconColor,
                    styles.ring,
                  )}
                >
                  {pending ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  ) : (
                    <Icon className="h-5 w-5" aria-hidden />
                  )}
                </div>
                <Dialog.Title className="text-center text-lg font-semibold tracking-tight text-msk-ink">
                  {pending
                    ? (options?.loadingLabel ?? "Traitement en cours…")
                    : (options?.title ?? "Confirmer")}
                </Dialog.Title>
                {pending ? (
                  <Dialog.Description className="mt-2 text-center text-sm leading-relaxed text-msk-ink/55">
                    Merci de patienter — ne fermez pas cette fenêtre.
                  </Dialog.Description>
                ) : options?.description ? (
                  <Dialog.Description className="mt-2 text-center text-sm leading-relaxed text-msk-ink/55">
                    {options.description}
                  </Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">
                    Confirmation requise
                  </Dialog.Description>
                )}
                {error ? (
                  <p className="mt-3 rounded-lg border border-msk-coral/25 bg-msk-coral/5 px-3 py-2 text-center text-sm text-msk-coral">
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 px-6 py-5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="sm:min-w-28"
                  disabled={pending}
                  onClick={() => finish(false)}
                >
                  {options?.cancelLabel ?? "Annuler"}
                </Button>
                <Button
                  type="button"
                  variant={styles.button}
                  size="sm"
                  className="sm:min-w-28"
                  data-confirm-primary
                  disabled={pending}
                  onClick={() => void onConfirm()}
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {options?.loadingLabel ?? "Patientez…"}
                    </>
                  ) : (
                    (options?.confirmLabel ?? "Confirmer")
                  )}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}

/**
 * API impérative — `const ok = await confirm({ title, action })`.
 * Hors provider (Suspense SSR / edge) : fallback `window.confirm` côté client,
 * jamais de throw au render (évite « Switched to client rendering »).
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (ctx) return ctx;

  return async (opts) => {
    if (typeof window === "undefined") return false;
    const ok = window.confirm(
      opts.description
        ? `${opts.title}\n\n${opts.description}`
        : opts.title,
    );
    if (!ok) return false;
    if (opts.action) await opts.action();
    return true;
  };
}
