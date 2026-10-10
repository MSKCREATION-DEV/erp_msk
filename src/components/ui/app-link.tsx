import Link from "next/link";
import type { ComponentProps } from "react";

type AppLinkProps = Omit<ComponentProps<typeof Link>, "prefetch">;

/**
 * Link interne ERP — jamais de prefetch RSC.
 * Le prefetch Next (viewport) saturait le pool DB (15–20 routes × auth+Prisma).
 */
export function AppLink({ children, ...props }: AppLinkProps) {
  return (
    <Link prefetch={false} {...props}>
      {children}
    </Link>
  );
}
