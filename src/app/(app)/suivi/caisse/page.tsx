import { redirect } from "next/navigation";

/** Alias legacy — UI = Mouvements. */
export default function SuiviCaisseAliasPage() {
  redirect("/suivi/mouvements");
}
