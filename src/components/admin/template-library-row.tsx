import Link from "next/link";
import {
  Download,
  FileText,
  FlaskConical,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TemplateCardActions } from "@/components/admin/template-card-actions";
import type { TemplateListMeta } from "@/lib/templates/list-meta";
import { cn } from "@/lib/utils";

export type TemplateLibraryRowProps = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  generatorKind: "LEGACY_CODE" | "ENGINE_BLOCKS";
  signatureEnabled: boolean;
  published: boolean;
  hasDraft?: boolean;
  typeLabel?: string;
  typeTone?: "blue" | "ink" | "success" | "muted" | "coral";
  meta: TemplateListMeta;
  /** Date affichée (création ou dernière modif.). */
  dateLabel: string;
  editHref?: string;
};

function exemplaireHref(id: string) {
  return `/api/administration/gabarits/${id}/exemplaire`;
}

/**
 * Ligne dense style bibliothèque documentaire (inspiration Documentero).
 * Actions documentaires visibles + ActionMenu pour le reste Studio.
 */
export function TemplateLibraryRow(props: TemplateLibraryRowProps) {
  const exemplaireOk =
    props.active &&
    (props.generatorKind === "LEGACY_CODE" ? true : props.published);

  return (
    <article
      className={cn(
        "group grid gap-3 border-b border-msk-ink/6 px-4 py-3.5 last:border-b-0",
        "sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_auto]",
        "items-center bg-white transition hover:bg-msk-blue/4",
      )}
    >
      {/* Nom + format + liens rapides */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <FileText
            className="h-4 w-4 shrink-0 text-msk-blue/70"
            aria-hidden
          />
          <Link
            href={`/administration/gabarits/${props.id}`}
            prefetch={false}
            className="truncate text-sm font-semibold text-msk-ink hover:text-msk-blue"
          >
            {props.name}
          </Link>
          <Badge tone="blue" className="shrink-0 tracking-caps uppercase">
            {props.meta.format}
          </Badge>
          {props.typeLabel ? (
            <Badge tone={props.typeTone ?? "ink"} className="shrink-0">
              {props.typeLabel}
            </Badge>
          ) : null}
          {!props.active ? <Badge tone="muted">Inactif</Badge> : null}
          {props.generatorKind === "ENGINE_BLOCKS" && !props.published ? (
            <Badge tone="coral">Non publié</Badge>
          ) : null}
          {props.hasDraft ? <Badge tone="ink">Brouillon</Badge> : null}
        </div>
        <p className="mt-0.5 truncate pl-6 font-mono text-[11px] text-msk-ink/40">
          {props.code}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
          <Link
            href={`/administration/gabarits/${props.id}`}
            prefetch={false}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-msk-ink/10 bg-msk-chalk/60 px-2 text-[11px] font-medium text-msk-ink/70 transition hover:border-msk-blue/30 hover:text-msk-blue"
          >
            <FileText className="h-3 w-3" aria-hidden />
            Fiche
          </Link>
          {props.editHref ? (
            <Link
              href={props.editHref}
              prefetch={false}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-msk-ink/10 bg-msk-chalk/60 px-2 text-[11px] font-medium text-msk-ink/70 transition hover:border-msk-blue/30 hover:text-msk-blue"
            >
              <Pencil className="h-3 w-3" aria-hidden />
              Éditer
            </Link>
          ) : null}
        </div>
      </div>

      {/* Métadonnées */}
      <div className="flex flex-wrap gap-1.5 pl-6 sm:pl-0">
        {props.meta.fieldsCount > 0 ? (
          <Badge
            tone="success"
            title={`${props.meta.fieldsCount} ${props.meta.fieldsLabel.toLowerCase()}`}
            className="tracking-caps uppercase"
          >
            {props.meta.fieldsCount} {props.meta.fieldsLabel}
          </Badge>
        ) : (
          <Badge tone="muted" className="tracking-caps uppercase">
            0 {props.meta.fieldsLabel}
          </Badge>
        )}
        {props.meta.blocksCount > 0 ? (
          <Badge
            tone="ink"
            title={`${props.meta.blocksCount} blocs de contenu`}
            className="tracking-caps uppercase"
          >
            {props.meta.blocksCount} Blocs
          </Badge>
        ) : null}
        <Badge
          tone={props.signatureEnabled ? "success" : "muted"}
          className="tracking-caps uppercase"
        >
          {props.signatureEnabled ? "Sign. ON" : "Sign. OFF"}
        </Badge>
      </div>

      {/* Date */}
      <p className="pl-6 text-xs text-msk-ink/45 sm:pl-0 sm:text-right">
        {props.dateLabel}
      </p>

      {/* Actions documentaires */}
      <div className="flex flex-wrap items-center justify-end gap-1 pl-6 sm:pl-0">
        {exemplaireOk ? (
          <a
            href={exemplaireHref(props.id)}
            target="_blank"
            rel="noopener noreferrer"
            title="Télécharger un exemplaire PDF"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-msk-ink/60 transition hover:bg-msk-chalk hover:text-msk-blue"
          >
            <Download className="h-4 w-4" aria-hidden />
            <span className="sr-only">Télécharger exemplaire</span>
          </a>
        ) : (
          <span
            className="inline-flex h-8 w-8 items-center justify-center text-msk-ink/20"
            title="Exemplaire indisponible"
          >
            <Download className="h-4 w-4" aria-hidden />
          </span>
        )}
        <Link
          href={`/administration/gabarits/${props.id}/playground`}
          prefetch={false}
          title="Playground"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg transition",
            exemplaireOk
              ? "text-msk-ink/60 hover:bg-msk-chalk hover:text-msk-blue"
              : "pointer-events-none text-msk-ink/20",
          )}
          aria-disabled={!exemplaireOk}
          tabIndex={exemplaireOk ? 0 : -1}
        >
          <FlaskConical className="h-4 w-4" aria-hidden />
          <span className="sr-only">Playground</span>
        </Link>
        {props.generatorKind === "ENGINE_BLOCKS" && props.editHref ? (
          <TemplateCardActions
            templateId={props.id}
            active={props.active}
            signatureEnabled={props.signatureEnabled}
            hasDraft={Boolean(props.hasDraft)}
            editHref={props.editHref}
          />
        ) : null}
      </div>
    </article>
  );
}
