"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProjectAction } from "@/actions/projets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

export function ProjectForm() {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    void run(async () => {
      const res = await createProjectAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.push(res.id ? `/projets/${res.id}` : "/projets");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={pending || undefined}>
      {error ? (
        <p className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Code *</Label>
          <Input id="code" name="code" required disabled={pending} />
        </div>
        <div>
          <Label htmlFor="budgetXof">Budget XOF</Label>
          <Input
            id="budgetXof"
            name="budgetXof"
            type="number"
            min="0"
            disabled={pending}
            defaultValue={0}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="name">Nom *</Label>
        <Input id="name" name="name" required disabled={pending} />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" disabled={pending} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Début</Label>
          <Input id="startDate" name="startDate" type="date" disabled={pending} />
        </div>
        <div>
          <Label htmlFor="endDate">Fin</Label>
          <Input id="endDate" name="endDate" type="date" disabled={pending} />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="bg-msk-blue">
        {pending ? "Création…" : "Créer le projet"}
      </Button>
    </form>
  );
}
