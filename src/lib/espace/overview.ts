import type {
  RhAbsenceStatus,
  RhContractStatus,
  RhContractType,
  RhEmployeeStatus,
  RhLeaveStatus,
  RhLeaveType,
  RhPayslipStatus,
  RhReglementStatus,
  RhTimesheetStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { listEmployeeRhDocs } from "@/lib/rh/docs-query";

export type EspaceTimelineKind =
  | "leave"
  | "absence"
  | "timesheet"
  | "payslip"
  | "document"
  | "contract"
  | "reglement";

export type EspaceTimelineItem = {
  id: string;
  kind: EspaceTimelineKind;
  title: string;
  detail: string;
  at: Date;
  href: string;
};

export type EspaceOverview = {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    status: RhEmployeeStatus;
    hireDate: Date | null;
    leaveBalanceDays: number;
    reglementStatus: RhReglementStatus;
  };
  activeContract: {
    id: string;
    type: RhContractType;
    title: string;
    status: RhContractStatus;
    startDate: Date;
    endDate: Date | null;
  } | null;
  kpis: {
    leaveBalance: number;
    leavePending: number;
    leaveApprovedUpcoming: number;
    absencesDeclared: number;
    timesheetsSubmitted: number;
    latestPayslip: {
      id: string;
      year: number;
      month: number;
      status: RhPayslipStatus;
      gedDocumentId: string | null;
    } | null;
    docsCount: number;
  };
  alerts: Array<{ id: string; tone: "coral" | "blue" | "ink"; message: string; href: string }>;
  timeline: EspaceTimelineItem[];
};

