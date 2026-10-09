"use client";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-msk-coral/25 bg-white p-8 text-center">
      <h2 className="font-impact text-3xl text-msk-ink">Erreur</h2>
      <p className="mt-3 text-sm text-msk-ink/60">
        {error.message || "Une erreur est survenue."}
      </p>
      <Button className="mt-6" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
