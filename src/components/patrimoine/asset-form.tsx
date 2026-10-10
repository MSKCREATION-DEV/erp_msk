"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { disposeAssetAction, upsertAssetAction } from "@/actions/patrimoine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

type UserOpt = { id: string; firstName: string; lastName: string };

type Initial = {
  id?: string;
  code?: string;
  designation?: string;
  category?: string;
  acquiredAt?: string;
  valueXof?: number;
  location?: string | null;
  assignedToId?: string | null;
  amortYears?: number;
};

export function AssetForm({
  users,
  initial,
  redirectTo = "/patrimoine",
}: {
  users: UserOpt[];
  initial?: Initial;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    void run(async () => {
      const res = await upsertAssetAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.push(res.id ? `/patrimoine/${res.id}` : redirectTo);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={pending || undefined}>
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {error ? (
        <p className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Code *</Label>
          <Input
            id="code"
            name="code"
            required
            disabled={pending || !!initial?.id}
            defaultValue={initial?.code ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="category">Catégorie *</Label>
          <Input
            id="category"
            name="category"
            required
            disabled={pending}
            defaultValue={initial?.category ?? ""}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="designation">Désignation *</Label>
        <Input
          id="designation"
          name="designation"
          required
          disabled={pending}
          defaultValue={initial?.designation ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="acquiredAt">Date acquisition *</Label>
          <Input
            id="acquiredAt"
            name="acquiredAt"
            type="date"
            required
            disabled={pending}
            defaultValue={initial?.acquiredAt ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="valueXof">Valeur XOF *</Label>
          <Input
            id="valueXof"
            name="valueXof"
            type="number"
            min="0"
            required
            disabled={pending}
            defaultValue={initial?.valueXof ?? 0}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="location">Localisation</Label>
          <Input
            id="location"
            name="location"
            disabled={pending}
            defaultValue={initial?.location ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="assignedToId">Assigné à</Label>
          <select
            id="assignedToId"
            name="assignedToId"
            disabled={pending}
            defaultValue={initial?.assignedToId ?? ""}
            className="w-full rounded-lg border border-msk-paper bg-white px-3 py-2 text-sm"
          >
            <option value="">— Non assigné —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="amortYears">Amortissement (années)</Label>
        <Input
          id="amortYears"
          name="amortYears"
          type="number"
          min="1"
          max="50"
          disabled={pending}
          defaultValue={initial?.amortYears ?? 5}
        />
      </div>

      <Button type="submit" disabled={pending} className="bg-msk-blue">
        {pending ? "Enregistrement…" : initial?.id ? "Mettre à jour" : "Créer le bien"}
      </Button>
    </form>
  );
}

export function AssetDisposeButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function onDispose() {
    setError(null);
    const fd = new FormData();
    fd.set("assetId", assetId);
    fd.set("disposeNote", note);
    void run(async () => {
      const res = await disposeAssetAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-msk-coral">{error}</p>
      ) : null}
      <div>
        <Label htmlFor="disposeNote">Note de sortie</Label>
        <Input
          id="disposeNote"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={pending}
          placeholder="Cession, réforme…"
        />
      </div>
      <Button
        type="button"
        variant="danger"
        disabled={pending}
        className="border-msk-coral/40 text-msk-coral hover:bg-msk-coral/5"
        onClick={onDispose}
      >
        {pending ? "Sortie…" : "Sortir du patrimoine"}
      </Button>
    </div>
  );
}
