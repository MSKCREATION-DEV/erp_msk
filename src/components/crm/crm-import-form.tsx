"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { importCrmCsvAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

export function CrmImportForm({
  redirectTo = "/crm/prospects",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    const fd = new FormData(e.currentTarget);
    void run(async () => {
      const res = await importCrmCsvAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else {
        setMsg(res.message ?? "OK");
        router.push(redirectTo);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3"
      aria-busy={pending || undefined}
    >
      <div>
        <Label htmlFor="file">Fichier prospects (Excel .xlsx ou CSV `;`)</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          disabled={pending}
          className="mt-1 block w-full cursor-pointer text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-msk-blue file:px-3 file:py-2 file:text-sm file:font-medium file:text-white disabled:opacity-60"
        />
        <p className="mt-1.5 text-xs text-msk-ink/45">
          Onglet PROSPECTS détecté automatiquement. Responsable / Créé par
          résolus via le mapping équipe ; doublons (nom normalisé) ignorés.
        </p>
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      {msg ? <p className="text-sm text-msk-blue">{msg}</p> : null}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Import…" : "Importer"}
      </Button>
    </form>
  );
}
