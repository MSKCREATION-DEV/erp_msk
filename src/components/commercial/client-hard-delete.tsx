"use client";

import { useCallback } from "react";
import {
  deleteClientHardAction,
  previewClientHardDeleteAction,
} from "@/actions/commercial";
import { HardDeleteConfirmControl } from "@/components/crm/hard-delete-confirm";

export function ClientHardDeleteControl({
  clientId,
  entityLabel,
  compact = false,
  className,
}: {
  clientId: string;
  entityLabel: string;
  compact?: boolean;
  className?: string;
}) {
  const preview = useCallback(
    () => previewClientHardDeleteAction(clientId),
    [clientId],
  );

  const onConfirm = useCallback(async () => {
    const fd = new FormData();
    fd.set("clientId", clientId);
    return deleteClientHardAction(fd);
  }, [clientId]);

  return (
    <HardDeleteConfirmControl
      entityLabel={entityLabel}
      preview={preview}
      onConfirm={onConfirm}
      compact={compact}
      triggerLabel="Supprimer"
      className={className}
    />
  );
}
