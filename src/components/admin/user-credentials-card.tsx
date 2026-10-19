"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import {
  adminResetPasswordAction,
  type ActionResult,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * Panneau login + MDP temporaire — fallback quand Resend ne délivre pas.
 * Ne récupère jamais un ancien MDP (Auth hashé) : régénère à la demande.
 */
export function UserCredentialsCard({
  userId,
  email,
  firstName,
}: {
  userId: string;
  email: string;
  firstName: string;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    adminResetPasswordAction,
    null,
  );
  const [copied, setCopied] = useState<"login" | "password" | "both" | null>(
    null,
  );

  const login = state?.login ?? email;
  const tempPassword = state?.tempPassword ?? null;

  async function copy(text: string, kind: "login" | "password" | "both") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card className="border-msk-blue/20 bg-msk-blue/3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-msk-blue" aria-hidden />
          Identifiants de connexion
        </CardTitle>
        <CardDescription>
          E-mail non délivré ? Générez un mot de passe temporaire et
          communiquez-le à {firstName} (changement obligatoire à la 1ʳᵉ
          connexion).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Login (e-mail)</Label>
          <div className="mt-1 flex gap-2">
            <Input readOnly value={login} className="font-mono text-sm" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => void copy(login, "login")}
            >
              {copied === "login" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copier le login</span>
            </Button>
          </div>
        </div>

        {tempPassword ? (
          <div className="rounded-xl border border-msk-blue/25 bg-white p-4">
            <Label>Mot de passe temporaire</Label>
            <div className="mt-1 flex gap-2">
              <Input
                readOnly
                value={tempPassword}
                className="font-mono text-sm tracking-wide"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={() => void copy(tempPassword, "password")}
              >
                {copied === "password" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="sr-only">Copier le mot de passe</span>
              </Button>
            </div>
            <p className="mt-2 text-xs text-msk-ink/50">
              Affiché une seule fois ici — régénérez si besoin. Ne se stocke
              pas en clair.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() =>
                void copy(`Login : ${login}\nMot de passe : ${tempPassword}`, "both")
              }
            >
              {copied === "both" ? "Copié" : "Copier login + MDP"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-msk-ink/50">
            Aucun MDP temporaire affiché. Cliquez ci-dessous pour en générer
            un nouveau (écrase l’actuel côté Auth).
          </p>
        )}

        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" disabled={pending} size="sm">
            {pending
              ? "Génération…"
              : tempPassword
                ? "Régénérer un MDP temporaire"
                : "Générer & afficher un MDP temporaire"}
          </Button>
        </form>

        {state?.error ? (
          <p className="text-sm text-msk-coral" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.ok && state.message && !tempPassword ? (
          <p className="text-sm text-msk-blue">{state.message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
