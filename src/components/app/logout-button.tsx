"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { toUserFacingError } from "@/lib/errors/user-facing";
import { cn } from "@/lib/utils";

/**
 * Déconnexion autonome (dialog local).
 * Ne passe pas par useConfirm : la sidebar est streamée dans <Suspense>
 * hors du même passage SSR que ConfirmProvider → contexte parfois null (P0).
 */
export function LogoutButton() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) setError(null);
  }

  async function onConfirm() {
    setError(null);
    setPending(true);
    try {
      const res = await logoutAction();
      if (!res.ok) throw new Error(res.error ?? "Échec déconnexion");
      window.location.href = "/login";
    } catch (e) {
      setPending(false);
      const facing = toUserFacingError(
        e instanceof Error ? e : new Error("Une erreur est survenue"),
      );
      setError(facing.description);
    }
  }

  return (
    <>
      <button
        type="button"
        title="Déconnexion"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-lg p-2 text-msk-ink/35 transition hover:bg-msk-chalk hover:text-msk-ink disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        <span className="sr-only">Déconnexion</span>
      </button>

      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-60 bg-msk-ink/45 backdrop-blur-[2px]" />
          <Dialog.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-60 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-msk-ink/8 bg-white shadow-2xl shadow-msk-ink/25 outline-none",
            )}
            onEscapeKeyDown={(e) => {
              if (pending) e.preventDefault();
            }}
            onPointerDownOutside={(e) => {
              if (pending) e.preventDefault();
            }}
          >
            <div className="px-6 pb-2 pt-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-msk-coral/10 text-msk-coral ring-4 ring-msk-coral/20">
                {pending ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <LogOut className="h-5 w-5" aria-hidden />
                )}
              </div>
              <Dialog.Title className="text-center text-lg font-semibold tracking-tight text-msk-ink">
                {pending ? "Déconnexion…" : "Se déconnecter ?"}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-center text-sm leading-relaxed text-msk-ink/55">
                {pending
                  ? "Merci de patienter — ne fermez pas cette fenêtre."
                  : "Vous quitterez la session MSK. Reconnectez-vous pour accéder à l’ERP."}
              </Dialog.Description>
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
                onClick={() => onOpenChange(false)}
              >
                Rester connecté
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="sm:min-w-28"
                disabled={pending}
                onClick={() => void onConfirm()}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Déconnexion…
                  </>
                ) : (
                  "Déconnexion"
                )}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
