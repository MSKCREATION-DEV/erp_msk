import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
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
import { readEmployeeField } from "@/lib/rh/profile-apply";
import { PROFILE_REQUESTABLE_FIELDS } from "@/lib/rh/profile-fields";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ProfileEditor } from "@/components/espace/profile-editor";
import { AvatarUpload } from "@/components/espace/avatar-upload";
import { RequestHistoryCard } from "@/components/espace/request-history-card";
import { signedGedUrl } from "@/lib/ged/storage";

export const metadata: Metadata = { title: "Ma fiche personnelle" };

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

  const pendingReq = changes.find((c) => c.status === "PENDING");
  const pendingByField: Record<string, string> = {};
  if (pendingReq) {
    for (const line of pendingReq.lines) {
      pendingByField[line.fieldKey] = line.newValue;
    }
  }

  const active = employee.contracts[0] ?? null;
  const seniority = formatSeniority(employee.hireDate);
  const age = ageFrom(employee.birthDate);
  const initials =
    `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();

  let avatarUrl: string | null = null;
  if (employee.avatarDocumentId) {
    const doc = await prisma.document.findUnique({
      where: { id: employee.avatarDocumentId },
      select: { storagePath: true },
    });
    if (doc?.storagePath) {
      try {
        avatarUrl = await signedGedUrl(doc.storagePath, 3600);
      } catch {
        avatarUrl = null;
      }
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Ma fiche personnelle"
        description="Dossier RH numérique — identité, coordonnées et situation professionnelle."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Fiche personnelle" },
        ]}
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/8 via-white to-[#00ACEE]/6 px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight text-msk-ink">
                {employee.firstName}{" "}
                <span className="font-accent text-msk-blue">
                  {employee.lastName}
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-msk-ink/60">
                {employee.jobTitle ? (
                  <span className="font-medium text-msk-ink/80">
                    {employee.jobTitle}
                  </span>
                ) : null}
                {employee.department ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{employee.department}</span>
                  </>
                ) : null}
                {employee.employeeCode ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">
                      N° {employee.employeeCode}
                    </span>
                  </>
                ) : null}
                <Badge tone={employeeStatusTone(employee.status)}>
                  {EMPLOYEE_STATUS_LABEL[employee.status]}
                </Badge>
              </div>
              <p className="text-sm text-msk-ink/55">
                {employee.hireDate
                  ? `Embauche ${employee.hireDate.toLocaleDateString("fr-FR")}`
                  : "Date d’embauche non renseignée"}
                {seniority ? ` · ${seniority}` : ""}
                {employee.manager
                  ? ` · N+1 ${employee.manager.firstName} ${employee.manager.lastName}`
                  : ""}
              </p>
            </div>
            {canEdit ? (
              <AvatarUpload avatarUrl={avatarUrl} initials={initials} />
            ) : avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-24 w-24 rounded-2xl object-cover"
              />
            ) : null}
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 @xl:grid-cols-12">
        <Surface className="p-5 @xl:col-span-5">
          <h3 className="text-sm font-semibold text-msk-ink">
            Situation professionnelle
          </h3>
          <dl className="mt-2">
            <Row
              label="Type"
              value={EMPLOYEE_TYPE_LABEL[employee.employeeType]}
            />
            <Row
              label="Contrat actuel"
              value={
                active ? (
                  <span>
                    {CONTRACT_TYPE_LABEL[active.type]} — {active.title}
                    <Link
                      prefetch={false}
                      href="/espace/documents?cat=pro"
                      className="ml-2 text-msk-blue hover:underline"
                    >
                      Documents
                    </Link>
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <Row
              label="Début contrat"
              value={
                active
                  ? active.startDate.toLocaleDateString("fr-FR")
                  : "—"
              }
            />
            <Row
              label="Fin contrat"
              value={
                active?.endDate
                  ? active.endDate.toLocaleDateString("fr-FR")
                  : active
                    ? "Indéterminée"
                    : "—"
              }
            />
            <Row label="Lieu de travail" value={employee.workLocation} />
            <Row label="Âge" value={age} />
          </dl>
        </Surface>

        <Surface className="p-5 @xl:col-span-7">
          <h3 className="text-sm font-semibold text-msk-ink">
            Administratif (lecture)
          </h3>
          <dl className="mt-2">
            <Row label="E-mail pro" value={employee.email} />
            <Row
              label="IBAN"
              value={maskSensitive(employee.bankIban)}
            />
            <Row label="Banque" value={employee.bankName} />
          </dl>
        </Surface>
      </div>

      {canEdit ? (
        <ProfileEditor
          currentValues={currentValues}
          pendingByField={pendingByField}
        />
      ) : (
        <Surface className="p-5 text-sm text-msk-ink/55">
          Consultation seule — demandez le droit de modification à
          l&apos;administration.
        </Surface>
      )}

      {canEdit && changes.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
            Historique des modifications
          </h2>
          {changes.map((c) => (
            <RequestHistoryCard
              key={c.id}
              title={`${c.lines.length} champ(s)`}
              subtitle={c.lines
                .map((l) => PROFILE_REQUESTABLE_FIELDS.find((f) => f.key === l.fieldKey)?.label ?? l.fieldKey)
                .join(", ")}
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
              reason={c.note}
              reviewNote={c.reviewNote}
            />
          ))}
        </div>
      ) : null}
    </PageShell>
  );
}
