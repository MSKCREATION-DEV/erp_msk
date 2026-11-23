import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermissionFromPaysParam } from "@/lib/suivi/access";
import { listSvHrEmployeeOptions } from "@/lib/suivi/hr-employees";
import {
  svCountryDisplayLabel,
  withSvCountryQuery,
} from "@/lib/suivi/country";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvMovementForm } from "@/components/suivi/movement-form";

export const metadata: Metadata = { title: "Nouveau mouvement · Suivi" };

export default async function SuiviMouvementNouveauPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const rawSp = await searchParams;
  const country = requireSvPermissionFromPaysParam(
    user,
    "sv.movements.manage",
    rawSp,
    { missingHref: "/suivi/mouvements" },
  );
  const employeeOptions = await listSvHrEmployeeOptions();

  return (
    <PageShell>
      <PageHeader
        title="Nouveau mouvement"
        description={`Entrée ou sortie — registre trésorerie tampon · ${svCountryDisplayLabel(country)}.`}
        backHref={withSvCountryQuery("/suivi/mouvements", country)}
      />
      <SvMovementForm employeeOptions={employeeOptions} country={country} />
    </PageShell>
  );
}
