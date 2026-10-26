import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
};

/** Après clic sur le lien e-mail (session recovery via /auth/callback). */
export default async function ReinitialiserMotDePassePage() {
  await requireUser({ allowMustChangePassword: true });

  return (
    <div className="rounded-2xl border border-msk-ink/8 bg-white/90 p-8 shadow-[0_20px_60px_-30px_rgba(13,19,48,0.35)]">
      <h1 className="font-impact text-4xl leading-none text-msk-ink">
        Nouveau mot de passe
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-msk-ink/60">
        Votre e-mail a été vérifié. Choisissez un mot de passe définitif pour
        accéder à l’ERP.
      </p>
      <div className="mt-8">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
