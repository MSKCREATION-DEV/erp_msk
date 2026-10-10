"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { openPayrollPeriodAction } from "@/actions/paie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

export function OpenPeriodForm() {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        void run(async () => {
          const fd = new FormData();
          fd.set("year", year);
          fd.set("month", month);
          const res = await openPayrollPeriodAction(fd);
          if (!res.ok) {
            setError(res.error ?? "Échec");
            if (res.periodId) {
              router.push(`/rh/paie/${res.periodId}`);
            }
            return;
          }
          router.push(`/rh/paie/${res.periodId}`);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="year">Année</Label>
          <Input
            id="year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={pending}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="month">Mois (1–12)</Label>
          <Input
            id="month"
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={pending}
            required
          />
        </div>
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Ouverture…" : "Ouvrir la période"}
      </Button>
    </form>
  );
}
