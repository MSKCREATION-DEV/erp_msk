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

  const showDevDetails = process.env.NODE_ENV === "development";

  return (
    <div className="rounded-xl border border-msk-coral/20 bg-white p-6">
      <h2 className="text-lg font-semibold text-msk-ink">Erreur module Suivi</h2>
      <p className="mt-2 text-sm text-msk-ink/60">
        Une erreur est survenue. Réessayez ou revenez au hub.
      </p>
      {showDevDetails ? (
        <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-msk-ink/6 p-3 text-xs text-msk-ink/70">
          {error.message}
          {error.digest ? `\ndigest: ${error.digest}` : ""}
        </pre>
      ) : error.digest ? (
        <p className="mt-2 text-xs text-msk-ink/40">
          Référence : {error.digest}
        </p>
      ) : null}
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
