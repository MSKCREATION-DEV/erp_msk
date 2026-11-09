import { redirect } from "next/navigation";

/**
 * Route historique « Créances clients » — fusionnée dans `/comptabilite/clients`
 * (liste comptable complète). Conserve les liens/favoris existants sans 404 :
 * redirige vers le filtre statut « avec solde » (Ouvert + En retard), qui
 * correspond au périmètre de l’ancienne page.
 */
export default function CreancesRedirectPage() {
  redirect("/comptabilite/clients?statut=OUVERT,RETARD");
}
