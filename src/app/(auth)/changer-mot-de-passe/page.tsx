import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
};

export default async function ChangePasswordPage() {
  await requireUser({ allowMustChangePassword: true });

  return (
    <div className="rounded-2xl border border-msk-ink/8 bg-white/90 p-8 shadow-[0_20px_60px_-30px_rgba(13,19,48,0.35)]">
      <h1 className="font-impact text-[2.25rem] leading-none text-msk-ink">
        Sécurisez votre accès
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-msk-ink/60">
        Première connexion ou reset administrateur — choisissez un mot de passe
        définitif avant d&apos;accéder à l&apos;ERP.
      </p>
      <div className="mt-8">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
