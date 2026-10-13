import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { ScriptForm } from "@/components/crm/script-form";

export const metadata: Metadata = { title: "Éditer script" };

export default async function CrmScriptEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.scripts.manage")) redirect("/crm/scripts");
  const { id } = await params;
  const script = await prisma.crmScript.findUnique({ where: { id } });
  if (!script) notFound();

  return (
    <PageShell>
      <PageHeader
        title={script.title}
        description={`Code : ${script.code}`}
        backHref="/crm/scripts"
        backLabel="Retour aux scripts"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Scripts", href: "/crm/scripts" },
          { label: "Éditer" },
        ]}
      />
      <ScriptForm
        initial={{
          id: script.id,
          code: script.code,
          channel: script.channel,
          title: script.title,
          body: script.body,
          tips: script.tips ?? "",
          sortOrder: String(script.sortOrder),
        }}
      />
    </PageShell>
  );
}
