import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import {
  CONTRACT_TYPE_LABEL,
  EMPLOYEE_STATUS_LABEL,
  employeeStatusTone,
} from "@/lib/rh/labels";
import type { RhContractType, RhEmployeeStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

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
      <Link
        prefetch={false}
        href={href}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-msk-blue/40"
      >
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/8 via-white to-[#00ACEE]/6 px-5 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              className={cn(
                "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-msk-ink text-xl font-semibold text-white shadow-sm ring-2 ring-white transition group-hover:ring-msk-blue/30 sm:h-24 sm:w-24",
              )}
            >
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
              <p className="mt-3 text-xs font-medium text-msk-blue/80 transition group-hover:text-msk-blue">
                Voir ma fiche personnelle →
              </p>
            </div>
          </div>
        </div>
      </Link>
    </Surface>
  );
}
