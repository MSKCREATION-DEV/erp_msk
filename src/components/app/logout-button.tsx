"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function LogoutButton() {
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  async function onClick() {
    const ok = await confirm({
      title: "Se déconnecter ?",
      description:
        "Vous quitterez la session MSK. Reconnectez-vous pour accéder à l’ERP.",
      confirmLabel: "Déconnexion",
      cancelLabel: "Rester connecté",
      tone: "primary",
      icon: "logout",
    });
    if (!ok) return;
    startTransition(async () => {
      await logoutAction();
    });
  }

  return (
    <button
      type="button"
      title="Déconnexion"
      disabled={pending}
      onClick={() => void onClick()}
      className="cursor-pointer rounded-lg p-2 text-msk-ink/35 transition hover:bg-msk-chalk hover:text-msk-ink disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      <span className="sr-only">Déconnexion</span>
    </button>
  );
}
