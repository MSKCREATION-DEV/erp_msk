import { envStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const env = envStatus();
  const ready = env.every((e) => e.configured);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-msk-blue uppercase">
          MSK CREATION
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-msk-ink sm:text-4xl">
          ERP interne — socle Phase -1
        </h1>
        <p className="text-base leading-relaxed text-msk-ink/70">
          Environnement de démarrage. Les modules métier arrivent en Phase 0+.
          Consultez{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-sm">
            docs/CAHIER-DES-CHARGES-ERP-MSK.md
          </code>{" "}
          et{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-sm">
            docs/phases/PHASE-01-SOCLES.md
          </code>
          .
        </p>
      </header>

      <section className="rounded-xl border border-msk-ink/10 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-msk-ink">
          État des variables d&apos;environnement
        </h2>
        <ul className="space-y-2 text-sm">
          {env.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-4 border-b border-msk-ink/5 pb-2 last:border-0"
            >
              <code className="text-msk-ink/80">{item.key}</code>
              <span
                className={
                  item.configured
                    ? "font-medium text-msk-blue"
                    : "font-medium text-msk-coral"
                }
              >
                {item.configured ? "OK" : "Manquant"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-msk-ink/60">
          {ready
            ? "Toutes les variables sont présentes. Vous pouvez tester Resend avec npm run test:email."
            : "Copiez .env.example vers .env.local et renseignez Supabase + Resend."}
        </p>
      </section>

      <footer className="text-sm text-msk-ink/50">
        Super Admin prévu (Phase 0) : a.guiro@mskcreation.net · Repo :{" "}
        MSKCREATION-DEV/erp_msk
      </footer>
    </main>
  );
}
