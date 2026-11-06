import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  CalendarDays,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
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
import { AvatarPhotoViewer } from "@/components/espace/avatar-photo-viewer";
import { RequestHistoryCard } from "@/components/espace/request-history-card";
import { signedGedUrl } from "@/lib/ged/storage";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ma fiche personnelle" };

function MetaItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
        {label}
      </p>
      <div className="mt-1 text-sm text-msk-ink">{children ?? "—"}</div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Surface className={cn("flex h-full flex-col p-5 sm:p-6", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-msk-ink">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-msk-ink/50">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </Surface>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-msk-chalk/80 px-3 py-2.5 text-center">
      <p className="text-lg font-semibold tabular-nums text-msk-ink">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-msk-ink/40">
        {label}
      </p>
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
  const fullName = `${employee.firstName} ${employee.lastName}`;

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

  const hireLabel = employee.hireDate
    ? employee.hireDate.toLocaleDateString("fr-FR")
    : null;

  const subtitleParts = [
    employee.jobTitle,
    employee.department,
    employee.employeeCode ? `N° ${employee.employeeCode}` : null,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHeader
        title={fullName}
        description={
          subtitleParts.length > 0
            ? subtitleParts.join(" · ")
            : "Fiche personnelle MSK"
        }
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: fullName },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={employeeStatusTone(employee.status)}>
              {EMPLOYEE_STATUS_LABEL[employee.status]}
            </Badge>
            <Badge tone="muted">
              {EMPLOYEE_TYPE_LABEL[employee.employeeType]}
            </Badge>
            {active ? (
              <Badge tone="blue">{CONTRACT_TYPE_LABEL[active.type]}</Badge>
            ) : null}
          </div>
        }
      />

      {/* Bandeau identité — canon fiche utilisateur */}
      <Surface className="overflow-hidden p-0">
        <div className="h-1.5 brand-gradient" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              {canEdit ? (
                <AvatarUpload
                  avatarUrl={avatarUrl}
                  initials={initials}
                  size="lg"
                />
              ) : (
                <AvatarPhotoViewer
                  avatarUrl={avatarUrl}
                  initials={initials}
                  alt={fullName}
                  sizeClassName="h-20 w-20 sm:h-24 sm:w-24"
                  className="shadow-md ring-2 ring-white text-xl"
                />
              )}
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-msk-ink">
                  {employee.firstName}{" "}
                  <span className="font-accent text-msk-blue">
                    {employee.lastName}
                  </span>
                </h2>
                {employee.jobTitle ? (
                  <p className="mt-1 text-sm font-medium text-msk-ink/70">
                    {employee.jobTitle}
                  </p>
                ) : null}
                <ul className="mt-3 space-y-1.5 text-sm text-msk-ink/55">
                  {employee.email ? (
                    <li className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-msk-blue" />
                      <a
                        href={`mailto:${employee.email}`}
                        className="truncate hover:text-msk-blue"
                      >
                        {employee.email}
                      </a>
                    </li>
                  ) : null}
                  {employee.phone ? (
                    <li className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-msk-blue" />
                      <a
                        href={`tel:${employee.phone}`}
                        className="hover:text-msk-blue"
                      >
                        {employee.phone}
                      </a>
                    </li>
                  ) : null}
                  {employee.manager ? (
                    <li className="flex items-center gap-2">
                      <UserRound className="h-3.5 w-3.5 shrink-0 text-msk-blue" />
                      <span>
                        N+1 · {employee.manager.firstName}{" "}
                        {employee.manager.lastName}
                        {employee.manager.jobTitle
                          ? ` (${employee.manager.jobTitle})`
                          : ""}
                      </span>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:min-w-70">
              <Stat
                label="Contrat"
                value={
                  active ? CONTRACT_TYPE_LABEL[active.type] : "—"
                }
              />
              <Stat
                label="Ancienneté"
                value={
                  seniority
                    ? seniority.replace(/\s+/g, " ").slice(0, 18)
                    : hireLabel
                      ? hireLabel
                      : "—"
                }
              />
              <Stat label="Âge" value={age ?? "—"} />
            </div>
          </div>
        </div>
      </Surface>

      {/* Bandeau méta — canon fiche prospect */}
      <Surface className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 border-b border-msk-ink/6 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              Situation professionnelle
            </p>
            <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
              <MetaItem label="Contrat actuel">
                {active ? (
                  <Link
                    prefetch={false}
                    href="/espace/documents?cat=pro"
                    className="text-msk-blue hover:underline"
                  >
                    {CONTRACT_TYPE_LABEL[active.type]} — {active.title}
                  </Link>
                ) : (
                  "Aucun contrat actif"
                )}
              </MetaItem>
              <MetaItem label="Début contrat">
                {active
                  ? active.startDate.toLocaleDateString("fr-FR")
                  : "—"}
              </MetaItem>
              <MetaItem label="Fin contrat">
                {active?.endDate
                  ? active.endDate.toLocaleDateString("fr-FR")
                  : active
                    ? "Indéterminée"
                    : "—"}
              </MetaItem>
              <MetaItem label="Lieu de travail">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-msk-ink/35" aria-hidden />
                  {employee.workLocation || "—"}
                </span>
              </MetaItem>
              <MetaItem label="Embauche">
                {hireLabel
                  ? `${hireLabel}${seniority ? ` · ${seniority}` : ""}`
                  : "—"}
              </MetaItem>
              <MetaItem label="Type">
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase
                    className="h-3.5 w-3.5 text-msk-ink/35"
                    aria-hidden
                  />
                  {EMPLOYEE_TYPE_LABEL[employee.employeeType]}
                </span>
              </MetaItem>
            </dl>
          </div>

          <div className="bg-msk-chalk/40 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              Administratif
            </p>
            <p className="mt-1 text-xs text-msk-ink/45">
              Lecture seule — modification via demande RH.
            </p>
            <ul className="mt-4 space-y-3.5 text-sm text-msk-ink">
              <li className="flex gap-2.5">
                <Mail
                  className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                  aria-hidden
                />
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                    E-mail pro
                  </span>
                  {employee.email ? (
                    <a
                      href={`mailto:${employee.email}`}
                      className="text-msk-blue hover:underline"
                    >
                      {employee.email}
                    </a>
                  ) : (
                    <span className="text-msk-ink/40">—</span>
                  )}
                </span>
              </li>
              <li className="flex gap-2.5">
                <CreditCard
                  className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                  aria-hidden
                />
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                    IBAN
                  </span>
                  {maskSensitive(employee.bankIban) || "—"}
                </span>
              </li>
              <li className="flex gap-2.5">
                <Building2
                  className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                  aria-hidden
                />
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                    Banque
                  </span>
                  {employee.bankName || "—"}
                </span>
              </li>
              <li className="flex gap-2.5 border-t border-msk-ink/6 pt-3.5">
                <CalendarDays
                  className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                  aria-hidden
                />
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                    Département
                  </span>
                  {employee.department || "—"}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </Surface>

      {canEdit ? (
        <Section
          title="Informations personnelles"
          description="Identité, coordonnées et données RH — toute modification passe par une validation."
        >
          <ProfileEditor
            currentValues={currentValues}
            pendingByField={pendingByField}
            embedded
          />
        </Section>
      ) : (
        <Surface className="p-5 text-sm text-msk-ink/55">
          Consultation seule — demandez le droit de modification à
          l&apos;administration.
        </Surface>
      )}

      {canEdit && changes.length > 0 ? (
        <Section
          title="Historique des modifications"
          description="Demandes envoyées aux RH."
        >
          <div className="space-y-3">
            {changes.map((c) => (
              <RequestHistoryCard
                key={c.id}
                title={`${c.lines.length} champ(s)`}
                subtitle={c.lines
                  .map(
                    (l) =>
                      PROFILE_REQUESTABLE_FIELDS.find(
                        (f) => f.key === l.fieldKey,
                      )?.label ?? l.fieldKey,
                  )
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
        </Section>
      ) : null}
    </PageShell>
  );
}