/** Salutation FR selon l’heure locale. */
export function greetingFor(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

/** Ancienneté lisible à partir de la date d’embauche (null si absente). */
export function formatSeniority(
  hireDate: Date | null | undefined,
  now = new Date(),
): string | null {
  if (!hireDate) return null;
  const start = new Date(hireDate);
  if (Number.isNaN(start.getTime()) || start > now) return null;

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return null;
  if (years === 0 && months === 0) return "Moins d’un mois";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mois`);
  return parts.join(" · ");
}

export function formatLeaveDays(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${label} j`;
}

export function monthLabelFr(month: number, year: number): string {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
}

function leaveTitle(type: RhLeaveType, status: RhLeaveStatus): string {
  const typeLabel: Record<RhLeaveType, string> = {
    CONGES_PAYES: "Congés payés",
    SANS_SOLDE: "Congé sans solde",
    EXCEPTIONNEL: "Congé exceptionnel",
    MALADIE: "Congé maladie",
    AUTRE: "Congé",
  };
  const statusLabel: Record<RhLeaveStatus, string> = {
    PENDING: "demande en attente",
    APPROVED: "approuvé",
    REJECTED: "refusé",
    CANCELLED: "annulé",
  };
  return `${typeLabel[type]} — ${statusLabel[status]}`;
}

function absenceTitle(status: RhAbsenceStatus): string {
  switch (status) {
    case "DECLARED":
      return "Absence déclarée";
    case "JUSTIFIED":
      return "Absence justifiée";
    case "UNJUSTIFIED":
      return "Absence non justifiée";
  }
}

function timesheetTitle(status: RhTimesheetStatus): string {
  switch (status) {
    case "DRAFT":
      return "Feuille d’heures (brouillon)";
    case "SUBMITTED":
      return "Feuille d’heures soumise";
    case "APPROVED":
      return "Feuille d’heures approuvée";
    case "REJECTED":
      return "Feuille d’heures refusée";
  }
}

/**
 * Agrège les indicateurs réels du collaborateur lié au user.
 * Retourne null si aucune fiche RH n’est liée.
 */
export async function loadEspaceOverview(
  userId: string,
): Promise<EspaceOverview | null> {
  const employee = await prisma.rhEmployee.findUnique({
    where: { userId },
    include: {
      contracts: {
        orderBy: { startDate: "desc" },
        take: 8,
      },
    },
  });
  if (!employee) return null;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [
    leavePending,
    leaveApprovedUpcoming,
    absencesDeclared,
    timesheetsSubmitted,
    latestPayslip,
    recentLeaves,
    recentAbsences,
    recentTimesheets,
    recentPayslips,
  ] = await Promise.all([
    prisma.rhLeaveRequest.count({
      where: { employeeId: employee.id, status: "PENDING" },
    }),
    prisma.rhLeaveRequest.count({
      where: {
        employeeId: employee.id,
        status: "APPROVED",
        endDate: { gte: today },
      },
    }),
    prisma.rhAbsence.count({
      where: { employeeId: employee.id, status: "DECLARED" },
    }),
    prisma.rhTimesheet.count({
      where: { employeeId: employee.id, status: "SUBMITTED" },
    }),
    prisma.rhPayslip.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ["APPROVED", "PAID"] },
      },
      orderBy: [
        { period: { year: "desc" } },
        { period: { month: "desc" } },
      ],
      include: { period: { select: { year: true, month: true } } },
    }),
    prisma.rhLeaveRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        type: true,
        status: true,
        days: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        validatedAt: true,
      },
    }),
    prisma.rhAbsence.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        reviewedAt: true,
      },
    }),
    prisma.rhTimesheet.findMany({
      where: { employeeId: employee.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        status: true,
        weekStart: true,
        totalMinutes: true,
        updatedAt: true,
        validatedAt: true,
      },
    }),
    prisma.rhPayslip.findMany({
      where: {
        employeeId: employee.id,
        status: { in: ["APPROVED", "PAID"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { period: { select: { year: true, month: true } } },
    }),
  ]);

  const docs = await listEmployeeRhDocs(
    employee.id,
    employee.contracts.map((c) => c.id),
  );

  const activeContract =
    employee.contracts.find((c) => c.status === "ACTIVE") ??
    employee.contracts.find((c) => c.status === "DRAFT") ??
    null;

  const alerts: EspaceOverview["alerts"] = [];
  if (employee.reglementStatus === "PENDING") {
    alerts.push({
      id: "reglement",
      tone: "coral",
      message: "Règlement intérieur à accuser",
      href: "/espace",
    });
  }
  if (leavePending > 0) {
    alerts.push({
      id: "leave-pending",
      tone: "blue",
      message: `${leavePending} demande(s) de congé en attente`,
      href: "/espace/conges",
    });
  }
  if (absencesDeclared > 0) {
    alerts.push({
      id: "absence-declared",
      tone: "coral",
      message: `${absencesDeclared} absence(s) en attente de qualification RH`,
      href: "/espace/absences",
    });
  }
  if (timesheetsSubmitted > 0) {
    alerts.push({
      id: "timesheet-submitted",
      tone: "ink",
      message: `${timesheetsSubmitted} feuille(s) d’heures en cours de validation`,
      href: "/espace/heures",
    });
  }

  const timeline: EspaceTimelineItem[] = [];

  for (const l of recentLeaves) {
    timeline.push({
      id: `leave-${l.id}`,
      kind: "leave",
      title: leaveTitle(l.type, l.status),
      detail: `${Number(l.days)} j · ${l.startDate.toLocaleDateString("fr-FR")} → ${l.endDate.toLocaleDateString("fr-FR")}`,
      at: l.validatedAt ?? l.createdAt,
      href: "/espace/conges",
    });
  }
  for (const a of recentAbsences) {
    timeline.push({
      id: `absence-${a.id}`,
      kind: "absence",
      title: absenceTitle(a.status),
      detail: `${a.startDate.toLocaleDateString("fr-FR")} → ${a.endDate.toLocaleDateString("fr-FR")}`,
      at: a.reviewedAt ?? a.createdAt,
      href: "/espace/absences",
    });
  }
  for (const t of recentTimesheets) {
    const hours = Math.round((t.totalMinutes / 60) * 10) / 10;
    timeline.push({
      id: `ts-${t.id}`,
      kind: "timesheet",
      title: timesheetTitle(t.status),
      detail: `Semaine du ${t.weekStart.toLocaleDateString("fr-FR")} · ${hours} h`,
      at: t.validatedAt ?? t.updatedAt,
      href: "/espace/heures",
    });
  }
  for (const p of recentPayslips) {
    timeline.push({
      id: `pay-${p.id}`,
      kind: "payslip",
      title: "Bulletin de paie disponible",
      detail: monthLabelFr(p.period.month, p.period.year),
      at: p.updatedAt,
      href: "/espace/bulletins",
    });
  }
  for (const c of employee.contracts.slice(0, 3)) {
    timeline.push({
      id: `contract-${c.id}`,
      kind: "contract",
      title: `Contrat ${c.type}`,
      detail: `${c.title} · ${c.status}`,
      at: c.updatedAt,
      href: "/espace/contrats",
    });
  }
  for (const d of docs.slice(0, 3)) {
    timeline.push({
      id: `doc-${d.id}`,
      kind: "document",
      title: "Document RH",
      detail: d.label ?? d.originalName ?? d.id,
      at: d.createdAt,
      href: "/espace/documents",
    });
  }

  timeline.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    employee: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      jobTitle: employee.jobTitle,
      status: employee.status,
      hireDate: employee.hireDate,
      leaveBalanceDays: Number(employee.leaveBalanceDays),
      reglementStatus: employee.reglementStatus,
    },
    activeContract: activeContract
      ? {
          id: activeContract.id,
          type: activeContract.type,
          title: activeContract.title,
          status: activeContract.status,
          startDate: activeContract.startDate,
          endDate: activeContract.endDate,
        }
      : null,
    kpis: {
      leaveBalance: Number(employee.leaveBalanceDays),
      leavePending,
      leaveApprovedUpcoming,
      absencesDeclared,
      timesheetsSubmitted,
      latestPayslip: latestPayslip
        ? {
            id: latestPayslip.id,
            year: latestPayslip.period.year,
            month: latestPayslip.period.month,
            status: latestPayslip.status,
            gedDocumentId: latestPayslip.gedDocumentId,
          }
        : null,
      docsCount: docs.length,
    },
    alerts,
    timeline: timeline.slice(0, 12),
  };
}
