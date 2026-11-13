"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Download, FlaskConical } from "lucide-react";
import { Surface } from "@/components/ui/surface";

type Props = {
  templateId: string;
  templateName: string;
  available: boolean;
  /** Gabarit Studio — affiche lien Playground éditable. */
  engineBlocks?: boolean;
};

export function TemplateExemplairePanel({
  templateId,
  templateName,
  available,
  engineBlocks = false,
}: Props) {
  const src = useMemo(
    () => `/api/administration/gabarits/${templateId}/exemplaire`,
    [templateId],
  );

  if (!available) {
    return (
      <Surface className="p-5">
        <p className="text-sm text-msk-coral">
          Exemplaire indisponible — publiez une version ou réactivez le gabarit.
        </p>
      </Surface>
    );
  }

  return (
    <Surface className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-msk-ink/6 bg-gradient-to-r from-msk-blue/6 via-white to-msk-chalk/80 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-msk-ink">Exemplaire</h2>
          <p className="text-xs text-msk-ink/50">
            Données par défaut du catalogue — généré à la volée, sans passer par la GED.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-msk-ink/15 bg-white px-3 text-xs font-medium text-msk-ink hover:bg-msk-chalk"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Télécharger
          </a>
          <Link
            href={`/administration/gabarits/${templateId}/playground`}
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-msk-blue px-3 text-xs font-medium text-white hover:bg-msk-blue/90"
          >
            <FlaskConical className="h-3.5 w-3.5" aria-hidden />
            Playground
          </Link>
        </div>
      </div>
      <iframe
        title={`Exemplaire — ${templateName}`}
        src={src}
        className="h-[min(72vh,42rem)] w-full border-0 bg-white"
      />
      {engineBlocks ? (
        <p className="border-t border-msk-ink/6 px-5 py-3 text-xs text-msk-ink/45">
          Pour modifier en-tête, sections et signature avant enregistrement →{" "}
          <Link href={`/administration/gabarits/${templateId}/playground`} className="text-msk-blue hover:underline">
            ouvrir le Playground
          </Link>
          .
        </p>
      ) : null}
    </Surface>
  );
}
