"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import {
  GedPreviewModal,
  type PreviewDoc,
} from "@/components/ged/ged-preview-modal";

export function PayslipPdfActions({ doc }: { doc: PreviewDoc | null }) {
  const [open, setOpen] = useState(false);
  if (!doc) {
    return <span className="text-xs text-msk-ink/40">—</span>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setOpen(true)}
        >
          <Eye className="h-4 w-4" aria-hidden />
          Aperçu
        </Button>
        <DocDownloadButton
          documentId={doc.id}
          label="Télécharger"
          variant="primary"
          size="sm"
        />
      </div>
      <GedPreviewModal doc={doc} open={open} onOpenChange={setOpen} />
    </>
  );
}
