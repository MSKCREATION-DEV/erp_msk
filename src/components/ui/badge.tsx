import { cn } from "@/lib/utils";

const tones = {
  blue: "bg-msk-blue/10 text-msk-blue",
  ink: "bg-msk-ink/8 text-msk-ink",
  coral: "bg-msk-coral/10 text-msk-coral",
  muted: "bg-msk-ink/5 text-msk-ink/60",
  success: "bg-emerald-500/10 text-emerald-700",
} as const;

export function Badge({
  children,
  tone = "ink",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium tracking-tight",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
