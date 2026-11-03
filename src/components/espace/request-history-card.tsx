import type { ReactNode } from "react";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/lib/rh/labels";
import { cn } from "@/lib/utils";

export type RequestHistoryCardProps = {
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: BadgeTone;
  submittedAt: Date;
  submittedBy?: string | null;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  reviewActionLabel?: string;
  reason?: string | null;
  reviewNote?: string | null;
  footer?: ReactNode;
  className?: string;
};

function fmtWhen(d: Date): string {
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RequestHistoryCard({
  title,
  subtitle,
  statusLabel,
  statusTone,
  submittedAt,
  submittedBy,
  reviewedAt,
  reviewedBy,
  reviewActionLabel = "Traité",
  reason,
  reviewNote,
  footer,
  className,
}: RequestHistoryCardProps) {
  return (
    <Surface className={cn("p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-msk-ink">{title}</p>
          <p className="mt-0.5 text-sm text-msk-ink/55">{subtitle}</p>
        </div>
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </div>

      <dl className="mt-3 grid gap-2 text-xs text-msk-ink/55 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-msk-ink/40">Soumis le</dt>
          <dd className="mt-0.5 text-msk-ink/70">{fmtWhen(submittedAt)}</dd>
          {submittedBy ? (
            <dd className="text-msk-ink/50">par {submittedBy}</dd>
          ) : null}
        </div>
        {reviewedAt ? (
          <div>
            <dt className="font-medium text-msk-ink/40">{reviewActionLabel}</dt>
            <dd className="mt-0.5 text-msk-ink/70">{fmtWhen(reviewedAt)}</dd>
            {reviewedBy ? (
              <dd className="text-msk-ink/50">par {reviewedBy}</dd>
            ) : null}
          </div>
        ) : (
          <div>
            <dt className="font-medium text-msk-ink/40">Validation</dt>
            <dd className="mt-0.5 text-msk-ink/50">En attente RH</dd>
          </div>
        )}
      </dl>

      {reason ? (
        <p className="mt-3 rounded-lg bg-msk-chalk/80 px-3 py-2 text-sm text-msk-ink/70">
          <span className="font-medium text-msk-ink/50">Motif · </span>
          {reason}
        </p>
      ) : null}

      {reviewNote ? (
        <p className="mt-2 rounded-lg border border-msk-ink/8 px-3 py-2 text-sm text-msk-ink/70">
          <span className="font-medium text-msk-ink/50">Note RH · </span>
          {reviewNote}
        </p>
      ) : null}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </Surface>
  );
}
