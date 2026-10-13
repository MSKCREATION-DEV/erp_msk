"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { matchBankTxnAction } from "@/actions/comptabilite";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

type EntryOption = { id: string; number: string; label: string };

export function BankMatchForm({
  txnId,
  entries,
  matchedEntryId,
}: {
  txnId: string;
  entries: EntryOption[];
  matchedEntryId: string | null;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [entryId, setEntryId] = useState(matchedEntryId ?? "");

  function match() {
    setError(null);
    const fd = new FormData();
    fd.set("txnId", txnId);
    fd.set("entryId", entryId);
    void run(async () => {
      const res = await matchBankTxnAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.refresh();
    });
  }

  function unmatch() {
    setError(null);
    const fd = new FormData();
    fd.set("txnId", txnId);
    fd.set("entryId", "");
    void run(async () => {
      const res = await matchBankTxnAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setEntryId("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={entryId}
        disabled={pending}
        onChange={(e) => setEntryId(e.target.value)}
        className="h-9 min-w-55 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
      >
        <option value="">— écriture validée —</option>
        {entries.map((e) => (
          <option key={e.id} value={e.id}>
            {e.number} · {e.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        disabled={pending || !entryId}
        onClick={match}
      >
        {pending ? "…" : "Rapprocher"}
      </Button>
      {matchedEntryId ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={unmatch}
        >
          Annuler
        </Button>
      ) : null}
      {error ? <p className="w-full text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
