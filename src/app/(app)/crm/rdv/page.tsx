import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CrmAppointmentStatus, type Prisma } from "@/generated/prisma/client";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { crmVisibility } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { firstParam } from "@/lib/list/search-params";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";
import { AppointmentActions } from "@/components/crm/appointment-actions";

export const metadata: Metadata = { title: "RDV" };

type Vue = "aujourdhui" | "avenir" | "clos";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseVue(raw: string | undefined): Vue {
  if (raw === "avenir" || raw === "clos") return raw;
  return "aujourdhui";
}

export default async function CrmRdvPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const vis = crmVisibility(user);
  const teamIds =
    vis === "team" ? await commercialTeamUserIds() : ([] as string[]);
  const assigneeWhere: Prisma.CrmAppointmentWhereInput =
    vis === "global"
      ? {}
      : vis === "team"
        ? { assigneeId: { in: Array.from(new Set([user.id, ...teamIds])) } }
        : { assigneeId: user.id };

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const vue = parseVue(firstParam(raw.vue));

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const searchWhere: Prisma.CrmAppointmentWhereInput | undefined = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
          {
            opportunity: {
              organization: { name: { contains: q, mode: "insensitive" } },
            },
          },
          { assignee: { firstName: { contains: q, mode: "insensitive" } } },
          { assignee: { lastName: { contains: q, mode: "insensitive" } } },
        ],
      }
    : undefined;

  const vueWhere: Prisma.CrmAppointmentWhereInput =
    vue === "aujourdhui"
      ? {
          status: CrmAppointmentStatus.SCHEDULED,
          startsAt: { gte: todayStart, lte: todayEnd },
        }
      : vue === "avenir"
        ? {
            status: CrmAppointmentStatus.SCHEDULED,
            startsAt: { gt: todayEnd },
          }
        : { status: { not: CrmAppointmentStatus.SCHEDULED } };

  const where: Prisma.CrmAppointmentWhereInput = {
    AND: [assigneeWhere, vueWhere, ...(searchWhere ? [searchWhere] : [])],
  };

  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.crmAppointment.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const rows = await prisma.crmAppointment.findMany({
    where,
    include: {
      opportunity: {
        select: {
          id: true,
          organization: { select: { name: true } },
        },
      },
      assignee: { select: { firstName: true, lastName: true } },
    },
    orderBy:
      vue === "clos"
        ? { startsAt: "desc" }
        : { startsAt: "asc" },
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });

  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    vue: vue === "aujourdhui" ? undefined : vue,
  };

  const vueLinks: { id: Vue; label: string }[] = [
    { id: "aujourdhui", label: "Aujourd’hui" },
    { id: "avenir", label: "À venir" },
    { id: "clos", label: "Clos" },
  ];

  return (
    <PageShell>
      <PageHeader
        title="RDV"
        description={
          vis === "own"
            ? "Vos rendez-vous prospects / clients."
            : "Agenda RDV de l’équipe commerciale."
        }
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "RDV" },
        ]}
        actions={
          <Link
            href="/crm/rdv/nouveau"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-msk-blue px-3 text-sm font-medium text-white transition hover:bg-msk-blue/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau RDV
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Titre, prospect, lieu…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {vueLinks.map((v) => {
          const active = vue === v.id;
          const p = new URLSearchParams();
          if (v.id !== "aujourdhui") p.set("vue", v.id);
          if (q) p.set("q", q);
          const qs = p.toString();
          return (
            <Link
              key={v.id}
              prefetch={false}
              href={qs ? `/crm/rdv?${qs}` : "/crm/rdv"}
              className={
                active
                  ? "rounded-lg bg-msk-blue px-3 py-1.5 text-white"
                  : "rounded-lg border border-msk-ink/15 bg-white px-3 py-1.5 text-msk-ink/60"
              }
            >
              {v.label}
            </Link>
          );
        })}
      </div>

      <Surface className="p-0">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-msk-ink/45">
            {q
              ? `Aucun RDV pour « ${q} ».`
              : vue === "aujourdhui"
                ? "Aucun RDV aujourd’hui."
                : vue === "avenir"
                  ? "Aucun RDV planifié."
                  : "Pas encore d’historique RDV."}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-msk-ink/6 px-4">
              {rows.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-msk-ink">{a.title}</p>
                    <p className="text-sm text-msk-ink/60">
                      {a.opportunity.organization.name} ·{" "}
                      {a.startsAt.toLocaleString("fr-FR")}
                      {a.location ? ` · ${a.location}` : ""}
                    </p>
                    <p className="text-xs text-msk-ink/40">
                      {a.assignee.firstName} {a.assignee.lastName}
                      {a.status !== "SCHEDULED" ? (
                        <>
                          {" "}
                          ·{" "}
                          <Badge
                            tone={
                              a.status === "DONE"
                                ? "success"
                                : a.status === "NO_SHOW"
                                  ? "coral"
                                  : "muted"
                            }
                          >
                            {a.status === "DONE"
                              ? "Tenu"
                              : a.status === "NO_SHOW"
                                ? "Absent"
                                : "Annulé"}
                          </Badge>
                        </>
                      ) : null}
                    </p>
                  </div>
                  {vue !== "clos" ? (
                    <AppointmentActions
                      appointmentId={a.id}
                      opportunityId={a.opportunityId}
                      className="shrink-0"
                    />
                  ) : (
                    <Link
                      href={`/crm/prospects/${a.opportunityId}`}
                      className="text-sm font-medium text-msk-blue hover:underline"
                    >
                      Fiche
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <ListPagination
              pathname="/crm/rdv"
              searchParams={listParams}
              page={page}
              totalPages={totalPages(total, pageSize)}
              total={total}
              pageSize={pageSize}
            />
          </>
        )}
      </Surface>
    </PageShell>
  );
}
