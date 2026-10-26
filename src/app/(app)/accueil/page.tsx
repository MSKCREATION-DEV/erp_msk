import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, KeyRound, Shield, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { roleChips } from "@/lib/rbac/labels";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { KpiGrid } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "Accueil",
};

export default async function AccueilPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const denied = params.error === "acces_refuse";
  const canViewUsers = hasPermission(user, "users.view");

  let userCount = 0;
  let activeCount = 0;
  let pendingInvite = 0;
  let pendingResets = 0;
  let statsUnavailable = false;

  if (canViewUsers) {
    try {
      [userCount, activeCount, pendingInvite, pendingResets] =
        await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { status: "ACTIVE" } }),
          prisma.user.count({
            where: {
              status: { in: ["INVITE_PENDING", "MUST_CHANGE_PASSWORD"] },
            },
          }),
          prisma.passwordResetRequest.count({ where: { status: "PENDING" } }),
        ]);
    } catch (err) {
      // Ne pas faire planter toute la page (ex. pool DB saturé)
      console.error("[accueil] stats indisponibles", err);
      statsUnavailable = true;
    }
  }

  const chips = roleChips({
    isSuperAdmin: user.isSuperAdmin,
    groupCodes: user.groupCodes,
    packCodes: user.packCodes,
    directPackCodes: user.directPackCodes,
    groupPackCodes: user.groupPackCodes,
  });

  const kpis = canViewUsers
    ? [
        {
          label: "Collaborateurs",
          value: String(userCount),
          hint: "comptes provisionnés",
        },
        {
          label: "Actifs",
          value: String(activeCount),
          hint: "accès ouvert",
          trend:
            userCount > 0
              ? {
                  value: `${Math.round((activeCount / userCount) * 100)}%`,
                  direction: "up" as const,
                }
              : undefined,
        },
        {
          label: "Invitations / MDP",
          value: String(pendingInvite),
          hint: "à finaliser",
        },
        {
          label: "Reset en attente",
          value: String(pendingResets),
          hint: pendingResets > 0 ? "à traiter" : "aucun",
          trend:
            pendingResets > 0
              ? { value: String(pendingResets), direction: "down" as const }
              : undefined,
        },
      ]
    : [
        {
          label: "Packs",
          value: String(user.packCodes.length || 1),
          hint: "capacités",
        },
        {
          label: "Groupes",
          value: String(user.groupCodes.length || 0),
          hint: "appartenances",
        },
        {
          label: "File d’attente",
          value: "0",
          hint: "Phase 0",
        },
        {
          label: "Compte",
          value: user.status === "ACTIVE" ? "Actif" : user.status,
          hint: "statut",
        },
      ];

  const shortcuts = [
    {
      href: "/administration/utilisateurs",
      title: "Utilisateurs",
      desc: "Inviter, groupes, packs, suspension",
      icon: Users,
      show: canViewUsers,
    },
    {
      href: "/demande-reset",
      title: "Aide mot de passe",
      desc: "Demande de reset (hors self-service)",
      icon: KeyRound,
      show: true,
    },
    {
      href: "/guides",
      title: "Centre de guides",
      desc: "Procédures par module, rôle et tâche",
      icon: BookOpen,
      show: hasPermission(user, "home.view"),
    },
  ].filter((s) => s.show);

  return (
    <PageShell>
      {denied ? (
        <p className="rounded-xl border border-msk-coral/30 bg-msk-coral/5 px-4 py-3 text-sm text-msk-coral">
          Accès refusé pour cette zone.
        </p>
      ) : null}

      {statsUnavailable ? (
        <p className="rounded-xl border border-msk-blue/20 bg-msk-blue/5 px-4 py-3 text-sm text-msk-ink/70">
          Les indicateurs ne sont pas disponibles pour le moment (service
          saturé). Le reste de l’accueil fonctionne — réessayez dans un instant.
        </p>
      ) : null}

      <PageHeader
        title={`Bonjour ${user.firstName}`}
        breadcrumbs={[{ label: "MSK" }, { label: "Accueil" }]}
        description="Espace collaborateur MSK — modules selon vos groupes, packs et exceptions."
      />

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <Badge key={c.label} tone={c.tone}>
              {c.label}
            </Badge>
          ))}
        </div>
      ) : null}

      <KpiGrid items={kpis} />

      <section id="guide" className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
          Raccourcis
        </h2>
        <div className="grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16.5rem),1fr))]">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href + item.title}
                href={item.href}
                prefetch={false}
                className="group block cursor-pointer"
              >
                <Surface className="flex h-full flex-col p-5 transition group-hover:border-msk-blue/20 group-hover:shadow-sm">
                  <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-msk-blue/10 text-msk-blue">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium text-msk-ink">{item.title}</span>
                  <span className="mt-1 text-sm text-msk-ink/50">{item.desc}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-msk-blue">
                    Ouvrir <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Surface>
              </Link>
            );
          })}
        </div>
      </section>

      <Surface className="px-5 py-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-msk-blue/10 text-msk-blue">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold text-msk-ink">File d’attente</h2>
            <p className="mt-1 text-sm text-msk-ink/50">
              Aucune validation en attente (Phase 0). Les files COM / RH / CPT
              arriveront avec les modules métier.
            </p>
          </div>
        </div>
      </Surface>
    </PageShell>
  );
}
