"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Échange les tokens recovery présents dans le hash URL (flux implicite)
 * puis redirige vers le callback serveur pour forcer mustChangePassword.
 */
export function AuthHashRecovery({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash?.replace(/^#/, "");
    if (!hash) {
      setError("Lien incomplet — recommencez depuis l’e-mail ou la demande.");
      return;
    }
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    if (!access_token || !refresh_token) {
      setError("Lien invalide ou expiré.");
      return;
    }

    void (async () => {
      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      const cb = new URL("/auth/callback", window.location.origin);
      cb.searchParams.set("next", next);
      if (type === "recovery") cb.searchParams.set("type", "recovery");
      // Session déjà posée : le callback force mustChange via getUser
      cb.searchParams.set("session_ready", "1");
      window.location.replace(cb.toString());
    })();
  }, [next]);

  if (error) {
    return (
      <p className="mt-6 text-sm text-msk-coral" role="alert">
        {error}{" "}
        <a href="/demande-reset" className="underline">
          Demander un nouveau lien
        </a>
      </p>
    );
  }

  return (
    <p className="mt-6 text-sm text-msk-ink/50" role="status">
      Patientez…
    </p>
  );
}
