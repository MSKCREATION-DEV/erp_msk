"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetRequestForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    requestPasswordResetAction,
    null,
  );

  return (
    <form action={action} className="space-y-5">
      <div>
        <Label htmlFor="email">Votre e-mail professionnel</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="note">Message (optionnel)</Label>
        <Input id="note" name="note" type="text" placeholder="Contexte rapide…" />
      </div>
      {state?.message ? (
        <p className="rounded-lg border border-msk-blue/20 bg-msk-blue/5 px-3 py-2 text-sm text-msk-ink" role="status">
          {state.message}
        </p>
      ) : null}
      {state?.error ? (
        <p className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Envoi…" : "Notifier les administrateurs"}
      </Button>
      <p className="text-center text-sm">
        <Link
          href="/login"
          className="cursor-pointer font-medium text-msk-blue hover:underline"
        >
          Retour connexion
        </Link>
      </p>
    </form>
  );
}
