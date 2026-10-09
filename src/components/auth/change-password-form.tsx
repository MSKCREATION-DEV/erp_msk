"use client";

import { useActionState } from "react";
import { changePasswordAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    changePasswordAction,
    null,
  );

  return (
    <form action={action} className="space-y-5">
      <div>
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
        <p className="mt-1.5 text-xs text-msk-ink/45">
          10+ caractères, majuscule, minuscule, chiffre
        </p>
      </div>
      <div>
        <Label htmlFor="confirm">Confirmer</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      {state?.error ? (
        <p className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer et continuer"}
      </Button>
    </form>
  );
}
