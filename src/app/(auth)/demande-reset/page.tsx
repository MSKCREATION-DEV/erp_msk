import type { Metadata } from "next";
import { ResetRequestForm } from "@/components/auth/reset-request-form";

export const metadata: Metadata = {
  title: "Réinitialisation",
};

export default function DemandeResetPage() {
  return (
    <div className="rounded-2xl border border-msk-ink/8 bg-white/90 p-8 shadow-[0_20px_60px_-30px_rgba(13,19,48,0.35)]">
      <h1 className="font-impact text-[2.25rem] leading-none text-msk-ink">
        Mot de passe
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-msk-ink/60">
        Pas de self-service automatique. Votre demande notifie les personnes
        autorisées (<span className="font-accent">reset</span>).
      </p>
      <div className="mt-8">
        <ResetRequestForm />
      </div>
    </div>
  );
}
