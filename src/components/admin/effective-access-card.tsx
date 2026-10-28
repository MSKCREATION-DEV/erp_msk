import type { PermissionProvenance } from "@/lib/rbac/resolve";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function sourceLabel(source: PermissionProvenance["sources"][number]): string {
  switch (source.kind) {
    case "super_admin":
      return "Super Admin";
    case "group_pack":
      return `Groupe « ${source.groupName} » → pack ${source.packName}`;
    case "direct_pack":
      return `Pack direct « ${source.packName} »`;
    case "override_grant":
      return source.reason
        ? `Override GRANT — ${source.reason}`
        : "Override GRANT";
    case "override_deny":
      return source.reason
        ? `Override DENY — ${source.reason}`
        : "Override DENY";
  }
}

export function EffectiveAccessCard({
  isSuperAdmin,
  entries,
}: {
  isSuperAdmin: boolean;
  entries: PermissionProvenance[];
}) {
  const effective = entries.filter((e) => e.effective);
  const denied = entries.filter(
    (e) => !e.effective && e.sources.some((s) => s.kind === "override_deny"),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accès effectifs</CardTitle>
        <CardDescription>
          Provenance des droits : groupes (pack défaut), packs directs, overrides.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSuperAdmin ? (
          <div className="rounded-xl border border-msk-blue/20 bg-msk-blue/4 px-4 py-3">
            <Badge tone="blue">Accès total</Badge>
            <p className="mt-2 text-sm text-msk-ink/60">
              Super Admin — toutes les permissions catalogue, hors résolution
              packs / groupes / overrides.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-msk-ink/55">
              <span className="font-semibold tabular-nums text-msk-ink">
                {effective.length}
              </span>{" "}
              permission(s) effective(s)
              {denied.length > 0
                ? ` · ${denied.length} retirée(s) par DENY`
                : ""}
            </p>

            {effective.length === 0 && denied.length === 0 ? (
              <p className="rounded-lg border border-dashed border-msk-ink/15 px-3 py-4 text-center text-sm text-msk-ink/40">
                Aucun droit résolu (aucun pack ni groupe avec pack défaut).
              </p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
                {effective.map((e) => (
                  <li
                    key={e.code}
                    className="rounded-lg border border-msk-ink/7 bg-[#F8F9FB] px-3 py-2"
                  >
                    <p className="font-mono text-xs font-medium text-msk-ink">
                      {e.code}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-msk-ink/50">
                      {e.sources
                        .filter((s) => s.kind !== "override_deny")
                        .map((s, i) => (
                          <li key={`${e.code}-${i}`}>{sourceLabel(s)}</li>
                        ))}
                    </ul>
                  </li>
                ))}
                {denied.map((e) => (
                  <li
                    key={`deny-${e.code}`}
                    className="rounded-lg border border-msk-coral/20 bg-msk-coral/4 px-3 py-2"
                  >
                    <p className="font-mono text-xs font-medium text-msk-coral">
                      {e.code}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-msk-ink/50">
                      {e.sources.map((s, i) => (
                        <li key={`${e.code}-d-${i}`}>{sourceLabel(s)}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
