import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Label formulaire — `*` obligatoire en coral MSK.
 */
export function FieldLabel({
  required,
  children,
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium text-msk-ink/80",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <>
          <span className="ml-0.5 font-semibold text-msk-coral" aria-hidden>
            *
          </span>
          <span className="sr-only"> (obligatoire)</span>
        </>
      ) : null}
    </label>
  );
}

export function FieldHint({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-1.5 text-xs text-msk-ink/45", className)}>{children}</p>
  );
}

export function FieldError({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn("mt-1.5 text-xs font-medium text-msk-coral", className)}
    >
      {children}
    </p>
  );
}
