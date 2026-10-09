import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const banned = params.error === "compte_indisponible";

  return (
    <div className="rounded-2xl border border-msk-ink/8 bg-white/90 p-8 shadow-[0_20px_60px_-30px_rgba(13,19,48,0.35)] backdrop-blur">
      <h1 className="font-impact text-[2.5rem] leading-none tracking-tight text-msk-ink">
        Connexion
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-msk-ink/60">
        Espace métier interne — pas d&apos;inscription publique.
      </p>
      {banned ? (
        <p className="mt-4 rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
          Compte suspendu ou archivé. Contactez un administrateur.
        </p>
      ) : null}
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
