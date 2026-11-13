"use client";

import { useId, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldLabel } from "@/components/ui/field-label";

export function FileDropzone({
  name = "file",
  accept,
  required,
  disabled,
  label = "Fichier",
  hint,
}: {
  name?: string;
  accept: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
}) {
  const id = useId();
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <label
        htmlFor={id}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          const f = e.dataTransfer.files?.[0];
          if (!f) return;
          const input = document.getElementById(id) as HTMLInputElement | null;
          if (!input) return;
          const dt = new DataTransfer();
          dt.items.add(f);
          input.files = dt.files;
          setFileName(f.name);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition",
          dragging
            ? "border-msk-blue bg-msk-blue/4"
            : "border-msk-ink/15 bg-msk-chalk/40 hover:border-msk-blue/40",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <Upload className="size-5 text-msk-blue" aria-hidden />
        <span className="text-sm font-medium text-msk-ink">
          {fileName ?? "Glisser-déposer ou cliquer pour choisir"}
        </span>
        {hint ? (
          <span className="text-xs text-msk-ink/45">{hint}</span>
        ) : null}
        <input
          id={id}
          name={name}
          type="file"
          accept={accept}
          required={required}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
    </div>
  );
}
