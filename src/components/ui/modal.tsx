"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  size = "lg",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: "md" | "lg" | "xl" | "full";
}) {
  const widths = {
    md: "max-w-lg",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[min(96vw,72rem)]",
  } as const;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-msk-ink/45 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-msk-ink/[0.08] bg-white shadow-2xl shadow-msk-ink/25 outline-none",
            widths[size],
            className,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-msk-ink/[0.07] px-5 py-4 pr-12">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-lg font-semibold tracking-tight text-msk-ink">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 truncate text-sm text-msk-ink/50">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">
                  Aperçu du document
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="absolute right-3 top-3 cursor-pointer rounded-lg p-2 text-msk-ink/40 transition hover:bg-msk-chalk hover:text-msk-ink"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-msk-chalk/40">
            {children}
          </div>
          {footer ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-msk-ink/[0.07] bg-white px-5 py-3">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
