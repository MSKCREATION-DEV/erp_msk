"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type GroupOption = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  defaultPackName?: string | null;
  defaultPackCode?: string | null;
};

export function GroupPicker({
  groups,
  name = "groupIds",
  defaultSelected = [],
  selected,
  onChange,
}: {
  groups: GroupOption[];
  name?: string;
  defaultSelected?: string[];
  selected?: string[];
  onChange?: (ids: string[]) => void;
}) {
  const controlled = selected != null || Boolean(onChange);
  const current = selected ?? defaultSelected;

  function toggle(id: string, checked: boolean) {
    if (!onChange) return;
    const next = checked
      ? [...current, id]
      : current.filter((x) => x !== id);
    onChange(next);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {groups.map((g) => {
        const isOn = current.includes(g.id);
        return (
          <label
            key={g.id}
            title={g.description ?? undefined}
            className={cn(
              "group flex cursor-pointer items-start gap-3 rounded-xl border border-msk-ink/10 bg-white px-3.5 py-3 transition",
              isOn && "border-msk-blue bg-msk-blue/[0.04]",
            )}
          >
            <input
              type="checkbox"
              name={controlled && onChange ? undefined : name}
              value={g.id}
              {...(controlled
                ? {
                    checked: isOn,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                      toggle(g.id, e.target.checked),
                  }
                : { defaultChecked: isOn })}
              className="peer sr-only"
            />
            {controlled && onChange && isOn ? (
              <input type="hidden" name={name} value={g.id} />
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
            <span className="min-w-0">
              <span className="block text-sm font-medium text-msk-ink">
                {g.name}
              </span>
              {g.defaultPackName ? (
                <span className="mt-0.5 block text-xs text-msk-ink/45">
                  Pack défaut : {g.defaultPackName}
                </span>
              ) : (
                <span className="mt-0.5 block text-xs text-msk-ink/35">
                  Aucun pack défaut
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
