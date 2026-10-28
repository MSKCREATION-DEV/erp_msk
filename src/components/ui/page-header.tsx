import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterPageBreadcrumbs } from "@/lib/ui/page-breadcrumbs";

export type Breadcrumb = { label: string; href?: string };

/**
 * En-tête de page : retour + fil d’Ariane utile + titre.
 * Les hubs de module (ex. « Commercial ») et les doublons titre/retour
 * sont retirés automatiquement — voir `filterPageBreadcrumbs`.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  backHref,
  backLabel = "Retour",
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  /** Lien retour explicite (liste / parent) — obligatoire sur create/edit/détail. */
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  const crumbs = filterPageBreadcrumbs(breadcrumbs ?? [], {
    title,
    backHref,
  });

  /** « Retour Commercial » → « Retour » (module déjà dans la nav). */
  const resolvedBackLabel = /^Retour\s+\S+$/i.test(backLabel)
    ? "Retour"
    : backLabel;

  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {backHref ? (
          <Link
            prefetch={false}
            href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-msk-ink/45 transition hover:text-msk-blue"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {resolvedBackLabel}
          </Link>
        ) : null}
        {crumbs.length > 0 ? (
          <nav
            aria-label="Fil d’Ariane"
            className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs text-msk-ink/40"
          >
            {crumbs.map((crumb, i) => (
              <span
                key={`${crumb.label}-${i}`}
                className="inline-flex items-center gap-1.5"
              >
                {i > 0 ? <span aria-hidden>/</span> : null}
                {crumb.href ? (
                  <Link
                    prefetch={false}
                    href={crumb.href}
                    className="cursor-pointer hover:text-msk-blue"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="break-words text-2xl font-semibold tracking-tight text-msk-ink sm:text-3xl">
          {title}
        </h1>
        {description && description !== title ? (
          <p className="mt-1.5 max-w-2xl break-words text-sm leading-relaxed text-msk-ink/55">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:max-w-[min(100%,36rem)] sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
