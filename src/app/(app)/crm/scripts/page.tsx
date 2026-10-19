import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CrmSource } from "@prisma/client";
import {
  AtSign,
  Camera,
  Mail,
  MessageCircle,
  MessageSquarePlus,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { SOURCE_LABELS } from "@/lib/crm/labels";
import type { ScriptVars } from "@/lib/crm/script-vars";
import { firstParam } from "@/lib/list/search-params";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ActionLink } from "@/components/ui/action-link";
import { ScriptCopyButton } from "@/components/crm/script-copy-button";
import { ScriptToggleButton } from "@/components/crm/script-toggle-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Scripts CRM" };

const CHANNEL_FILTERS: (CrmSource | "ALL")[] = [
  "ALL",
  "INSTAGRAM",
  "LINKEDIN",
  "WHATSAPP",
  "EMAIL",
  "TELEPHONE",
];

const CHANNEL_ICONS: Partial<Record<CrmSource | "ALL", LucideIcon>> = {
  ALL: MessageCircle,
  INSTAGRAM: Camera,
  LINKEDIN: AtSign,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  TELEPHONE: Phone,
};


export default async function CrmScriptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.scripts.view")) redirect("/crm");

  const sp = await searchParams;
  const canalRaw = (firstParam(sp.canal) ?? "").trim();
  const openCode = (firstParam(sp.open) ?? "").trim();
  const channel =
    canalRaw && canalRaw !== "ALL" && canalRaw in SOURCE_LABELS
      ? (canalRaw as CrmSource)
      : null;

  const canManage = hasPermission(user, "crm.scripts.manage");
  const scripts = await prisma.crmScript.findMany({
    where: {
      ...(canManage ? {} : { active: true }),
      ...(channel ? { channel } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  const commercial = `${user.firstName} ${user.lastName}`.trim();
  const defaults: ScriptVars = {
    commercial,
    prenom: (firstParam(sp.prenom) ?? "").trim(),
    entreprise: (firstParam(sp.entreprise) ?? "").trim(),
    offre: (firstParam(sp.offre) ?? "").trim(),
    secteur: (firstParam(sp.secteur) ?? "").trim(),
    ville: (firstParam(sp.ville) ?? "").trim() || "Bamako",
    source: (firstParam(sp.source) ?? "").trim(),
  };

  const autoOpenId =
    openCode && scripts.length
      ? (scripts.find((s) => s.code === openCode)?.id ?? scripts[0]?.id)
      : defaults.prenom || defaults.entreprise
        ? scripts[0]?.id
        : undefined;

  return (
    <PageShell>
      <PageHeader
        title="Scripts"
        description="Modèles IG / LinkedIn / WhatsApp / e-mail / téléphone — personnaliser puis copier."
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Scripts" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              prefetch={false}
              href="/crm/rapport-semaine"
              className="text-sm font-medium text-msk-ink/50 hover:text-msk-blue hover:underline"
            >
              Feedback scripts
            </Link>
            {canManage ? (
              <ActionLink href="/crm/scripts/nouveau" icon={MessageSquarePlus}>
                Nouveau script
              </ActionLink>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {CHANNEL_FILTERS.map((c) => {
          const active = (channel ?? "ALL") === c;
          const href =
            c === "ALL" ? "/crm/scripts" : `/crm/scripts?canal=${c}`;
          const Icon = CHANNEL_ICONS[c] ?? MessageCircle;
          return (
            <Link
              key={c}
              prefetch={false}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                active
                  ? "bg-msk-blue text-white"
                  : "bg-white text-msk-ink/55 hover:bg-msk-chalk",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {c === "ALL" ? "Tous" : SOURCE_LABELS[c]}
            </Link>
          );
        })}
      </div>

      {scripts.length === 0 ? (
        <Surface className="p-10 text-center text-sm text-msk-ink/40">
          Aucun script.
          {canManage ? (
            <>
              {" "}
              <Link
                prefetch={false}
                href="/crm/scripts/nouveau"
                className="font-medium text-msk-blue hover:underline"
              >
                Créer le premier
              </Link>
            </>
          ) : null}
        </Surface>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {scripts.map((s) => {
            const Icon = CHANNEL_ICONS[s.channel] ?? MessageCircle;
            return (
              <Surface
                key={s.id}
                className={cn(
                  "flex flex-col p-5",
                  !s.active && "opacity-60",
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-msk-ink">{s.title}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone="muted" className="inline-flex gap-1">
                        <Icon className="h-3 w-3" aria-hidden />
                        {SOURCE_LABELS[s.channel] ?? s.channel}
                      </Badge>
                      {canManage ? (
                        <Badge tone="muted" className="font-mono text-[10px]">
                          {s.code}
                        </Badge>
                      ) : null}
                      {!s.active ? (
                        <Badge tone="coral">Inactif</Badge>
                      ) : null}
                    </div>
                  </div>
                  <ScriptCopyButton
                    text={s.body}
                    title={s.title}
                    defaults={defaults}
                    autoOpen={autoOpenId === s.id}
                  />
                </div>
                <pre className="flex-1 whitespace-pre-wrap rounded-lg bg-msk-chalk/80 p-3 text-sm leading-relaxed text-msk-ink/80">
                  {s.body}
                </pre>
                {s.tips ? (
                  <p className="mt-3 text-xs leading-relaxed text-msk-ink/45">
                    <span className="font-semibold text-msk-ink/55">
                      Conseil —{" "}
                    </span>
                    {s.tips}
                  </p>
                ) : null}
                {canManage ? (
                  <div className="mt-4 flex gap-2 border-t border-msk-ink/6 pt-3">
                    <Link
                      prefetch={false}
                      href={`/crm/scripts/${s.id}/edit`}
                      className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-msk-ink/15 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
                    >
                      Éditer
                    </Link>
                    <ScriptToggleButton id={s.id} active={s.active} />
                  </div>
                ) : null}
              </Surface>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
