import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { Surface } from "@/components/ui/surface";

/**
 * Panneau latéral Studio — création + aide syntaxe (équivalent Documentero
 * « New Template » + « Template Rules », sans promettre d’upload DOCX).
 */
export function TemplateStudioSidebar() {
  return (
    // Desktop : sticky sous le bandeau mesuré (--gabarits-sticky-top). Mobile = flux.
    <aside className="flex flex-col gap-4 lg:sticky lg:top-[var(--gabarits-sticky-top,13.75rem)] lg:z-10 lg:self-start">
      <Surface className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-msk-ink">Nouveau gabarit</h2>
          <p className="mt-1 text-xs leading-relaxed text-msk-ink/50">
            Créer un document Studio (blocs + variables), versionné et publié
            explicitement.
          </p>
        </div>
        <Link
          href="/administration/gabarits/nouveau"
          prefetch={false}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-msk-blue px-4 text-sm font-medium text-white transition hover:bg-msk-blue/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Créer un gabarit
        </Link>
        <Link
          href="/administration/gabarits/variables"
          prefetch={false}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink transition hover:bg-msk-chalk"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          Catalogue variables
        </Link>
        <p className="text-[11px] leading-relaxed text-msk-ink/40">
          Pas d’import Word (.docx) pour l’instant — le contenu se compose dans
          le Studio MSK (DSL / blocs).
        </p>
      </Surface>

      <Surface className="space-y-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-msk-ink">Règles gabarit</h2>
          <p className="mt-1 text-xs text-msk-ink/50">
            Syntaxe rapide pour les gabarits Studio.
          </p>
        </div>
        <dl className="space-y-3 text-xs">
          <div>
            <dt className="font-medium text-msk-ink/70">Variable</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-msk-blue">
              {"{{client.nom}}"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-msk-ink/70">Titre</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-msk-ink/60">
              # Titre du document
            </dd>
          </div>
          <div>
            <dt className="font-medium text-msk-ink/70">Encadré</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-msk-ink/60">
              {"> texte mis en évidence"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-msk-ink/70">Signature</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-msk-ink/60">
              {"[[SIGNATURE: Client | MSK]]"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-msk-ink/70">Séparateur</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-msk-ink/60">---</dd>
          </div>
        </dl>
      </Surface>
    </aside>
  );
}
