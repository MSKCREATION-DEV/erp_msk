import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Building2,
  FileSpreadsheet,
  Landmark,
  LineChart,
  ListOrdered,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { KpiGrid } from "@/components/ui/kpi-card";
import { Surface } from "@/components/ui/surface";
import { formatXof } from "@/lib/comptabilite/money";

export const metadata: Metadata = { title: "Comptabilité" };

export default async function ComptabiliteHubPage() {
  const user = await requireUser();
  if (
    !hasAnyPermission(user, ["cpt.access", "cpt.etats.view", "bud.view"])
  ) {
    redirect("/accueil");
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const year = now.getFullYear();

  const canManageEntries = hasPermission(user, "cpt.ecritures.manage");

  const [draftCount, validatedThisMonth, bankCount, budgetSum, toBookCount] =
    await Promise.all([
      prisma.cptEntry.count({ where: { status: "DRAFT" } }),
      prisma.cptEntry.count({
        where: {
          status: "VALIDATED",
          entryDate: { gte: monthStart, lt: monthEnd },
        },
      }),
      prisma.cptBankAccount.count({ where: { active: true } }),
      prisma.budLine.aggregate({
        where: { exercise: { year } },
        _sum: { planned: true },
      }),
      canManageEntries
        ? (async () => {
            const linked = await prisma.cptEntry.findMany({
              where: { sourceType: "COM_INVOICE", sourceId: { not: null } },
              select: { sourceId: true },
            });
            const linkedIds = linked
              .map((e) => e.sourceId)
              .filter((id): id is string => !!id);
            return prisma.comInvoice.count({
              where: {
                status: { in: ["EMISE", "PARTIELLEMENT_PAYEE", "PAYEE"] },
                id: { notIn: linkedIds.length ? linkedIds : ["__none__"] },
              },
            });
          })()
        : Promise.resolve(0),
    ]);

  const canCpt = hasPermission(user, "cpt.access");
  const canEtats = hasAnyPermission(user, ["cpt.etats.view", "cpt.access"]);
  const canBud = hasPermission(user, "bud.view");
  const canFiscal = hasAnyPermission(user, [
    "cpt.fiscalite.manage",
    "cpt.access",
  ]);

  const navItems = [
    canCpt && {
      href: "/comptabilite/plan",
      label: "Plan de comptes",
      icon: ListOrdered,
      desc: "Comptes SYSCOHADA, classes 1 à 8",
    },
    canCpt && {
      href: "/comptabilite/journaux",
      label: "Journaux",
      icon: BookOpen,
      desc: "Achats, ventes, banque, OD…",
    },
    canCpt && {
      href: "/comptabilite/ecritures",
      label: "Écritures",
      icon: FileSpreadsheet,
      desc: "Saisie, validation, brouillons",
    },
    canManageEntries && {
      href: "/comptabilite/a-comptabiliser",
      label: "À comptabiliser",
      icon: ReceiptText,
      desc:
        toBookCount > 0
          ? `${toBookCount} facture${toBookCount > 1 ? "s" : ""} en attente`
          : "Factures COM → proposition VE",
    },
    canEtats && {
      href: "/comptabilite/grand-livre",
      label: "Grand livre",
      icon: ReceiptText,
      desc: "Mouvements validés par compte",
    },
    canEtats && {
      href: "/comptabilite/etats",
      label: "États financiers",
      icon: LineChart,
      desc: "Balance, bilan, compte de résultat",
    },
    canCpt && {
      href: "/comptabilite/banques",
      label: "Banques",
      icon: Landmark,
      desc: "Comptes, mouvements, rapprochement",
    },
    canBud && {
      href: "/comptabilite/budget",
      label: "Budget",
      icon: Wallet,
      desc: `Exercice ${year} — CAPEX / OPEX`,
    },
    canFiscal && {
      href: "/comptabilite/fiscalite",
      label: "Fiscalité assistée",
      icon: Building2,
      desc: "TVA, patente",
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    icon: typeof BookOpen;
    desc: string;
  }[];

  return (
    <PageShell>
      <PageHeader
        title="Comptabilité"
        description="Plan de comptes, écritures, banques, états financiers et budget."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Comptabilité" },
        ]}
      />

      <KpiGrid
        items={[
          {
            label: "Brouillons en attente",
            value: String(draftCount),
            hint: "À valider",
          },
          ...(canManageEntries
            ? [
                {
                  label: "Factures à comptabiliser",
                  value: String(toBookCount),
                  hint: "File COM → VE",
                },
              ]
            : []),
          {
            label: "Validées ce mois",
            value: String(validatedThisMonth),
            hint: now.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            }),
          },
          {
            label: "Comptes bancaires",
            value: String(bankCount),
            hint: "Actifs",
          },
          {
            label: `Budget ${year}`,
            value: formatXof(budgetSum._sum.planned ?? 0),
            hint: "Prévu cumulé",
          },
        ]}
      />

      <div className="grid min-w-0 gap-3 grid-cols-1 @min-[28rem]:grid-cols-2 @min-[64rem]:grid-cols-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link prefetch={false} key={item.href} href={item.href}>
              <Surface className="h-full p-5 transition hover:border-msk-blue/30 hover:shadow-md">
                <Icon className="h-5 w-5 text-msk-blue" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-msk-ink">
                  {item.label}
                </p>
                <p className="mt-1 text-xs text-msk-ink/50">{item.desc}</p>
              </Surface>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
