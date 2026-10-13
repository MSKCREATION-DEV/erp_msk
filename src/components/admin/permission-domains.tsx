"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type PermissionOption = {
  id: string;
  code: string;
  domain: string;
  description?: string | null;
};

export type PermissionMark = {
  /** GRANT / DENY / Pack / Groupe */
  label: string;
  tone?: "success" | "coral" | "blue" | "muted" | "ink";
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
  pat: "Patrimoine",
  ged: "GED",
};

/** Domaines commerciaux mis en avant dans le picker overrides. */
const COMMERCIAL_DOMAINS = new Set(["crm", "com"]);

export function PermissionDomainPicker({
  permissions,
  name = "permissionCode",
  mode = "single",
  /** Codes déjà cochés (contrôlé ou default). */
  selectedCodes,
  defaultSelectedCodes = [],
  onChange,
  /** Badges (Pack / Groupe / GRANT / DENY) sur chaque permission. */
  marksByCode,
  /** Filtrer / prioriser CRM + Commercial. */
  preferDomains,
}: {
  permissions: PermissionOption[];
  name?: string;
  mode?: "single" | "multi";
  selectedCodes?: string[];
  defaultSelectedCodes?: string[];
  onChange?: (codes: string[]) => void;
  marksByCode?: Record<string, PermissionMark>;
  preferDomains?: string[];
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [uncontrolled, setUncontrolled] = useState(
    () => new Set(defaultSelectedCodes),
  );

  const controlled = selectedCodes != null || Boolean(onChange);
  const selected = useMemo(() => {
    if (selectedCodes != null) return new Set(selectedCodes);
    return uncontrolled;
  }, [selectedCodes, uncontrolled]);

  function toggleCode(code: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(code);
    else next.delete(code);
    const arr = [...next];
    if (onChange) onChange(arr);
    else if (selectedCodes == null) setUncontrolled(next);
  }

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
    const entries = [...map.entries()];
    const prefer = new Set(preferDomains ?? []);
    entries.sort(([a], [b]) => {
      const ap = prefer.has(a) || COMMERCIAL_DOMAINS.has(a) ? 0 : 1;
      const bp = prefer.has(b) || COMMERCIAL_DOMAINS.has(b) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.localeCompare(b);
    });
    return entries;
  }, [permissions, q, preferDomains]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-msk-ink/35" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une permission (crm., com., …)"
          className="pl-9"
        />
      </div>
      <div className="divide-y divide-msk-ink/[0.06] overflow-hidden rounded-xl border border-msk-ink/10 bg-white">
        {byDomain.map(([domain, perms]) => {
          const isOpen = open[domain] ?? true;
          const selectedInDomain = perms.filter((p) =>
            selected.has(p.code),
          ).length;
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
                    {selectedInDomain > 0
                      ? ` · ${selectedInDomain} coché(s)`
                      : ""}
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
                  {perms.map((p) => {
                    const isOn = selected.has(p.code);
                    const mark = marksByCode?.[p.code];
                    return (
                      <label
                        key={p.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-sm transition",
                          isOn
                            ? "bg-msk-blue/[0.06] ring-1 ring-msk-blue/20"
                            : "hover:bg-msk-chalk/60",
                        )}
                      >
                        {mode === "single" ? (
                          <input
                            type="radio"
                            name={name}
                            value={p.code}
                            checked={isOn}
                            onChange={() => {
                              if (onChange) onChange([p.code]);
                              else setUncontrolled(new Set([p.code]));
                            }}
                            className="mt-0.5 accent-msk-blue"
                            required
                          />
                        ) : (
                          <>
                            <input
                              type="checkbox"
                              name={controlled && onChange ? undefined : name}
                              value={p.code}
                              checked={isOn}
                              onChange={(e) =>
                                toggleCode(p.code, e.target.checked)
                              }
                              className="peer sr-only"
                            />
                            {/* Hidden inputs for uncontrolled form submit when controlled via onChange */}
                            {controlled && onChange && isOn ? (
                              <input type="hidden" name={name} value={p.code} />
                            ) : null}
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-msk-ink/20 transition",
                                isOn && "border-msk-blue bg-msk-blue",
                              )}
                              aria-hidden
                            >
                              <Check
                                className={cn(
                                  "h-3 w-3 text-white transition",
                                  isOn ? "opacity-100" : "opacity-0",
                                )}
                                strokeWidth={3}
                              />
                            </span>
                          </>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-msk-ink">
                              {p.code}
                            </span>
                            {mark ? (
                              <Badge tone={mark.tone ?? "muted"}>
                                {mark.label}
                              </Badge>
                            ) : null}
                          </span>
                          {p.description ? (
                            <span className="mt-0.5 block text-xs text-msk-ink/45">
                              {p.description}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
