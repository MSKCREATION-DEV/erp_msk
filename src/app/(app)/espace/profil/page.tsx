import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { formatSeniority } from "@/lib/espace/overview";
import {
  CONTRACT_TYPE_LABEL,
  EMPLOYEE_STATUS_LABEL,
  EMPLOYEE_TYPE_LABEL,
  employeeStatusTone,
} from "@/lib/rh/labels";
import { maskSensitive } from "@/lib/rh/profile-fields";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Mon profil" };

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-msk-ink/6 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs font-medium text-msk-ink/45">{label}</dt>
      <dd className="text-sm text-msk-ink sm:col-span-2">{value ?? "—"}</dd>
    </div>
  );
}

function ageFrom(birth: Date | null): string | null {
  if (!birth) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? `${age} ans` : null;
}

export default async function EspaceProfilPage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.profile.edit") && !hasPermission(user, "self.documents.view")) {
    redirect("/espace");
  }

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
    include: {
      manager: { select: { firstName: true, lastName: true, jobTitle: true } },
      contracts: {
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });
  if (!employee) redirect("/espace");

  const active = employee.contracts[0] ?? null;
  const seniority = formatSeniority(employee.hireDate);
  const age = ageFrom(employee.birthDate);

  return (
    <PageShell>
      <PageHeader
        title="Mon profil"
        description="Dossier personnel — les modifications passeront par une validation RH."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Profil" },
        ]}
      />

      <Surface className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-msk-ink">
            {employee.firstName} {employee.lastName}
          </h2>
          <Badge tone={employeeStatusTone(employee.status)}>
            {EMPLOYEE_STATUS_LABEL[employee.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-msk-ink/55">
          {employee.jobTitle ?? "Poste non renseigné"}
          {employee.department ? ` · ${employee.department}` : ""}
        </p>
        <p className="mt-3 rounded-lg bg-msk-blue/5 px-3 py-2 text-sm text-msk-ink/70">
          La demande de modification en ligne arrive dans la prochaine itération.
          Contactez les RH pour toute correction urgente.
        </p>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="p-5">
          <h3 className="text-sm font-semibold text-msk-ink">Identité</h3>
          <dl>
            <Row label="Prénom" value={employee.firstName} />
            <Row label="Nom" value={employee.lastName} />
            <Row label="Nom de naissance" value={employee.birthName} />
            <Row
              label="Date de naissance"
              value={
                employee.birthDate
                  ? `${employee.birthDate.toLocaleDateString("fr-FR")}${age ? ` (${age})` : ""}`
                  : null
              }
            />
            <Row label="Lieu de naissance" value={employee.birthPlace} />
            <Row label="Nationalité" value={employee.nationality} />
            <Row label="Sexe" value={employee.gender} />
            <Row label="Pièce d’identité" value={employee.idDocumentType} />
            <Row
              label="N° pièce"
              value={maskSensitive(employee.idDocumentNumber)}
            />
          </dl>
        </Surface>

        <Surface className="p-5">
          <h3 className="text-sm font-semibold text-msk-ink">Professionnel</h3>
          <dl>
            <Row label="Matricule" value={employee.employeeCode} />
            <Row label="Poste" value={employee.jobTitle} />
            <Row label="Département" value={employee.department} />
            <Row
              label="Type"
              value={EMPLOYEE_TYPE_LABEL[employee.employeeType]}
            />
            <Row
              label="Contrat actuel"
              value={
                active
                  ? `${CONTRACT_TYPE_LABEL[active.type]} — ${active.title}`
                  : null
              }
            />
            <Row
              label="Responsable"
              value={
                employee.manager
                  ? `${employee.manager.firstName} ${employee.manager.lastName}${employee.manager.jobTitle ? ` (${employee.manager.jobTitle})` : ""}`
                  : null
              }
            />
            <Row
              label="Embauche"
              value={
                employee.hireDate
                  ? `${employee.hireDate.toLocaleDateString("fr-FR")}${seniority ? ` · ${seniority}` : ""}`
                  : null
              }
            />
            <Row label="Lieu de travail" value={employee.workLocation} />
            <Row label="E-mail pro" value={employee.email ?? user.email} />
            <Row label="Téléphone" value={employee.phone} />
          </dl>
        </Surface>

        <Surface className="p-5">
          <h3 className="text-sm font-semibold text-msk-ink">Coordonnées</h3>
          <dl>
            <Row label="Adresse" value={employee.addressLine1} />
            <Row label="Complément" value={employee.addressLine2} />
            <Row label="Ville" value={employee.city} />
            <Row label="Région" value={employee.region} />
            <Row label="Pays" value={employee.country} />
            <Row label="Tél. personnel" value={employee.personalPhone} />
            <Row label="E-mail personnel" value={employee.personalEmail} />
          </dl>
        </Surface>

        <Surface className="p-5">
          <h3 className="text-sm font-semibold text-msk-ink">
            Urgence & paie
          </h3>
          <dl>
            <Row
              label="Contact d’urgence"
              value={
                employee.emergencyContactName ?? employee.emergencyContact
              }
            />
            <Row
              label="Tél. urgence"
              value={employee.emergencyContactPhone}
            />
            <Row
              label="Lien"
              value={employee.emergencyContactRelation}
            />
            <Row label="Banque" value={employee.bankName} />
            <Row label="Titulaire" value={employee.bankAccountHolder} />
            <Row label="IBAN / RIB" value={maskSensitive(employee.bankIban)} />
          </dl>
        </Surface>
      </div>
    </PageShell>
  );
}
