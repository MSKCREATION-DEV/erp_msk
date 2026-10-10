"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateUserProfileAction } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

export function UserProfileEditForm({
  userId,
  firstName,
  lastName,
  email,
  phone,
}: {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          setError(null);
          setOkMsg(null);
          setOpen(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Modifier le profil
      </Button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    const fd = new FormData(e.currentTarget);
    fd.set("userId", userId);
    void run(async () => {
      const res = await updateUserProfileAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setOkMsg(res.message ?? "Profil mis à jour");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-lg space-y-3 rounded-xl border border-msk-ink/10 bg-msk-chalk/50 p-4"
      aria-busy={pending || undefined}
    >
      <p className="text-sm font-medium text-msk-ink">Modifier le profil</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="edit-firstName">Prénom</Label>
          <Input
            id="edit-firstName"
            name="firstName"
            defaultValue={firstName}
            required
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="edit-lastName">Nom</Label>
          <Input
            id="edit-lastName"
            name="lastName"
            defaultValue={lastName}
            required
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="edit-email">E-mail</Label>
          <Input
            id="edit-email"
            name="email"
            type="email"
            defaultValue={email}
            required
            disabled={pending}
          />
          <p className="mt-1 text-xs text-msk-ink/45">
            Met à jour aussi la connexion Auth (pas le mot de passe).
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="edit-phone">Téléphone</Label>
          <Input
            id="edit-phone"
            name="phone"
            defaultValue={phone ?? ""}
            disabled={pending}
          />
        </div>
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      {okMsg ? <p className="text-sm text-emerald-700">{okMsg}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
