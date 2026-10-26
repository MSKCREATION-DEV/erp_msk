import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { AuthHashRecovery } from "@/components/auth/auth-hash-recovery";

export const metadata: Metadata = {
  title: "Vérification du lien",
};

/**
 * Filet pour les redirects Supabase en fragment `#access_token=…`
 * (non visibles serveur). redirectTo generateLink → ici.
 */
export default function AuthRecoverPage() {
  return (
    <div className="auth-atmosphere flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12 text-center">
        <div className="mb-10 flex justify-center">
          <Logo variant="intercale" href={null} priority />
        </div>
        <div className="rounded-2xl border border-msk-ink/8 bg-white/90 p-8 shadow-[0_20px_60px_-30px_rgba(13,19,48,0.35)]">
          <h1 className="font-impact text-3xl text-msk-ink">Vérification…</h1>
          <p className="mt-3 text-sm text-msk-ink/60">
            Ouverture de votre session de réinitialisation.
          </p>
          <AuthHashRecovery next="/reinitialiser-mot-de-passe" />
        </div>
      </div>
    </div>
  );
}
