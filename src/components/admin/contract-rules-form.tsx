"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateContractTypeRuleAction } from "@/actions/contract-rules";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";
import { CONTRACT_TYPE_LABEL } from "@/lib/rh/labels";
import type { RhContractType } from "@prisma/client";

export type RuleRow = {
  contractType: RhContractType;
  includeInPayroll: boolean;
  applyInpsRates: boolean;
  accruePaidLeave: boolean;
  active: boolean;
};

function Toggle({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 text-sm text-msk-ink"
    >
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-msk-ink/20 text-msk-blue focus:ring-msk-blue"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function RuleCard({ initial }: { initial: RuleRow }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [row, setRow] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setMsg(null);
    setError(null);
    void run(async () => {
      const fd = new FormData();
      fd.set("contractType", row.contractType);
      fd.set("includeInPayroll", String(row.includeInPayroll));
      fd.set("applyInpsRates", String(row.applyInpsRates));
      fd.set("accruePaidLeave", String(row.accruePaidLeave));
      fd.set("active", String(row.active));
      const res = await updateContractTypeRuleAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setMsg(res.message ?? "Enregistré");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-msk-ink/10 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-msk-ink">
          {CONTRACT_TYPE_LABEL[row.contractType]}
        </h3>
        <span className="font-mono text-xs text-msk-ink/40">
          {row.contractType}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle
          id={`${row.contractType}-active`}
          label="Règle active"
          checked={row.active}
          disabled={pending}
          onChange={(v) => setRow((r) => ({ ...r, active: v }))}
        />
        <Toggle
          id={`${row.contractType}-payroll`}
          label="Inclure dans la paie"
          checked={row.includeInPayroll}
          disabled={pending}
          onChange={(v) => setRow((r) => ({ ...r, includeInPayroll: v }))}
        />
        <Toggle
          id={`${row.contractType}-inps`}
          label="Appliquer cotisations INPS"
          checked={row.applyInpsRates}
          disabled={pending}
          onChange={(v) => setRow((r) => ({ ...r, applyInpsRates: v }))}
        />
        <Toggle
          id={`${row.contractType}-leave`}
          label="Congés payés (accrual)"
          checked={row.accruePaidLeave}
          disabled={pending}
          onChange={(v) => setRow((r) => ({ ...r, accruePaidLeave: v }))}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {msg ? <p className="text-xs text-msk-blue">{msg}</p> : null}
        {error ? <p className="text-xs text-msk-coral">{error}</p> : null}
      </div>
    </div>
  );
}

export function ContractRulesForm({ rules }: { rules: RuleRow[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rules.map((r) => (
        <RuleCard key={r.contractType} initial={r} />
      ))}
    </div>
  );
}
