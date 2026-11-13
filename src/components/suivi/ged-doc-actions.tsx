"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import {
  GedPreviewModal,
  type PreviewDoc,
} from "@/components/ged/ged-preview-modal";

/**
 * Raccourcis ouverture document GED Suivi (contrats / factures seedés).
 * Pattern aligné Commercial : Voir (modal) + Télécharger (URL signée).
 */
export function SvGedDocActions({
  documentId,
  originalName,
  mime,
  size = 0,
  compact = false,
}: {
  documentId: string;
  originalName: string;
  mime: string;
  size?: number;
  /** Inline dans une barre d’actions (pas de marge haute). */
  compact?: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const doc: PreviewDoc = {
    id: documentId,
    originalName,
    mime,
    size,
  };

  return (
    <div
      className={
        compact
          ? "inline-flex flex-wrap items-center gap-2"
          : "mt-2 flex flex-wrap items-center gap-2"
      }
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setPreviewOpen(true)}
      >
        <Eye className="mr-1.5 size-3.5" aria-hidden />
        Voir
      </Button>
      <DocDownloadButton documentId={documentId} label="Télécharger" />
      <GedPreviewModal
        doc={doc}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
