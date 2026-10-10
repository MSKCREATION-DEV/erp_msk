import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type Breadcrumb = { label: string; href?: string };

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
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {backHref ? (
          <Link prefetch={false}
            href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-msk-ink/45 transition hover:text-msk-blue"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-msk-ink sm:text-3xl">
          {title}
        </h1>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav
            aria-label="Fil d’Ariane"
            className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-msk-ink/45"
          >
            {breadcrumbs.map((crumb, i) => (
              <span
                key={`${crumb.label}-${i}`}
                className="inline-flex items-center gap-1.5"
              >
                {i > 0 ? <span aria-hidden>/</span> : null}
                {crumb.href ? (
                  <Link prefetch={false}
                    href={crumb.href}
                    className="cursor-pointer hover:text-msk-blue"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-msk-ink/60">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-msk-ink/55">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
