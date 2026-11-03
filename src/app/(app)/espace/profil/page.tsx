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
import {
  maskSensitive,
  PROFILE_REQUESTABLE_FIELDS,
} from "@/lib/rh/profile-fields";
import { readEmployeeField } from "@/lib/rh/profile-apply";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { FormShell } from "@/components/ui/form-shell";
import { ProfileChangeForm } from "@/components/espace/profile-change-form";
import { RequestHistoryCard } from "@/components/espace/request-history-card";

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

const STATUS_LABEL = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
} as const;

export default async function EspaceProfilPage() {
  const user = await requireUser();
  if (
    !hasPermission(user, "self.profile.edit") &&
    !hasPermission(user, "self.documents.view")
  ) {
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

  const canEdit = hasPermission(user, "self.profile.edit");
  const changes = canEdit
    ? await prisma.rhProfileChangeRequest.findMany({
        where: { employeeId: employee.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          lines: true,
          reviewedBy: { select: { firstName: true, lastName: true } },
        },
      })
    : [];

  const empRecord = employee as unknown as Record<string, unknown>;
  const currentValues: Record<string, string | null> = {};
  for (const f of PROFILE_REQUESTABLE_FIELDS) {
    currentValues[f.key] = readEmployeeField(empRecord, f.key);
  }

  const active = employee.contracts[0] ?? null;
  const seniority = formatSeniority(employee.hireDate);
  const age = ageFrom(employee.birthDate);
  const pending = changes.some((c) => c.status === "PENDING");

  return (
    <PageShell>
      <PageHeader
        title="Mon profil"
        description="Dossier personnel — toute modification passe par une validation RH."
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
      </Surface>

      {canEdit ? (
        <FormShell>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-msk-ink">
              Demander une modification
            </h2>
            <p className="mt-1 text-sm text-msk-ink/55">
              Les changements ne sont pas appliqués immédiatement. Les RH
              comparent ancienne / nouvelle valeur puis approuvent ou refusent.
            </p>
          </div>
          {pending ? (
            <p className="rounded-lg bg-msk-blue/5 px-3 py-2 text-sm text-msk-ink/70">
              Une demande est déjà en attente. Vous pourrez en soumettre une
              nouvelle après la décision RH.
            </p>
          ) : (
            <ProfileChangeForm currentValues={currentValues} />
          )}
        </FormShell>
      ) : null}

      {changes.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
            Historique des demandes
          </h2>
          {changes.map((c) => (
            <RequestHistoryCard
              key={c.id}
              title={`${c.lines.length} champ(s)`}
              subtitle={c.lines
                .map((l) => {
                  const label =
                    PROFILE_REQUESTABLE_FIELDS.find((f) => f.key === l.fieldKey)
                      ?.label ?? l.fieldKey;
                  return `${label}: ${l.oldValue ?? "—"} → ${l.newValue || "—"}`;
                })
                .join(" · ")}
              statusLabel={STATUS_LABEL[c.status]}
              statusTone={
                c.status === "APPROVED"
                  ? "success"
                  : c.status === "REJECTED"
                    ? "coral"
                    : c.status === "PENDING"
                      ? "blue"
                      : "muted"
              }
              submittedAt={c.createdAt}
              reviewedAt={c.reviewedAt}
              reviewedBy={
                c.reviewedBy
                  ? `${c.reviewedBy.firstName} ${c.reviewedBy.lastName}`
                  : null
              }
              reviewActionLabel={
                c.status === "REJECTED" ? "Refusé le" : "Approuvé le"
              }
              reason={c.note}
              reviewNote={c.reviewNote}
            />
          ))}
        </div>
      ) : null}

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
            <Row label="Lien" value={employee.emergencyContactRelation} />
            <Row label="Banque" value={employee.bankName} />
            <Row label="Titulaire" value={employee.bankAccountHolder} />
            <Row label="IBAN / RIB" value={maskSensitive(employee.bankIban)} />
          </dl>
        </Surface>
      </div>
    </PageShell>
  );
}
