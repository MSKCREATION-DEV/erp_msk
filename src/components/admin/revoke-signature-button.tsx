"use client";

import { useActionState } from "react";
import { revokeSignatureAction } from "@/actions/signatures";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function RevokeSignatureButton({ signatureId }: { signatureId: string }) {
  const [, action, pending] = useActionState<ActionResult | null, FormData>(
    revokeSignatureAction,
    null,
  );

  return (
    <form action={action}>
      <input type="hidden" name="signatureId" value={signatureId} />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        Révoquer
      </Button>
    </form>
  );
}
