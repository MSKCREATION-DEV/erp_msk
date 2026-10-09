"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

type UserAvatarProps = {
  firstName: string;
  lastName: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-base",
} as const;

export function UserAvatar({
  firstName,
  lastName,
  src,
  size = "md",
  className,
}: UserAvatarProps) {
  return (
    <Avatar className={cn(sizes[size], className)}>
      {src ? <AvatarImage src={src} alt={`${firstName} ${lastName}`} /> : null}
      <AvatarFallback className={cn(size === "xl" && "text-base")}>
        {initials(firstName, lastName)}
      </AvatarFallback>
    </Avatar>
  );
}
