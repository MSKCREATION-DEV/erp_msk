import { redirect } from "next/navigation";

/** Bulletins → coffre documents (catégorie paie). */
export default function EspaceBulletinsRedirectPage() {
  redirect("/espace/documents?cat=paie");
}
