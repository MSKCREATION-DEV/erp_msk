"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import type { LinkedRhDoc } from "@/lib/rh/docs";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import { Button } from "@/components/ui/button";
import {
  GedPreviewModal,
  type PreviewDoc,
} from "@/components/ged/ged-preview-modal";

export function EspaceDocsList({ docs }: { docs: LinkedRhDoc[] }) {
  const [preview, setPreview] = useState<PreviewDoc | null>(null);
  const [open, setOpen] = useState(false);

  if (docs.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-msk-ink/50">
        Aucun document RH pour le moment. L&apos;administration RH les dépose
        ici après génération.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-msk-ink/5">
        {docs.map((d) => (
          <li
            key={`${d.kind}-${d.id}`}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-msk-ink">{d.label}</p>
              <p className="truncate text-xs text-msk-ink/45">
                {d.originalName} · {d.createdAt.toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPreview({
                    id: d.id,
                    originalName: d.originalName,
                    mime: d.mime,
                    size: d.size,
                  });
                  setOpen(true);
                }}
              >
                <Eye className="h-4 w-4" aria-hidden />
                Aperçu
              </Button>
              <DocDownloadButton
                documentId={d.id}
                label="Télécharger"
                variant="primary"
                size="sm"
              />
            </div>
          </li>
        ))}
      </ul>
      <GedPreviewModal
        doc={preview}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
