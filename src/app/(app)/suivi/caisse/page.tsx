import { redirect } from "next/navigation";

/**
 * Alias legacy — UI = Mouvements (pays obligatoire).
 * Sans `?pays=` → hub pour choisir Mali / Togo.
 */
export default function SuiviCaisseAliasPage() {
  redirect("/suivi");
}
