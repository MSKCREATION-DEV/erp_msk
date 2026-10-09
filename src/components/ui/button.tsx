import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "bg-msk-blue text-white hover:bg-msk-blue/90 focus-visible:ring-msk-blue/40",
  secondary:
    "bg-white text-msk-ink border border-msk-ink/15 hover:bg-msk-chalk focus-visible:ring-msk-blue/30",
  ghost: "bg-transparent text-msk-ink hover:bg-msk-ink/5 focus-visible:ring-msk-blue/30",
  danger:
    "bg-msk-coral text-white hover:bg-msk-coral/90 focus-visible:ring-msk-coral/40",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium tracking-tight transition focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
