import type { ReactElement, ReactNode } from "react";
import type { CrmSource } from "@prisma/client";
import { cn } from "@/lib/utils";

/** Icônes de marque (SVG Simple Icons style) — origines & réseaux d’offre. */
type IconProps = { className?: string; title?: string };

function Svg({
  className,
  title,
  children,
  viewBox = "0 0 24 24",
}: IconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg
      viewBox={viewBox}
      className={cn("h-4 w-4 shrink-0", className)}
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-[#E4405F]", props.className)}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </Svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-[#1877F2]", props.className)}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </Svg>
  );
}

export function TikTokIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-[#000000]", props.className)}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12.97 2.78 1.66 4.31 1.64v3.3c-1.44.05-2.89-.36-4.13-1.08-.3-.19-.57-.41-.83-.64-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </Svg>
  );
}

export function LinkedInIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-[#0A66C2]", props.className)}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </Svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-[#25D366]", props.className)}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </Svg>
  );
}

export function SnapchatIcon(props: IconProps) {
  return (
    <span
      className={cn(
        "inline-flex h-4 w-4 items-center justify-center rounded-sm bg-[#FFFC00] text-msk-ink",
        props.className,
      )}
      aria-hidden={!props.title}
      title={props.title}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
        <path d="M12.18.008c-.784 0-1.42.64-1.42 1.428v.286c-2.01.13-3.55.92-4.63 2.22-.63.76-.99 1.64-1.12 2.6-.08.59.36 1.12.95 1.12h.01c.48 0 .9-.35.97-.83.1-.66.34-1.25.73-1.75.79-1.01 2.04-1.58 3.72-1.69v.56c0 .79.64 1.43 1.43 1.43.78 0 1.42-.64 1.42-1.43V3.65c1.68.11 2.93.68 3.72 1.69.39.5.63 1.09.73 1.75.07.48.49.83.97.83h.01c.59 0 1.03-.53.95-1.12-.13-.96-.49-1.84-1.12-2.6-1.08-1.3-2.62-2.09-4.63-2.22v-.286c0-.788-.636-1.428-1.42-1.428zm0 7.2c-3.9 0-7.07 2.29-7.07 5.11 0 1.12.55 2.14 1.49 2.93.28.24.36.64.19.97-.2.39-.41.79-.57 1.13-.1.2-.03.45.17.54.23.1.62.22 1.14.22.66 0 1.36-.2 1.95-.55.25-.15.55-.18.83-.08 1.17.41 2.46.41 3.63 0 .28-.1.58-.07.83.08.59.35 1.29.55 1.95.55.52 0 .91-.12 1.14-.22.2-.09.27-.34.17-.54-.16-.34-.37-.74-.57-1.13-.17-.33-.09-.73.19-.97.94-.79 1.49-1.81 1.49-2.93 0-2.82-3.17-5.11-7.07-5.11z" />
      </svg>
    </span>
  );
}

export function GoogleIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-[#4285F4]", props.className)}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.933 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.597 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </Svg>
  );
}

export function MapsIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-[#EA4335]", props.className)}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
    </Svg>
  );
}

export function MailChannelIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-msk-blue", props.className)}>
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </Svg>
  );
}

export function PhoneChannelIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-msk-ink/70", props.className)}>
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </Svg>
  );
}

export function TerrainIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-msk-ink/65", props.className)}>
      <path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z" />
    </Svg>
  );
}

export function RecommendIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-msk-coral", props.className)}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </Svg>
  );
}

export function OtherChannelIcon(props: IconProps) {
  return (
    <Svg {...props} className={cn("text-msk-ink/50", props.className)}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </Svg>
  );
}

const SOURCE_ICONS: Record<CrmSource, (props: IconProps) => ReactElement> = {
  INSTAGRAM: InstagramIcon,
  LINKEDIN: LinkedInIcon,
  WHATSAPP: WhatsAppIcon,
  TIKTOK: TikTokIcon,
  GOOGLE_MAPS: MapsIcon,
  GOOGLE: GoogleIcon,
  SNAPCHAT: SnapchatIcon,
  TERRAIN: TerrainIcon,
  RECOMMANDATION: RecommendIcon,
  EMAIL: MailChannelIcon,
  TELEPHONE: PhoneChannelIcon,
  AUTRE: OtherChannelIcon,
};

export function SourceChannelIcon({
  source,
  className,
}: {
  source: CrmSource;
  className?: string;
}) {
  const Icon = SOURCE_ICONS[source] ?? OtherChannelIcon;
  return <Icon className={className} title={source} />;
}

/** Clés config offre RS → icône. */
export function NetworkChannelIcon({
  network,
  className,
}: {
  network: string;
  className?: string;
}) {
  const key = network.toLowerCase();
  if (key === "instagram") return <InstagramIcon className={className} />;
  if (key === "facebook") return <FacebookIcon className={className} />;
  if (key === "tiktok") return <TikTokIcon className={className} />;
  if (key === "linkedin") return <LinkedInIcon className={className} />;
  if (key === "whatsapp") return <WhatsAppIcon className={className} />;
  if (key === "snapchat") return <SnapchatIcon className={className} />;
  return <OtherChannelIcon className={className} />;
}
