import Link from "next/link";
import { ArrowUpRight, Building2, MapPin, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ContactDuplicateCandidate,
  OrgDuplicateCandidate,
} from "@/lib/crm/duplicates";

function pct(score: number) {
  return Math.round(score * 100);
}

export function OrgDuplicateMatchCard({
  candidate,
}: {
  candidate: OrgDuplicateCandidate;
}) {
  const exact = candidate.kind === "exact";
  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm",
        exact
          ? "border-msk-coral/35 ring-1 ring-msk-coral/10"
          : "border-msk-blue/25 ring-1 ring-msk-blue/10",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={exact ? "coral" : "blue"}>
              {exact ? "Identique" : `~${pct(candidate.score)} %`}
            </Badge>
            <Badge tone="muted">
              {candidate.entity === "client" ? "Client" : "Prospect"}
            </Badge>
            {candidate.stageLabel ? (
              <Badge tone="muted">{candidate.stageLabel}</Badge>
            ) : null}
          </div>
          <h3 className="text-base font-semibold text-msk-ink">
            {candidate.name}
          </h3>
          <p className="text-xs text-msk-ink/50">
            {exact
              ? "Même nom déjà enregistré — ouvrez la fiche plutôt que de recréer."
              : "Nom proche — vérifiez avant de continuer."}
          </p>
        </div>
        <Link
          prefetch={false}
          href={candidate.href}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition",
            exact
              ? "bg-msk-coral text-white hover:bg-msk-coral/90"
              : "bg-msk-blue text-white hover:bg-msk-blue/90",
          )}
        >
          Ouvrir la fiche
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35" aria-hidden />
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              Ville / secteur
            </dt>
            <dd className="text-msk-ink/75">
              {[candidate.city, candidate.sector].filter(Boolean).join(" · ") ||
                "—"}
            </dd>
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          <UserRound
            className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
            aria-hidden
          />
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              Contact
            </dt>
            <dd className="text-msk-ink/75">
              {candidate.primaryContact || "—"}
            </dd>
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          <Building2
            className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
            aria-hidden
          />
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              Créé par
            </dt>
            <dd className="text-msk-ink/75">{candidate.createdBy}</dd>
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          <UserRound
            className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
            aria-hidden
          />
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              Suivi par
            </dt>
            <dd className="text-msk-ink/75">{candidate.owner}</dd>
          </div>
        </div>
      </dl>
    </article>
  );
}

export function ContactDuplicateMatchCard({
  candidate,
}: {
  candidate: ContactDuplicateCandidate;
}) {
  return (
    <article className="rounded-2xl border border-msk-coral/30 bg-white p-4 shadow-sm ring-1 ring-msk-coral/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="coral">Contact déjà connu</Badge>
            <Badge tone="muted">
              {candidate.entity === "client" ? "Client" : "Prospect"}
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-msk-ink">
            {candidate.contactName}
          </h3>
          <p className="text-sm text-msk-ink/65">
            Lié à <span className="font-medium">{candidate.orgName}</span>
            {candidate.city ? ` · ${candidate.city}` : ""}
          </p>
          <p className="text-xs text-msk-ink/45">
            Correspondance : {candidate.matchedVia}
          </p>
          <p className="text-xs text-msk-ink/45">
            Créé par {candidate.createdBy} · Suivi {candidate.owner}
          </p>
        </div>
        <Link
          prefetch={false}
          href={candidate.href}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-msk-coral px-3 text-sm font-medium text-white transition hover:bg-msk-coral/90"
        >
          Ouvrir la fiche
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
