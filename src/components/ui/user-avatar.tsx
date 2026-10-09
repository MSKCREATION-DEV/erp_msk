import { cn, initials } from "@/lib/utils";

type UserAvatarProps = {
  firstName: string;
  lastName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
} as const;

export function UserAvatar({
  firstName,
  lastName,
  size = "md",
  className,
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-msk-ink font-semibold text-white",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials(firstName, lastName)}
    </div>
  );
}
