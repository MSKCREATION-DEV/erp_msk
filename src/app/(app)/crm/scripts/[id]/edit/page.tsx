import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        description={script.code}
        backHref="/crm/scripts"
        backLabel="Retour aux scripts"
        breadcrumbs={[
          { label: "CRM", href: "/crm" },
          { label: "Scripts", href: "/crm/scripts" },
          { label: "Éditer" },
        ]}
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Modifier le script</CardTitle>
        </CardHeader>
        <CardContent>
          <ScriptForm
            redirectTo="/crm/scripts"
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
        </CardContent>
      </Card>
    </PageShell>
  );
}
