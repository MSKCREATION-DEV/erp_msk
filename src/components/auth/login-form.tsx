"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={action} className="space-y-5">
      <div>
        <Label htmlFor="email">E-mail professionnel</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="prenom@mskcreation.net"
        />
      </div>
      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••••••"
        />
      </div>
      {state?.error ? (
        <p
          className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-msk-ink/55">
        Mot de passe oublié ?{" "}
        <Link
          href="/demande-reset"
          className="cursor-pointer font-medium text-msk-blue hover:underline"
        >
          Demander une réinitialisation
        </Link>
      </p>
    </form>
  );
}
