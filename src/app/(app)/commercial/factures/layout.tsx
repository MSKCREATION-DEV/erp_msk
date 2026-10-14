import { redirect } from "next/navigation";
import { COM_DOCS_GATED } from "@/lib/commercial/gates";

/** Direction 13/10 — factures gelées (accès URL inclus). */
export default function FacturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (COM_DOCS_GATED) redirect("/commercial");
  return children;
}
