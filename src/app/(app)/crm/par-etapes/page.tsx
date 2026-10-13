import { redirect } from "next/navigation";

/** Ancienne route « Par étapes » — la vue board a été retirée. */
export default function CrmParEtapesRedirect() {
  redirect("/crm/prospects");
}
