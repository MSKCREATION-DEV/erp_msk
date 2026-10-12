"use client";

import { usePathname } from "next/navigation";

/** Masque la sous-nav sur le hub Menu (`/commercial`). */
export function CommercialNavGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/commercial") return null;
  return <>{children}</>;
}
