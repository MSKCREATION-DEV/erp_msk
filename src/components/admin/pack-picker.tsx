"use client";

import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export type PackOption = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  permissionCount?: number;
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
}: {
  packs: PackOption[];
  name?: string;
  defaultSelected?: string[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {packs.map((pack) => {
        const level = LEVEL[pack.code] ?? 40;
        return (
          <label
            key={pack.id}
            className={cn(
              "group relative flex cursor-pointer flex-col rounded-xl border border-msk-ink/10 bg-white p-4 transition",
              "has-[:checked]:border-msk-blue has-[:checked]:bg-msk-blue/[0.04] has-[:checked]:shadow-sm",
            )}
          >
            <input
              type="checkbox"
              name={name}
              value={pack.id}
              defaultChecked={defaultSelected.includes(pack.id)}
              className="peer sr-only"
            />
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-msk-blue/10 text-msk-blue peer-checked:bg-msk-blue peer-checked:text-white">
                <Shield className="h-4 w-4" />
              </span>
              <span className="mt-1 h-4 w-4 rounded-full border-2 border-msk-ink/20 peer-checked:border-msk-blue peer-checked:bg-msk-blue" />
            </div>
            <p className="mt-3 text-sm font-semibold text-msk-ink">{pack.name}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-msk-ink/50">
              {pack.description || pack.code}
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
        );
      })}
    </div>
  );
}
