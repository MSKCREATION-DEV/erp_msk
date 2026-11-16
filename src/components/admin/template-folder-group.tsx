import { Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import type { ReactNode } from "react";

/**
 * En-tête de dossier / famille — équivalent Documentero « Contracts » folder row.
 */
export function TemplateFolderGroup({
  title,
  hint,
  count,
  tone = "blue",
  children,
  empty,
}: {
  title: string;
  hint?: string;
  count: number;
  tone?: "blue" | "ink" | "success";
  children: ReactNode;
  empty?: ReactNode;
}) {
  return (
    <Surface className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-msk-ink/8 bg-msk-chalk/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-msk-blue shadow-sm ring-1 ring-msk-ink/6">
            <Folder className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-msk-ink">{title}</h2>
              <Badge tone={tone}>{count}</Badge>
            </div>
            {hint ? (
              <p className="mt-0.5 text-xs text-msk-ink/45">{hint}</p>
            ) : null}
          </div>
        </div>
      </div>

      {count === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-msk-ink/45">
          {empty ?? "Aucun gabarit dans ce dossier."}
        </div>
      ) : (
        <div>
          <div
            className="hidden border-b border-msk-ink/6 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-caps text-msk-ink/35 sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_auto] sm:gap-3"
            aria-hidden
          >
            <span>Nom du document</span>
            <span>Contenu</span>
            <span className="text-right">Créé / maj</span>
            <span className="text-right">Actions</span>
          </div>
          {children}
        </div>
      )}
    </Surface>
  );
}
