"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function LogoutButton() {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const ok = await confirm({
        title: "Se déconnecter ?",
        description:
          "Vous quitterez la session MSK. Reconnectez-vous pour accéder à l’ERP.",
        confirmLabel: "Déconnexion",
        cancelLabel: "Rester connecté",
        loadingLabel: "Déconnexion…",
        tone: "primary",
        icon: "logout",
        action: async () => {
          const res = await logoutAction();
          if (!res.ok) throw new Error(res.error ?? "Échec déconnexion");
          // Hard nav : purge l’état client (recommandation Next.js / Activity)
          window.location.href = "/login";
        },
      });
      if (!ok) setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      title="Déconnexion"
      disabled={busy}
      onClick={() => void onClick()}
      className="cursor-pointer rounded-lg p-2 text-msk-ink/35 transition hover:bg-msk-chalk hover:text-msk-ink disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      <span className="sr-only">Déconnexion</span>
    </button>
  );
}
