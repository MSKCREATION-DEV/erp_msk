import type { Metadata } from "next";
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

export const metadata: Metadata = { title: "Scripts CRM" };

export default async function CrmScriptsPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.scripts.view")) redirect("/crm");

  const scripts = await prisma.crmScript.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  return (
    <PageShell>
      <PageHeader
        title="Scripts"
        description="Modèles IG / LinkedIn / WhatsApp / téléphone — variables {{prenom}}, {{entreprise}}, {{offre}}, {{commercial}}."
        breadcrumbs={[
          { label: "CRM", href: "/crm" },
          { label: "Scripts" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {scripts.map((s) => (
          <Surface key={s.id} className="flex flex-col p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-msk-ink">{s.title}</h2>
                <Badge tone="muted" className="mt-1">
                  {SOURCE_LABELS[s.channel] ?? s.channel}
                </Badge>
              </div>
              <ScriptCopyButton text={s.body} />
            </div>
            <pre className="whitespace-pre-wrap rounded-lg bg-msk-chalk/80 p-3 text-sm leading-relaxed text-msk-ink/80">
              {s.body}
            </pre>
            {s.tips ? (
              <p className="mt-3 text-xs text-msk-ink/45">{s.tips}</p>
            ) : null}
          </Surface>
        ))}
      </div>
    </PageShell>
  );
}
