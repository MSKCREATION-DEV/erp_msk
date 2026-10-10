import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { SOURCE_LABELS } from "@/lib/crm/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ScriptCopyButton } from "@/components/crm/script-copy-button";
import { ScriptToggleButton } from "@/components/crm/script-toggle-button";

export const metadata: Metadata = { title: "Scripts CRM" };

const linkBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition";
const linkPrimary = `${linkBtn} bg-msk-blue text-white hover:bg-msk-blue/90`;

export default async function CrmScriptsPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.scripts.view")) redirect("/crm");

  const canManage = hasPermission(user, "crm.scripts.manage");
  const scripts = await prisma.crmScript.findMany({
    where: canManage ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  return (
    <PageShell>
      <PageHeader
        title="Scripts"
        description="Modèles IG / LinkedIn / WhatsApp / téléphone — variables {{prenom}}, {{entreprise}}, {{offre}}, {{commercial}}."
        backHref="/crm"
        backLabel="Retour au CRM"
        breadcrumbs={[
          { label: "CRM", href: "/crm" },
          { label: "Scripts" },
        ]}
        actions={
          canManage ? (
            <Link prefetch={false} href="/crm/scripts/nouveau" className={linkPrimary}>
              Nouveau script
            </Link>
          ) : null
        }
      />

      {scripts.length === 0 ? (
        <Surface className="p-10 text-center text-sm text-msk-ink/40">
          Aucun script.
          {canManage ? (
            <>
              {" "}
              <Link prefetch={false}
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
          {scripts.map((s) => (
            <Surface
              key={s.id}
              className={`flex flex-col p-5 ${!s.active ? "opacity-60" : ""}`}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-msk-ink">{s.title}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="muted">
                      {SOURCE_LABELS[s.channel] ?? s.channel}
                    </Badge>
                    <Badge tone="muted" className="font-mono">
                      {s.code}
                    </Badge>
                    {!s.active ? <Badge tone="coral">Inactif</Badge> : null}
                  </div>
                </div>
                <ScriptCopyButton text={s.body} />
              </div>
              <pre className="flex-1 whitespace-pre-wrap rounded-lg bg-msk-chalk/80 p-3 text-sm leading-relaxed text-msk-ink/80">
                {s.body}
              </pre>
              {s.tips ? (
                <p className="mt-3 text-xs text-msk-ink/45">{s.tips}</p>
              ) : null}
              {canManage ? (
                <div className="mt-4 flex gap-2 border-t border-msk-ink/[0.06] pt-3">
                  <Link prefetch={false}
                    href={`/crm/scripts/${s.id}/edit`}
                    className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-msk-ink/15 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
                  >
                    Éditer
                  </Link>
                  <ScriptToggleButton id={s.id} active={s.active} />
                </div>
              ) : null}
            </Surface>
          ))}
        </div>
      )}
    </PageShell>
  );
}
