import { redirect } from "next/navigation";

/**
 * Ownership Comptabilité (facturation/paiements) — ancienne route Commercial.
 * Redirect pour éviter tout 404 sur les liens existants / favoris.
 */
export default async function CommercialFactureDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/comptabilite/factures/${id}`);
}
