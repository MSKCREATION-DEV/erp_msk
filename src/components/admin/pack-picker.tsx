"use client";

import { useState } from "react";
import { Check, ChevronDown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export type PackOption = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  permissionCount?: number;
  permissionCodes?: string[];
};

const LEVEL: Record<string, number> = {
  collaborateur: 20,
  commercial: 35,
  projets: 35,
  stock: 35,
  comptable: 50,
  admin_crm: 60,
  admin_rh: 65,
  direction: 75,
  admin_plateforme: 95,
};

export function PackPicker({
  packs,
  name = "packIds",
  defaultSelected = [],
  selected,
  compact = false,
  onChange,
  /** Packs déjà couverts via groupe (affichage « Hérité », pas un pack direct). */
  inheritedPackIds = [],
}: {
  packs: PackOption[];
  name?: string;
  defaultSelected?: string[];
  selected?: string[];
  compact?: boolean;
  onChange?: (ids: string[]) => void;
  inheritedPackIds?: string[];
}) {
  const controlled = selected != null || Boolean(onChange);
  const current = selected ?? defaultSelected;
  const inherited = new Set(inheritedPackIds);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(id: string, checked: boolean) {
    if (!onChange) return;
    const next = checked
      ? [...current, id]
      : current.filter((x) => x !== id);
    onChange(next);
  }

  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-1" : "sm:grid-cols-2",
      )}
    >
      {packs.map((pack) => {
        const level = LEVEL[pack.code] ?? 40;
        const isOn = current.includes(pack.id);
        const isInherited = inherited.has(pack.id) && !isOn;
        const codes = pack.permissionCodes ?? [];
        const isExpanded = expanded[pack.id] ?? false;
        const preview = codes.slice(0, 4);
        const rest = codes.length - preview.length;

        return (
          <div
            key={pack.id}
            className={cn(
              "rounded-xl border border-msk-ink/10 bg-white transition",
              isOn &&
                "border-msk-blue bg-msk-blue/[0.04] shadow-sm",
              isInherited && "border-msk-ink/15 bg-msk-chalk/40",
            )}
          >
            <label className="group flex cursor-pointer flex-col p-4">
              <input
                type="checkbox"
                name={controlled && onChange ? undefined : name}
                value={pack.id}
                {...(controlled
                  ? {
                      checked: isOn,
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                        toggle(pack.id, e.target.checked),
                    }
                  : { defaultChecked: isOn })}
                className="peer sr-only"
              />
              {controlled && onChange && isOn ? (
                <input type="hidden" name={name} value={pack.id} />
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg bg-msk-blue/10 text-msk-blue transition",
                    isOn && "bg-msk-blue text-white",
                  )}
                >
                  <Shield className="h-4 w-4" />
                </span>
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 items-center justify-center rounded border-2 border-msk-ink/20 transition",
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
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold text-msk-ink">{pack.name}</p>
                {isInherited ? (
                  <span className="rounded-md bg-msk-ink/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-msk-ink/50">
                    Hérité groupe
                  </span>
                ) : null}
                {isOn && inherited.has(pack.id) ? (
                  <span className="rounded-md bg-msk-blue/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-msk-blue">
                    Direct + hérité
                  </span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-msk-ink/50">
                {isInherited
                  ? "Déjà inclus via un groupe — ne cochez ici que pour un cumul direct."
                  : pack.description || pack.code}
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wider text-msk-ink/35">
                  <span>Niveau</span>
                  {pack.permissionCount != null ? (
                    <span>{pack.permissionCount} perm.</span>
                  ) : null}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-msk-ink/[0.06]">
                  <div
                    className="h-full rounded-full bg-msk-blue"
                    style={{ width: `${level}%` }}
                  />
                </div>
              </div>
            </label>

            {codes.length > 0 ? (
              <div className="border-t border-msk-ink/[0.06] px-4 py-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((s) => ({ ...s, [pack.id]: !isExpanded }))
                  }
                  className="flex w-full cursor-pointer items-center justify-between text-left text-[11px] font-medium text-msk-ink/45 hover:text-msk-blue"
                >
                  <span>
                    {isExpanded
                      ? "Masquer les permissions"
                      : `Permissions (${codes.length})`}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition",
                      isExpanded && "rotate-180",
                    )}
                  />
                </button>
                {isExpanded ? (
                  <ul className="mt-2 space-y-0.5 text-[11px] text-msk-ink/55">
                    {codes.map((code) => (
                      <li key={code} className="font-mono">
                        {code}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 truncate text-[11px] text-msk-ink/40">
                    {preview.join(", ")}
                    {rest > 0 ? ` +${rest}` : ""}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
