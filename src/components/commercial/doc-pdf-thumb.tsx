"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import {
  GedPreviewModal,
  type PreviewDoc,
} from "@/components/ged/ged-preview-modal";
import { cn } from "@/lib/utils";

/**
 * Miniature PDF cliquable → aperçu Modal GED (même pattern que l’explorateur).
 */
export function DocPdfThumb({
  documentId,
  title,
  subtitle,
  className,
}: {
  documentId: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const doc: PreviewDoc = {
    id: documentId,
    originalName: title.endsWith(".pdf") ? title : `${title}.pdf`,
    mime: "application/pdf",
    size: 0,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group flex w-full max-w-xs flex-col overflow-hidden rounded-2xl border border-msk-ink/8 bg-white text-left shadow-sm transition hover:border-msk-blue/35 hover:shadow-md",
          className,
        )}
      >
        <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-b from-msk-chalk to-msk-chalk/40">
          <div className="flex flex-col items-center gap-2 text-msk-ink/35 transition group-hover:text-msk-blue">
            <FileText className="h-12 w-12" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              PDF
            </span>
          </div>
        </div>
        <div className="border-t border-msk-ink/6 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-msk-ink">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-msk-ink/45">{subtitle}</p>
          ) : null}
        </div>
      </button>
      <GedPreviewModal doc={doc} open={open} onOpenChange={setOpen} />
    </>
  );
}
