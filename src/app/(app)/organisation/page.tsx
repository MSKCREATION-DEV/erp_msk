import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Organisation" };

export default async function OrganisationPage() {
  const user = await requireUser();
  if (!hasPermission(user, "orgchart.view")) redirect("/accueil");

  const nodes = await prisma.orgNode.findMany({
    orderBy: [{ sortOrder: "asc" }, { fullName: "asc" }],
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      parent: { select: { fullName: true, title: true } },
    },
  });

  const roots = nodes.filter((n) => !n.parentId);
  const byParent = new Map<string, typeof nodes>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const list = byParent.get(n.parentId) ?? [];
    list.push(n);
    byParent.set(n.parentId, list);
  }

  return (
    <PageShell>
      <PageHeader
        title="Organigramme"
        description="Équipe MSK CREATION — vue lecture (seed Phase 1)."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Organisation" },
        ]}
      />

      {nodes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-msk-ink/45">
            Aucun nœud — lancez le seed Phase 1.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {roots.map((root) => (
            <OrgBranch
              key={root.id}
              node={root}
              childrenMap={byParent}
              depth={0}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function OrgBranch({
  node,
  childrenMap,
  depth,
}: {
  node: {
    id: string;
    fullName: string;
    title: string;
    email: string | null;
    user: { firstName: string; lastName: string } | null;
  };
  childrenMap: Map<string, Array<{
    id: string;
    fullName: string;
    title: string;
    email: string | null;
    user: { firstName: string; lastName: string } | null;
  }>>;
  depth: number;
}) {
  const kids = childrenMap.get(node.id) ?? [];
  const [first, ...rest] = node.fullName.split(" ");
  const firstName = node.user?.firstName ?? first ?? "?";
  const lastName =
    node.user?.lastName ?? (rest.length ? rest.join(" ") : firstName);

  return (
    <div style={{ marginLeft: depth * 16 }} className="space-y-3">
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <UserAvatar firstName={firstName} lastName={lastName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-msk-ink">{node.fullName}</p>
            <p className="text-sm text-msk-ink/50">{node.title}</p>
            {node.email ? (
              <p className="mt-0.5 truncate text-xs text-msk-ink/40">
                {node.email}
              </p>
            ) : null}
          </div>
          {depth === 0 ? <Badge tone="blue">Direction</Badge> : null}
        </CardContent>
      </Card>
      {kids.map((child) => (
        <OrgBranch
          key={child.id}
          node={child}
          childrenMap={childrenMap}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
