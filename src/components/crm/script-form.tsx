"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertCrmScriptAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import { SOURCE_LABELS } from "@/lib/crm/labels";
import type { CrmSource } from "@prisma/client";

const CHANNELS = Object.keys(SOURCE_LABELS) as CrmSource[];

type Initial = {
  id?: string;
  code?: string;
  channel?: CrmSource;
  title?: string;
  body?: string;
  tips?: string;
  sortOrder?: string;
};

export function ScriptForm({
  initial,
  redirectTo = "/crm/scripts",
}: {
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
      const res = await upsertCrmScriptAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.push(redirectTo);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3"
      aria-busy={pending || undefined}
    >
      {initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}
      <div>
        <Label htmlFor="code">Code unique</Label>
        {initial?.id ? (
          <>
            <Input
              id="code"
              defaultValue={initial.code}
              disabled
              className="opacity-70"
            />
            <input type="hidden" name="code" value={initial.code} />
          </>
        ) : (
          <Input
            id="code"
            name="code"
            required
            placeholder="ig_premier_contact"
            disabled={pending}
          />
        )}
      </div>
      <div>
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={initial?.title}
          disabled={pending}
        />
      </div>
      <div>
        <Label htmlFor="channel">Canal</Label>
        <select
          id="channel"
          name="channel"
          disabled={pending}
          className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          defaultValue={initial?.channel ?? "INSTAGRAM"}
        >
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {SOURCE_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="body">Corps du script</Label>
        <textarea
          id="body"
          name="body"
          required
          rows={10}
          defaultValue={initial?.body}
          disabled={pending}
          placeholder="Bonjour {{prenom}}…"
          className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 font-mono text-sm leading-relaxed"
        />
        <p className="mt-1 text-xs text-msk-ink/40">
          Variables : {"{{prenom}}"}, {"{{entreprise}}"}, {"{{offre}}"},{" "}
          {"{{commercial}}"}
        </p>
      </div>
      <div>
        <Label htmlFor="tips">Conseils (optionnel)</Label>
        <textarea
          id="tips"
          name="tips"
          rows={2}
          defaultValue={initial?.tips}
          disabled={pending}
          className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div>
        <Label htmlFor="sortOrder">Ordre d’affichage</Label>
        <Input
          id="sortOrder"
          name="sortOrder"
          inputMode="numeric"
          defaultValue={initial?.sortOrder ?? "100"}
          disabled={pending}
        />
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
