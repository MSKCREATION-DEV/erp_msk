"use client";

import { useActionState } from "react";
import { KeyRound, Mail } from "lucide-react";
import {
  adminSendPasswordResetLinkAction,
  adminSendTempPasswordEmailAction,
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

/**
 * Accès / sécurité — envoi lien ou MDP temporaire par e-mail uniquement.
 * Aucun secret affiché ou copiable dans l’UI.
 */
export function UserSecurityCard({
  userId,
  email,
  firstName,
}: {
  userId: string;
  email: string;
  firstName: string;
}) {
  const [linkState, linkAction, linkPending] = useActionState<
    ActionResult | null,
    FormData
  >(adminSendPasswordResetLinkAction, null);
  const [tempState, tempAction, tempPending] = useActionState<
    ActionResult | null,
    FormData
  >(adminSendTempPasswordEmailAction, null);

  const pending = linkPending || tempPending;
  const message = linkState?.message ?? tempState?.message;
  const error = linkState?.error ?? tempState?.error;

  return (
    <Card className="border-msk-blue/20 bg-msk-blue/3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-msk-blue" aria-hidden />
          Accès et mot de passe
        </CardTitle>
        <CardDescription>
          Envoyez un lien sécurisé ou un mot de passe temporaire à{" "}
          <span className="font-medium text-msk-ink">{firstName}</span> (
          {email}). Rien n’est affiché ici — uniquement par e-mail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form action={linkAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" disabled={pending} size="sm">
            <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {linkPending
              ? "Envoi du lien…"
              : "Envoyer un lien de réinitialisation"}
          </Button>
        </form>
        <form action={tempAction}>
          <input type="hidden" name="userId" value={userId} />
          <Button
            type="submit"
            variant="secondary"
            disabled={pending}
            size="sm"
          >
            {tempPending
              ? "Envoi…"
              : "Envoyer un mot de passe temporaire par e-mail"}
          </Button>
        </form>
        {error ? (
          <p className="text-sm text-msk-coral" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-msk-blue" role="status">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
