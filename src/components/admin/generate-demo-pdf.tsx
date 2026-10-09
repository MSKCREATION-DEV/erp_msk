"use client";

import { useActionState } from "react";
import { generateDemoPdfAction } from "@/actions/templates";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function GenerateDemoButton({ templateId }: { templateId: string }) {
  const [state, action, pending] = useActionState<
    ActionResult | null,
    FormData
  >(generateDemoPdfAction, null);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="templateId" value={templateId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Génération…" : "PDF démo"}
      </Button>
      {state?.error ? (
        <span className="text-xs text-msk-coral">{state.error}</span>
      ) : null}
      {state?.ok && state.message ? (
        <span className="max-w-[220px] text-right text-xs text-msk-blue">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
