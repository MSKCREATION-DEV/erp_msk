import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Mail,
  MapPin,
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
import { RequestHistoryCard } from "@/components/espace/request-history-card";
import { signedGedUrl } from "@/lib/ged/storage";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ma fiche personnelle" };

function MetaStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Briefcase;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-msk-ink/6 bg-white/80 px-3.5 py-3 backdrop-blur-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-msk-blue/8 text-msk-blue">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-caps text-msk-ink/40">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-msk-ink">
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: ReactNode;
  icon: typeof Mail;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-msk-chalk text-msk-ink/45">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-caps text-msk-ink/40">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium text-msk-ink">
          {value ?? "—"}
        </div>
      </div>
    </>
  );
  if (href) {
    return (
      <Link
        prefetch={false}
        href={href}
        className="flex items-start gap-3 rounded-xl border border-msk-ink/6 bg-msk-chalk/30 px-3.5 py-3 transition hover:border-msk-blue/25 hover:bg-msk-blue/4"
      >
        {body}
      </Link>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-msk-ink/6 bg-msk-chalk/30 px-3.5 py-3">
      {body}
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

  const hireLabel = employee.hireDate
    ? employee.hireDate.toLocaleDateString("fr-FR")
    : null;

  return (
    <PageShell>
      <PageHeader
        title="Ma fiche personnelle"
        description="Dossier RH numérique — identité, photo, coordonnées et situation."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Fiche personnelle" },
        ]}
      />

      {/* Hero identité */}
      <Surface className="overflow-hidden p-0">
        <div
          className={cn(
            "relative border-b border-msk-ink/6",
            "bg-[linear-gradient(135deg,rgba(29,115,188,0.12)_0%,rgba(245,243,239,0.9)_42%,rgba(0,172,238,0.1)_100%)]",
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 12% 20%, rgba(29,115,188,0.18), transparent 42%), radial-gradient(circle at 88% 10%, rgba(0,172,238,0.16), transparent 38%)",
            }}
            aria-hidden
          />
          <div className="relative px-5 py-7 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                {canEdit ? (
                  <AvatarUpload
                    avatarUrl={avatarUrl}
                    initials={initials}
                    size="lg"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-msk-ink text-2xl font-semibold text-white shadow-md ring-4 ring-white sm:h-32 sm:w-32">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span aria-hidden>{initials}</span>
                    )}
                  </div>
                )}
                <div className="min-w-0 space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-caps text-msk-blue">
                    Collaborateur MSK
                  </p>
                  <h2 className="text-3xl font-semibold tracking-tight text-msk-ink sm:text-4xl">
                    {employee.firstName}{" "}
                    <span className="font-accent text-msk-blue">
                      {employee.lastName}
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-msk-ink/65">
                    {employee.jobTitle ? (
                      <span className="font-medium text-msk-ink/85">
                        {employee.jobTitle}
                      </span>
                    ) : null}
                    {employee.department ? (
                      <>
                        <span aria-hidden className="text-msk-ink/25">
                          ·
                        </span>
                        <span>{employee.department}</span>
                      </>
                    ) : null}
                    {employee.employeeCode ? (
                      <>
                        <span aria-hidden className="text-msk-ink/25">
                          ·
                        </span>
                        <span className="tabular-nums">
                          N° {employee.employeeCode}
                        </span>
                      </>
                    ) : null}
                    <Badge tone={employeeStatusTone(employee.status)}>
                      {EMPLOYEE_STATUS_LABEL[employee.status]}
                    </Badge>
                  </div>
                  {employee.manager ? (
                    <p className="text-sm text-msk-ink/50">
                      N+1 · {employee.manager.firstName}{" "}
                      {employee.manager.lastName}
                      {employee.manager.jobTitle
                        ? ` (${employee.manager.jobTitle})`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <MetaStat
                icon={Briefcase}
                label="Type"
                value={EMPLOYEE_TYPE_LABEL[employee.employeeType]}
              />
              <MetaStat
                icon={FileText}
                label="Contrat"
                value={
                  active
                    ? CONTRACT_TYPE_LABEL[active.type]
                    : "Aucun actif"
                }
              />
              <MetaStat
                icon={CalendarDays}
                label="Ancienneté"
                value={
                  seniority
                    ? seniority
                    : hireLabel
                      ? `Depuis ${hireLabel}`
                      : "—"
                }
              />
              <MetaStat
                icon={UserRound}
                label="Âge"
                value={age ?? "—"}
              />
            </div>
          </div>
        </div>
      </Surface>

      {/* Situation + admin */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Surface className="p-5 sm:p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-msk-ink">
                Situation professionnelle
              </h3>
              <p className="mt-0.5 text-sm text-msk-ink/50">
                Poste, contrat et rattachement.
              </p>
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <InfoTile
              icon={Briefcase}
              label="Contrat actuel"
              value={
                active ? (
                  <span>
                    {CONTRACT_TYPE_LABEL[active.type]} — {active.title}
                  </span>
                ) : (
                  "—"
                )
              }
              href={active ? "/espace/documents?cat=pro" : undefined}
            />
            <InfoTile
              icon={CalendarDays}
              label="Début contrat"
              value={
                active
                  ? active.startDate.toLocaleDateString("fr-FR")
                  : "—"
              }
            />
            <InfoTile
              icon={CalendarDays}
              label="Fin contrat"
              value={
                active?.endDate
                  ? active.endDate.toLocaleDateString("fr-FR")
                  : active
                    ? "Indéterminée"
                    : "—"
              }
            />
            <InfoTile
              icon={MapPin}
              label="Lieu de travail"
              value={employee.workLocation || "—"}
            />
            <InfoTile
              icon={Building2}
              label="Embauche"
              value={
                hireLabel
                  ? `${hireLabel}${seniority ? ` · ${seniority}` : ""}`
                  : "—"
              }
            />
            <InfoTile
              icon={UserRound}
              label="Type collaborateur"
              value={EMPLOYEE_TYPE_LABEL[employee.employeeType]}
            />
          </div>
        </Surface>

        <Surface className="p-5 sm:p-6 lg:col-span-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-msk-ink">
              Administratif
            </h3>
            <p className="mt-0.5 text-sm text-msk-ink/50">
              Lecture seule — modification via demande RH.
            </p>
          </div>
          <div className="grid gap-2.5">
            <InfoTile icon={Mail} label="E-mail pro" value={employee.email} />
            <InfoTile
              icon={CreditCard}
              label="IBAN"
              value={maskSensitive(employee.bankIban) || "—"}
            />
            <InfoTile
              icon={Building2}
              label="Banque"
              value={employee.bankName || "—"}
            />
          </div>
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
                .map(
                  (l) =>
                    PROFILE_REQUESTABLE_FIELDS.find((f) => f.key === l.fieldKey)
                      ?.label ?? l.fieldKey,
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
      ) : null}
    </PageShell>
  );
}
