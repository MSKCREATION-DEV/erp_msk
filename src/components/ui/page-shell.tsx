import { cn } from "@/lib/utils";

/** Contenu app : occupe toute la largeur du parent (pas de max-width centré). */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full space-y-6", className)}>{children}</div>;
}
