"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type OptionPickerItem = {
  value: string;
  label: string;
  description?: string;
};

export function OptionPickerSingle({
  label,
  options,
  value,
  onChange,
  placeholder = "Choisir…",
  disabled,
  className,
  modalTitle,
  required,
}: {
  label: string;
  options: OptionPickerItem[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  modalTitle?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        o.value.toLowerCase().includes(needle),
    );
  }, [options, q]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-msk-ink">
          {label}
          {required ? (
            <>
              <span className="ml-0.5 font-semibold text-msk-coral" aria-hidden>
                *
              </span>
              <span className="sr-only"> (obligatoire)</span>
            </>
          ) : null}
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          {selected ? "Changer" : placeholder}
        </Button>
      </div>
      {selected ? (
        <span className="inline-flex items-center gap-1 rounded-lg border border-msk-ink/10 bg-msk-chalk px-2 py-1 text-xs font-medium text-msk-ink">
          {selected.label}
          {!disabled ? (
            <button
              type="button"
              className="rounded p-0.5 text-msk-ink/40 hover:text-msk-coral"
              aria-label="Retirer"
              onClick={() => onChange(null)}
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </span>
      ) : (
        <p className="text-xs text-msk-ink/40">{placeholder}</p>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={modalTitle ?? label}
        size="md"
      >
        <div className="space-y-3 p-4">
          {options.length > 8 ? (
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              autoFocus
            />
          ) : null}
          <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col rounded-xl border px-3 py-2.5 text-left transition",
                    value === o.value
                      ? "border-msk-blue bg-msk-blue/[0.06]"
                      : "border-transparent bg-white hover:border-msk-ink/10",
                  )}
                >
                  <span className="text-sm font-medium text-msk-ink">
                    {o.label}
                  </span>
                  {o.description ? (
                    <span className="text-xs text-msk-ink/45">
                      {o.description}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}

export function OptionPickerMulti({
  label,
  options,
  value,
  onChange,
  placeholder = "Choisir…",
  disabled,
  className,
  modalTitle,
}: {
  label: string;
  options: OptionPickerItem[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  modalTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selectedSet = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        o.value.toLowerCase().includes(needle),
    );
  }, [options, q]);

  function toggle(v: string) {
    if (selectedSet.has(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-msk-ink">{label}</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          {value.length === 0 ? placeholder : "Modifier"}
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => {
            const item = options.find((o) => o.value === v);
            if (!item) return null;
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-lg border border-msk-ink/10 bg-msk-chalk px-2 py-1 text-xs font-medium text-msk-ink"
              >
                {item.label}
                {!disabled ? (
                  <button
                    type="button"
                    className="rounded p-0.5 text-msk-ink/40 hover:text-msk-coral"
                    aria-label={`Retirer ${item.label}`}
                    onClick={() => onChange(value.filter((x) => x !== v))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-msk-ink/40">{placeholder}</p>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={modalTitle ?? label}
        description="Sélection multiple"
        size="md"
        footer={
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Terminer
          </Button>
        }
      >
        <div className="space-y-3 p-4">
          {options.length > 8 ? (
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              autoFocus
            />
          ) : null}
          <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
            {filtered.map((o) => {
              const active = selectedSet.has(o.value);
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={cn(
                      "flex w-full flex-col rounded-xl border px-3 py-2.5 text-left transition",
                      active
                        ? "border-msk-blue bg-msk-blue/[0.06]"
                        : "border-transparent bg-white hover:border-msk-ink/10",
                    )}
                  >
                    <span className="text-sm font-medium text-msk-ink">
                      {o.label}
                    </span>
                    {o.description ? (
                      <span className="text-xs text-msk-ink/45">
                        {o.description}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Modal>
    </div>
  );
}

/** Alias rétrocompat — préférer Single / Multi typés. */
export const OptionPickerModal = OptionPickerSingle;
