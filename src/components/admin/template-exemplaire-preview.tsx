"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  FileText,
  FileWarning,
  FlaskConical,
  Maximize2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

type Props = {
  templateId: string;
  templateName: string;
  available: boolean;
  /** Gabarit Studio — lien Playground éditable. */
  engineBlocks?: boolean;
  className?: string;
};

/**
 * Miniature exemplaire PDF + actions — clic → modal plein document.
 * URL = génération à la volée (pas GED), même route que le listing.
 */
export function TemplateExemplairePreview({
  templateId,
  templateName,
  available,
  engineBlocks = false,
  className,
}: Props) {
  const src = useMemo(
    () => `/api/administration/gabarits/${templateId}/exemplaire`,
    [templateId],
  );
  const [open, setOpen] = useState(false);

  if (!available) {
    return (
      <Surface className={cn("space-y-3 p-4", className)}>
        <h2 className="text-sm font-semibold text-msk-ink">Exemplaire</h2>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-msk-coral/30 bg-msk-coral/5 px-3 py-8 text-center">
          <FileWarning className="h-8 w-8 text-msk-coral/70" aria-hidden />
          <p className="text-xs leading-relaxed text-msk-coral">
            Indisponible — publiez une version ou réactivez le gabarit.
          </p>
        </div>
      </Surface>
    );
  }

  return (
    <>
      <Surface className={cn("overflow-hidden p-0", className)}>
        <div className="space-y-1 border-b border-msk-ink/6 px-4 py-3">
          <h2 className="text-sm font-semibold text-msk-ink">Exemplaire</h2>
          <p className="text-[11px] leading-relaxed text-msk-ink/45">
            Données catalogue — à la volée, hors GED.
          </p>
        </div>

        <div className="space-y-3 p-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative block w-full overflow-hidden rounded-xl border border-msk-ink/8 bg-msk-chalk text-left shadow-sm transition hover:border-msk-blue/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40"
            aria-label={`Agrandir l’exemplaire ${templateName}`}
          >
            <div className="relative h-52 w-full overflow-hidden bg-gradient-to-b from-msk-chalk to-white">
              <iframe
                title={`Miniature — ${templateName}`}
                src={src}
                tabIndex={-1}
                className="pointer-events-none absolute inset-0 h-[280%] w-[280%] origin-top-left scale-[0.36] border-0 bg-white"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-msk-ink/70 to-transparent px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-white">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  PDF
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-caps text-msk-ink opacity-90 transition group-hover:opacity-100">
                  <Maximize2 className="h-3 w-3 text-msk-blue" aria-hidden />
                  Agrandir
                </span>
              </div>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-msk-ink/15 bg-white px-2 text-xs font-medium text-msk-ink transition hover:bg-msk-chalk"
            >
              <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Télécharger
            </a>
            <Link
              href={`/administration/gabarits/${templateId}/playground`}
              prefetch={false}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-msk-blue px-2 text-xs font-medium text-white transition hover:bg-msk-blue/90"
            >
              <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Playground
            </Link>
          </div>

          {engineBlocks ? (
            <p className="text-[11px] leading-relaxed text-msk-ink/40">
              Modifier en-tête, sections et signature → Playground.
            </p>
          ) : null}
        </div>
      </Surface>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Exemplaire — ${templateName}`}
        description="Aperçu généré à la volée (données catalogue)"
        size="full"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Nouvel onglet
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const a = document.createElement("a");
                a.href = src;
                a.download = `${templateName}.pdf`;
                a.target = "_blank";
                a.rel = "noopener";
                a.click();
              }}
            >
              <Download className="h-4 w-4" aria-hidden />
              Télécharger
            </Button>
          </>
        }
      >
        <div className="p-3 sm:p-4">
          {open ? (
            <iframe
              title={`Exemplaire — ${templateName}`}
              src={src}
              className="h-[min(75vh,40rem)] w-full rounded-lg border border-msk-ink/8 bg-white"
            />
          ) : null}
        </div>
      </Modal>
    </>
  );
}
