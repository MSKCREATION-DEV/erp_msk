"use client";

import { cn } from "@/lib/utils";

export type GroupOption = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
};

export function GroupPicker({
  groups,
  name = "groupIds",
  defaultSelected = [],
}: {
  groups: GroupOption[];
  name?: string;
  defaultSelected?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g) => (
        <label
          key={g.id}
          title={g.description ?? undefined}
          className={cn(
            "cursor-pointer rounded-full border border-msk-ink/10 bg-white px-3.5 py-2 text-sm font-medium text-msk-ink/70 transition",
            "has-[:checked]:border-msk-blue has-[:checked]:bg-msk-blue has-[:checked]:text-white",
          )}
        >
          <input
            type="checkbox"
            name={name}
            value={g.id}
            defaultChecked={defaultSelected.includes(g.id)}
            className="sr-only"
          />
          {g.name}
        </label>
      ))}
    </div>
  );
}
