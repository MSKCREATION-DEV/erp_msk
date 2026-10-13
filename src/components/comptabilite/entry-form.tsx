"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createEntryAction } from "@/actions/comptabilite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Surface } from "@/components/ui/surface";
import { usePendingAction } from "@/hooks/use-pending-action";
import { formatXof } from "@/lib/comptabilite/money";
import { cn } from "@/lib/utils";

type Journal = { id: string; code: string; label: string };
type Account = { id: string; code: string; label: string };

type Line = {
  key: string;
  accountId: string;
  debit: string;
  credit: string;
  label: string;
};

function emptyLine(): Line {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    accountId: "",
    debit: "",
    credit: "",
    label: "",
  };
}

/** Formulaire multi-lignes écriture — grille éditable, équilibre en direct. */
export function EntryForm({
  journals,
  accounts,
  defaultJournalId,
}: {
  journals: Journal[];
  accounts: Account[];
  defaultJournalId?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [journalId, setJournalId] = useState(
    defaultJournalId ?? journals[0]?.id ?? "",
  );
  const [label, setLabel] = useState("");
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const l of lines) {
      if (!l.accountId) continue;
      debit += Number(l.debit) || 0;
      credit += Number(l.credit) || 0;
    }
    return { debit, credit, balanced: debit === credit && debit > 0 };
  }, [lines]);

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => {
      const next = prev.map((l, i) => (i === idx ? { ...l, ...patch } : l));
      // Ligne vierge finale toujours disponible pour saisie rapide.
      const last = next[next.length - 1];
      if (last && (last.accountId || last.debit || last.credit)) {
        next.push(emptyLine());
      }
      return next;
    });
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const usable = lines
      .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map((l) => ({
        accountId: l.accountId,
        debit: Math.round(Number(l.debit) || 0),
        credit: Math.round(Number(l.credit) || 0),
        label: l.label.trim() || null,
      }));

    if (usable.length < 2) {
      setError("Au moins deux lignes avec montant sont requises");
      return;
    }
    if (!journalId) {
      setError("Choisissez un journal");
      return;
    }
    if (!label.trim()) {
      setError("Libellé requis");
      return;
    }

    const fd = new FormData();
    fd.set("journalId", journalId);
    fd.set("label", label.trim());
    fd.set("entryDate", entryDate);
    fd.set("lines", JSON.stringify(usable));

    void run(async () => {
      const res = await createEntryAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      if (res.entryId) router.push(`/comptabilite/ecritures/${res.entryId}`);
      else router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      aria-busy={pending || undefined}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="journalId">Journal *</Label>
          <select
            id="journalId"
            required
            value={journalId}
            disabled={pending}
            onChange={(e) => setJournalId(e.target.value)}
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            <option value="">— choisir —</option>
            {journals.map((j) => (
              <option key={j.id} value={j.id}>
                {j.code} · {j.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="entryDate">Date *</Label>
          <Input
            id="entryDate"
            type="date"
            required
            value={entryDate}
            disabled={pending}
            onChange={(e) => setEntryDate(e.target.value)}
          />
        </div>
        <div className="sm:col-span-3">
          <Label htmlFor="label">Libellé *</Label>
          <Input
            id="label"
            required
            maxLength={500}
            value={label}
            disabled={pending}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex. Facture fournisseur ORANGE octobre"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Lignes</Label>
        <Surface className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="w-[36%] px-3 py-2 font-medium">Compte</th>
                <th className="px-3 py-2 font-medium">Libellé ligne</th>
                <th className="w-32 px-3 py-2 font-medium">Débit</th>
                <th className="w-32 px-3 py-2 font-medium">Crédit</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.key} className="border-b border-msk-ink/5">
                  <td className="px-3 py-2">
                    <select
                      value={line.accountId}
                      disabled={pending}
                      onChange={(e) =>
                        updateLine(idx, { accountId: e.target.value })
                      }
                      className="h-10 w-full rounded-lg border border-msk-ink/15 bg-white px-2 text-sm"
                    >
                      <option value="">— compte —</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} · {a.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={line.label}
                      disabled={pending || !line.accountId}
                      onChange={(e) =>
                        updateLine(idx, { label: e.target.value })
                      }
                      placeholder="Optionnel"
                      className="h-10"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      value={line.debit}
                      disabled={pending}
                      onChange={(e) =>
                        updateLine(idx, {
                          debit: e.target.value,
                          credit: e.target.value ? "" : line.credit,
                        })
                      }
                      className="h-10 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      value={line.credit}
                      disabled={pending}
                      onChange={(e) =>
                        updateLine(idx, {
                          credit: e.target.value,
                          debit: e.target.value ? "" : line.debit,
                        })
                      }
                      className="h-10 text-right"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    {lines.length > 2 ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => removeLine(idx)}
                        className="text-msk-ink/35 hover:text-msk-coral"
                        aria-label="Retirer la ligne"
                      >
                        ✕
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>

        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium",
            totals.balanced
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-msk-coral/10 text-msk-coral",
          )}
        >
          <span>
            Débit {formatXof(totals.debit)} · Crédit {formatXof(totals.credit)}
          </span>
          <span>
            {totals.balanced ? "Équilibrée ✓" : "Non équilibrée"}
          </span>
        </div>
      </div>

      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}

      <Button type="submit" disabled={pending || !totals.balanced}>
        {pending ? "Création…" : "Créer l’écriture (brouillon)"}
      </Button>
    </form>
  );
}
