"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Info,
  LogOut,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmTone = "danger" | "primary" | "neutral";
export type ConfirmIcon = "trash" | "logout" | "warning" | "info";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: ConfirmIcon;
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
  { ring: string; iconBg: string; iconColor: string; button: "danger" | "primary" }
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

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [pending, setPending] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    setPending(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
    setPending(false);
  }

  function onOpenChange(next: boolean) {
    if (!next) settle(false);
    else setOpen(true);
  }

  const tone = options?.tone ?? "danger";
  const styles = TONE_STYLES[tone];
  const Icon = ICONS[options?.icon ?? (tone === "danger" ? "warning" : "info")];

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-msk-ink/45 backdrop-blur-[2px]" />
          <Dialog.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-msk-ink/[0.08] bg-white shadow-2xl shadow-msk-ink/25 outline-none",
              "focus:outline-none",
            )}
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
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <Dialog.Title className="text-center text-lg font-semibold tracking-tight text-msk-ink">
                {options?.title ?? "Confirmer"}
              </Dialog.Title>
              {options?.description ? (
                <Dialog.Description className="mt-2 text-center text-sm leading-relaxed text-msk-ink/55">
                  {options.description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">
                  Confirmation requise
                </Dialog.Description>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 px-6 py-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="sm:min-w-[7rem]"
                disabled={pending}
                onClick={() => settle(false)}
              >
                {options?.cancelLabel ?? "Annuler"}
              </Button>
              <Button
                type="button"
                variant={styles.button}
                size="sm"
                className="sm:min-w-[7rem]"
                data-confirm-primary
                disabled={pending}
                onClick={() => {
                  setPending(true);
                  settle(true);
                }}
              >
                {options?.confirmLabel ?? "Confirmer"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}

/** API impérative — `const ok = await confirm({ title, … })` */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm doit être utilisé dans <ConfirmProvider>");
  }
  return ctx;
}
