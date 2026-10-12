import { redirect } from "next/navigation";

/** Vue Par étapes = mode de Prospects (plus d’onglet séparé). */
export default function CrmParEtapesRedirect() {
  redirect("/crm/prospects?vue=etapes");
}
