import Link from "next/link";
import { ArrowRight, Download, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TemplateCardActions } from "@/components/admin/template-card-actions";

export type TemplateLibraryCardProps = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
  generatorKind: "LEGACY_CODE" | "ENGINE_BLOCKS";
  signatureEnabled: boolean;
  published: boolean;
  hasDraft?: boolean;
  typeLabel?: string;
  typeTone?: "blue" | "ink" | "success" | "muted" | "coral";
  familyLabel?: string;
  editHref?: string;
};

function exemplaireHref(id: string) {
  return `/api/administration/gabarits/${id}/exemplaire`;
}

export function TemplateLibraryCard(props: TemplateLibraryCardProps) {
  const exemplaireOk =
    props.active &&
    (props.generatorKind === "LEGACY_CODE" ? true : props.published);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-msk-ink/8 bg-white shadow-sm transition hover:border-msk-blue/35 hover:shadow-md">
      <Link
        href={`/administration/gabarits/${props.id}`}
        prefetch={false}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-msk-blue"
        aria-label={`Voir le gabarit ${props.name}`}
      />

      <div className="relative z-10 flex flex-1 flex-col p-5 pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 pr-8">
            <h3 className="truncate text-base font-semibold text-msk-ink group-hover:text-msk-blue">
              {props.name}
            </h3>
            <p className="mt-0.5 font-mono text-xs text-msk-ink/45">{props.code}</p>
          </div>
          {props.generatorKind === "ENGINE_BLOCKS" && props.editHref ? (
            <div className="pointer-events-auto shrink-0">
              <TemplateCardActions
                templateId={props.id}
                active={props.active}
                signatureEnabled={props.signatureEnabled}
                hasDraft={Boolean(props.hasDraft)}
                editHref={props.editHref}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {props.generatorKind === "ENGINE_BLOCKS" ? (
            <Badge tone="success">Studio</Badge>
          ) : null}
          {props.typeLabel ? (
            <Badge tone={props.typeTone ?? "ink"}>{props.typeLabel}</Badge>
          ) : null}
          {props.familyLabel ? <Badge tone="muted">{props.familyLabel}</Badge> : null}
          <Badge tone={props.active ? "success" : "muted"}>
            {props.active ? "Actif" : "Inactif"}
          </Badge>
          {props.generatorKind === "ENGINE_BLOCKS" ? (
            <Badge tone={props.published ? "blue" : "coral"}>
              {props.published ? "Publié" : "Non publié"}
            </Badge>
          ) : null}
          {props.hasDraft ? <Badge tone="ink">Brouillon</Badge> : null}
          <Badge tone={props.signatureEnabled ? "success" : "muted"}>
            {props.signatureEnabled ? "Signature ON" : "Signature OFF"}
          </Badge>
        </div>

        <p className="mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-msk-ink/55">
          {props.description ?? "—"}
        </p>
      </div>

      <div
        className={cn(
          "relative z-10 flex flex-wrap items-center gap-2 border-t border-msk-ink/6 bg-msk-chalk/40 px-4 py-3",
          "pointer-events-auto",
        )}
      >
        <Link
          href={`/administration/gabarits/${props.id}`}
          prefetch={false}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-msk-blue hover:bg-white"
        >
          Voir
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        {exemplaireOk ? (
          <a
            href={exemplaireHref(props.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-msk-ink hover:bg-white"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Télécharger
          </a>
        ) : (
          <span className="text-xs text-msk-ink/35">Exemplaire indisponible</span>
        )}
        <Link
          href={`/administration/gabarits/${props.id}/playground`}
          prefetch={false}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium",
            exemplaireOk
              ? "text-msk-ink hover:bg-white"
              : "pointer-events-none text-msk-ink/30",
          )}
          aria-disabled={!exemplaireOk}
          tabIndex={exemplaireOk ? 0 : -1}
        >
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />
          Playground
        </Link>
      </div>
    </article>
  );
}
