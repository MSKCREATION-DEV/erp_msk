import { redirect } from "next/navigation";
import { COM_DOCS_GATED } from "@/lib/commercial/gates";

/** Direction 13/10 — devis gelés (accès URL inclus). */
export default function DevisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (COM_DOCS_GATED) redirect("/commercial");
  return children;
}
