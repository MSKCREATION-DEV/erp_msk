import { NetworkChannelIcon } from "@/components/brand/channel-icons";
import { SOCIAL_NETWORKS, type SocialUrls } from "@/lib/crm/social";
import { cn } from "@/lib/utils";

/**
 * Badges réseaux entreprise (même langage visuel que les badges d’offre),
 * cliquables vers l’URL saisie à la création / édition.
 */
export function SocialNetworkBadges({
  urls,
  className,
  emptyLabel,
}: {
  urls: SocialUrls;
  className?: string;
  /** Si fourni et aucun lien : message discret. */
  emptyLabel?: string;
}) {
  const links = SOCIAL_NETWORKS.map((n) => ({
    ...n,
    url: urls[n.field]?.trim() || null,
  })).filter((n): n is (typeof n) & { url: string } => Boolean(n.url));

  if (links.length === 0) {
    return emptyLabel ? (
      <p className={cn("text-sm text-msk-ink/40", className)}>{emptyLabel}</p>
    ) : null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {links.map((n) => (
        <a
          key={n.field}
          href={n.url}
          target="_blank"
          rel="noreferrer"
          title={`${n.label} — ${n.url}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-msk-ink/10 bg-white px-2.5 py-1 text-xs font-medium text-msk-ink shadow-sm transition hover:border-msk-blue/30 hover:bg-msk-blue/4 hover:text-msk-blue"
        >
          <NetworkChannelIcon network={n.key} className="h-3.5 w-3.5" />
          {n.label}
        </a>
      ))}
    </div>
  );
}
