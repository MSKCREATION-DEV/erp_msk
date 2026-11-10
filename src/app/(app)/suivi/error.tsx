"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SuiviError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-msk-coral/20 bg-white p-6">
      <h2 className="text-lg font-semibold text-msk-ink">Erreur module Suivi</h2>
      <p className="mt-2 text-sm text-msk-ink/60">
        Une erreur est survenue. Réessayez ou revenez au hub.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          Réessayer
        </Button>
        <Link
          href="/suivi"
          className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 px-4 text-sm font-medium hover:bg-msk-chalk"
        >
          Hub Suivi
        </Link>
      </div>
    </div>
  );
}
