"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FieldLabel } from "@/components/ui/field-label";
import { cn } from "@/lib/utils";

export type ProspectSelectRow = {
  id: string;
  orgName: string;
  stageLabel: string;
  ownerLabel: string;
  contactLabel?: string | null;
};

/**
 * Sélection prospect — tableau + recherche (jamais d’ID à coller).
 */
export function ProspectSelectTable({
  rows,
  value,
  onChange,
  disabled,
  label = "Prospect",
  required,
  emptyMessage = "Aucun prospect disponible.",
}: {
  rows: ProspectSelectRow[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  emptyMessage?: string;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const hay =
        `${r.orgName} ${r.ownerLabel} ${r.stageLabel} ${r.contactLabel ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  const selected = rows.find((r) => r.id === value) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FieldLabel required={required}>{label}</FieldLabel>
        {selected ? (
          <p className="text-sm text-msk-ink/55">
            Sélection :{" "}
            <span className="font-medium text-msk-ink">{selected.orgName}</span>
          </p>
        ) : null}
      </div>

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-msk-ink/35"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled}
          placeholder="Rechercher entreprise, contact, suivi…"
          className="pl-9"
          aria-label="Rechercher un prospect"
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-msk-ink/10 px-4 py-8 text-center text-sm text-msk-ink/40">
          {emptyMessage}
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-msk-ink/10 px-4 py-8 text-center text-sm text-msk-ink/40">
          Aucun résultat pour « {q.trim()} ».
        </p>
      ) : (
        <div
          className="overflow-x-auto rounded-xl border border-msk-ink/8"
          role="listbox"
          aria-label={label}
        >
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="border-b border-msk-ink/8 bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
              <tr>
                <th className="w-10 px-3 py-2.5" scope="col">
                  <span className="sr-only">Choisir</span>
                </th>
                <th className="px-3 py-2.5 font-semibold" scope="col">
                  Entreprise
                </th>
                <th className="px-3 py-2.5 font-semibold" scope="col">
                  Contact
                </th>
                <th className="px-3 py-2.5 font-semibold" scope="col">
                  Statut
                </th>
                <th className="px-3 py-2.5 font-semibold" scope="col">
                  Suivi par
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-ink/6">
              {filtered.map((r) => {
                const active = value === r.id;
                return (
                  <tr
                    key={r.id}
                    role="option"
                    aria-selected={active}
                    tabIndex={disabled ? -1 : 0}
                    onClick={() => {
                      if (!disabled) onChange(r.id);
                    }}
                    onKeyDown={(e) => {
                      if (disabled) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onChange(r.id);
                      }
                    }}
                    className={cn(
                      "cursor-pointer outline-none transition",
                      active ? "bg-msk-blue/8" : "hover:bg-msk-chalk/60",
                      disabled && "cursor-not-allowed opacity-60",
                      "focus-visible:ring-2 focus-visible:ring-msk-blue/30 focus-visible:ring-inset",
                    )}
                  >
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border-2",
                          active
                            ? "border-msk-blue bg-msk-blue"
                            : "border-msk-ink/25 bg-white",
                        )}
                        aria-hidden
                      >
                        {active ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-msk-ink">
                      {r.orgName}
                    </td>
                    <td className="px-3 py-3 text-msk-ink/60">
                      {r.contactLabel?.trim() || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone="muted">{r.stageLabel}</Badge>
                    </td>
                    <td className="px-3 py-3 text-msk-ink/60">{r.ownerLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
