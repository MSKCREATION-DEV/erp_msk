"use client";

import { useActionState } from "react";
import { revokeSignatureAction } from "@/actions/signatures";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { useActionStateToast } from "@/hooks/use-action-state-toast";

export function RevokeSignatureButton({ signatureId }: { signatureId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    revokeSignatureAction,
    null,
  );
  useActionStateToast(state);

  return (
    <form action={action}>
      <input type="hidden" name="signatureId" value={signatureId} />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        Révoquer
      </Button>
    </form>
  );
}
