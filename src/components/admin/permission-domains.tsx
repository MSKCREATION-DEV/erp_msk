"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type PermissionOption = {
  id: string;
  code: string;
  domain: string;
  description?: string | null;
};

const DOMAIN_LABELS: Record<string, string> = {
  iam: "Identité & accès",
  home: "Accueil",
  self: "Espace perso",
  cfg: "Configuration",
  audit: "Audit",
  crm: "CRM",
  com: "Commercial",
  rh: "RH",
  cpt: "Comptabilité",
  bud: "Budget",
  prj: "Projets",
  ops: "Ops",
  stk: "Stocks",
  ged: "GED",
};

export function PermissionDomainPicker({
  permissions,
  name = "permissionCode",
  mode = "single",
}: {
  permissions: PermissionOption[];
  name?: string;
  mode?: "single" | "multi";
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const byDomain = useMemo(() => {
    const map = new Map<string, PermissionOption[]>();
    const query = q.trim().toLowerCase();
    for (const p of permissions) {
      if (
        query &&
        !p.code.toLowerCase().includes(query) &&
        !(p.description ?? "").toLowerCase().includes(query)
      ) {
        continue;
      }
      const list = map.get(p.domain) ?? [];
      list.push(p);
      map.set(p.domain, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-msk-ink/35" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une permission…"
          className="pl-9"
        />
      </div>
      <div className="divide-y divide-msk-ink/[0.06] overflow-hidden rounded-xl border border-msk-ink/10 bg-white">
        {byDomain.map(([domain, perms]) => {
          const isOpen = open[domain] ?? true;
          return (
            <div key={domain}>
              <button
                type="button"
                onClick={() =>
                  setOpen((s) => ({ ...s, [domain]: !isOpen }))
                }
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left hover:bg-msk-chalk/50"
              >
                <span className="text-sm font-semibold text-msk-ink">
                  {DOMAIN_LABELS[domain] ?? domain}
                  <span className="ml-2 font-normal text-msk-ink/40">
                    {perms.length}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-msk-ink/40 transition",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen ? (
                <div className="grid gap-1 px-3 pb-3 sm:grid-cols-2">
                  {perms.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-msk-chalk/60"
                    >
                      <input
                        type={mode === "single" ? "radio" : "checkbox"}
                        name={name}
                        value={p.code}
                        className="mt-0.5 accent-msk-blue"
                        required={mode === "single"}
                      />
                      <span>
                        <span className="font-medium text-msk-ink">{p.code}</span>
                        {p.description ? (
                          <span className="mt-0.5 block text-xs text-msk-ink/45">
                            {p.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
