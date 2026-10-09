"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importCrmCsvAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function CrmImportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(fd: FormData) {
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const res = await importCrmCsvAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else {
        setMsg(res.message ?? "OK");
        router.refresh();
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="file">CSV prospects (Excel MSK, `;`)</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="mt-1 block w-full cursor-pointer text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-msk-blue file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        />
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      {msg ? <p className="text-sm text-msk-blue">{msg}</p> : null}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Import…" : "Importer"}
      </Button>
    </form>
  );
}
