"use client";

import { Plus, Trash2 } from "lucide-react";
import type { CrmContactChannelType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldHint, FieldLabel } from "@/components/ui/field-label";
import {
  CHANNEL_TYPE_LABELS,
  CHANNEL_TYPE_ORDER,
  type ChannelInput,
} from "@/lib/crm/channels";
import { cn } from "@/lib/utils";

const PLACEHOLDERS: Record<CrmContactChannelType, string> = {
  PHONE: "+221 77 000 00 00",
  EMAIL: "prenom@entreprise.ml",
  WHATSAPP: "+221 77 000 00 00",
  INSTAGRAM: "@compte ou URL",
  LINKEDIN: "linkedin.com/in/…",
  AUTRE: "Autre moyen…",
};

export function ContactChannelsEditor({
  value,
  onChange,
  disabled,
  error,
}: {
  value: ChannelInput[];
  onChange: (next: ChannelInput[]) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  function updateAt(index: number, patch: Partial<ChannelInput>) {
    const next = value.map((row, i) =>
      i === index ? { ...row, ...patch } : row,
    );
    onChange(next);
  }

  function setPrimary(index: number) {
    onChange(value.map((row, i) => ({ ...row, isPrimary: i === index })));
  }

  function addRow() {
    const used = new Set(value.map((v) => v.type));
    const nextType =
      CHANNEL_TYPE_ORDER.find((t) => !used.has(t)) ?? "AUTRE";
    onChange([
      ...value,
      {
        type: nextType,
        value: "",
        isPrimary: value.length === 0,
      },
    ]);
  }

  function removeRow(index: number) {
    if (value.length <= 1) return;
    const next = value.filter((_, i) => i !== index);
    if (!next.some((r) => r.isPrimary) && next[0]) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <FieldLabel required>Moyens de contact</FieldLabel>
          <FieldHint>
            Au moins un moyen · un seul principal (étoile).
          </FieldHint>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || value.length >= 6}
          onClick={addRow}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Ajouter
        </Button>
      </div>

      <ul className="space-y-2">
        {value.map((row, index) => (
          <li
            key={index}
            className={cn(
              "grid gap-2 rounded-xl border border-msk-ink/10 bg-msk-chalk/40 p-3 sm:grid-cols-[140px_1fr_auto_auto]",
              row.isPrimary && "border-msk-blue/30 bg-msk-blue/[0.04]",
            )}
          >
            <select
              value={row.type}
              disabled={disabled}
              onChange={(e) =>
                updateAt(index, {
                  type: e.target.value as CrmContactChannelType,
                })
              }
              className="h-10 rounded-lg border border-msk-ink/15 bg-white px-2 text-sm text-msk-ink outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/20"
              aria-label="Type de moyen"
            >
              {CHANNEL_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {CHANNEL_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <Input
              value={row.value}
              disabled={disabled}
              placeholder={PLACEHOLDERS[row.type]}
              onChange={(e) => updateAt(index, { value: e.target.value })}
              type={row.type === "EMAIL" ? "email" : "text"}
              inputMode={
                row.type === "PHONE" || row.type === "WHATSAPP"
                  ? "tel"
                  : undefined
              }
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPrimary(index)}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-lg border px-3 text-xs font-medium transition",
                row.isPrimary
                  ? "border-msk-blue bg-msk-blue text-white"
                  : "border-msk-ink/15 bg-white text-msk-ink/60 hover:border-msk-blue/40",
              )}
              aria-pressed={row.isPrimary}
            >
              {row.isPrimary ? "Principal" : "Principal ?"}
            </button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-10"
              disabled={disabled || value.length <= 1}
              onClick={() => removeRow(index)}
              aria-label="Retirer ce moyen"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="text-sm text-msk-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
