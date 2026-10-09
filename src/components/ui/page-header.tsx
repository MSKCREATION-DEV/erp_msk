import Link from "next/link";
import { cn } from "@/lib/utils";

export type Breadcrumb = { label: string; href?: string };

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
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
        <h1 className="text-2xl font-semibold tracking-tight text-msk-ink sm:text-3xl">
          {title}
        </h1>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav
            aria-label="Fil d’Ariane"
            className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-msk-ink/45"
          >
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1.5">
                {i > 0 ? <span aria-hidden>/</span> : null}
                {crumb.href ? (
                  <Link
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
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
