import { redirect } from "next/navigation";

/**
 * Ownership Comptabilité (facturation/paiements) — ancienne route Commercial.
 * Redirect pour éviter tout 404 sur les liens existants / favoris.
 */
export default async function CommercialFacturesRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string" && value) params.set(key, value);
  }
  const qs = params.toString();
  redirect(qs ? `/comptabilite/factures?${qs}` : "/comptabilite/factures");
}
