import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { AvatarPhotoViewer } from "@/components/espace/avatar-photo-viewer";
import {
  CONTRACT_TYPE_LABEL,
  EMPLOYEE_STATUS_LABEL,
  employeeStatusTone,
} from "@/lib/rh/labels";
import type { RhContractType, RhEmployeeStatus } from "@prisma/client";

export function EspaceIdentityHero({
  greeting,
  firstName,
  lastName,
  jobTitle,
  department,
  employeeCode,
  status,
  hireLabel,
  seniority,
  contractType,
  avatarUrl,
  href = "/espace/profil",
}: {
  greeting: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department?: string | null;
  employeeCode?: string | null;
  status: RhEmployeeStatus;
  hireLabel: string | null;
  seniority: string | null;
  contractType: RhContractType | null;
  avatarUrl?: string | null;
  href?: string;
}) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <Surface className="overflow-hidden p-0">
      <div className="border-b border-msk-ink/6 bg-[linear-gradient(135deg,rgba(42,61,142,0.14)_0%,rgba(29,115,188,0.1)_45%,rgba(29,115,188,0.04)_100%)]">
        <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <AvatarPhotoViewer
            avatarUrl={avatarUrl ?? null}
            initials={initials}
            alt={`${firstName} ${lastName}`}
            sizeClassName="h-20 w-20 sm:h-24 sm:w-24"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-msk-blue">
              {greeting}, {firstName}
            </p>
            <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-msk-ink sm:text-3xl">
              {firstName}{" "}
              <span className="font-accent text-msk-blue">{lastName}</span>
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-msk-ink/60">
              {jobTitle ? (
                <span className="font-medium text-msk-ink/80">{jobTitle}</span>
              ) : null}
              {department ? (
                <>
                  <span aria-hidden className="text-msk-ink/25">
                    ·
                  </span>
                  <span>{department}</span>
                </>
              ) : null}
              {employeeCode ? (
                <>
                  <span aria-hidden className="text-msk-ink/25">
                    ·
                  </span>
                  <span className="tabular-nums">N° {employeeCode}</span>
                </>
              ) : null}
              {contractType ? (
                <>
                  <span aria-hidden className="text-msk-ink/25">
                    ·
                  </span>
                  <span>{CONTRACT_TYPE_LABEL[contractType]}</span>
                </>
              ) : null}
              {hireLabel ? (
                <>
                  <span aria-hidden className="text-msk-ink/25">
                    ·
                  </span>
                  <span>
                    {hireLabel}
                    {seniority ? ` (${seniority})` : ""}
                  </span>
                </>
              ) : null}
              <Badge tone={employeeStatusTone(status)}>
                {EMPLOYEE_STATUS_LABEL[status]}
              </Badge>
            </div>
            <Link
              prefetch={false}
              href={href}
              className="mt-3 inline-flex text-xs font-medium text-msk-blue transition hover:underline"
            >
              Voir ma fiche personnelle →
            </Link>
          </div>
        </div>
      </div>
    </Surface>
  );
}
