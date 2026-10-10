import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { groupLabel, packLabel } from "@/lib/rbac/labels";

export function AccessCompositionCard({
  groups,
  directPackCodes,
  overrideCount,
}: {
  groups: { code: string; defaultPackCode: string | null }[];
  directPackCodes: string[];
  overrideCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Composition des droits</CardTitle>
        <CardDescription>
          Ordre de résolution : groupes (pack défaut) → packs directs →
          overrides GRANT/DENY.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <Layer
          title="1 · Groupes"
          hint="Appartenance → pack défaut"
          empty="Aucun groupe"
        >
          {groups.length === 0 ? null : (
            <ul className="space-y-2 text-sm">
              {groups.map((g) => (
                <li key={g.code}>
                  <Badge tone="ink">{groupLabel(g.code)}</Badge>
                  <span className="mt-0.5 block text-xs text-msk-ink/45">
                    {g.defaultPackCode
                      ? `→ pack ${packLabel(g.defaultPackCode)}`
                      : "→ aucun pack défaut"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Layer>
        <Layer
          title="2 · Packs directs"
          hint="Assignés hors héritage groupe"
          empty="Aucun pack direct (OK si groupes suffisent)"
        >
          {directPackCodes.length === 0 ? null : (
            <div className="flex flex-wrap gap-1.5">
              {directPackCodes.map((code) => (
                <Badge key={code} tone="blue">
                  {packLabel(code)}
                </Badge>
              ))}
            </div>
          )}
        </Layer>
        <Layer
          title="3 · Overrides"
          hint="Exceptions individuelles"
          empty="Aucune exception"
        >
          {overrideCount > 0 ? (
            <p className="text-sm text-msk-ink/70">
              {overrideCount} exception(s) GRANT/DENY
            </p>
          ) : null}
        </Layer>
      </CardContent>
    </Card>
  );
}

function Layer({
  title,
  hint,
  empty,
  children,
}: {
  title: string;
  hint: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-msk-ink/10 bg-msk-chalk/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-msk-ink/40">
        {title}
      </p>
      <p className="mt-0.5 text-[11px] text-msk-ink/40">{hint}</p>
      <div className="mt-3">
        {children ?? <p className="text-sm text-msk-ink/35">{empty}</p>}
      </div>
    </div>
  );
}
