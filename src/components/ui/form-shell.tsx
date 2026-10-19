import type { ReactNode } from "react";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/**
 * Conteneur formulaire plein largeur (règle absolue forms-full-width-ux).
 */
export function FormShell({
  children,
  footer,
  className,
  bodyClassName,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Surface className={cn("w-full overflow-hidden p-0", className)}>
      <div className={cn("p-5 sm:p-6 lg:p-8", bodyClassName)}>{children}</div>
      {footer ? (
        <div className="sticky bottom-0 border-t border-msk-ink/6 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
          {footer}
        </div>
      ) : null}
    </Surface>
  );
}
