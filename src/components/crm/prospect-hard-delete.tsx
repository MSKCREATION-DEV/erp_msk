"use client";

import { useCallback } from "react";
import {
  deleteProspectHardAction,
  previewProspectHardDeleteAction,
} from "@/actions/crm";
import { HardDeleteConfirmControl } from "@/components/crm/hard-delete-confirm";

export function ProspectHardDeleteControl({
  opportunityId,
  entityLabel,
  compact = false,
  className,
}: {
  opportunityId: string;
  entityLabel: string;
  compact?: boolean;
  className?: string;
}) {
  const preview = useCallback(
    () => previewProspectHardDeleteAction(opportunityId),
    [opportunityId],
  );

  const onConfirm = useCallback(async () => {
    const fd = new FormData();
    fd.set("opportunityId", opportunityId);
    return deleteProspectHardAction(fd);
  }, [opportunityId]);

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
