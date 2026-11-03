import { redirect } from "next/navigation";

/** Contrats → coffre documents (catégorie professionnels). */
export default function EspaceContratsRedirectPage() {
  redirect("/espace/documents?cat=pro");
}
