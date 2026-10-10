"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  generateAttestationPdfAction,
  generateFichePaiePdfAction,
  generateReglementPdfAction,
  generateSoldePdfAction,
} from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Actions PDF RH sur fiche collaborateur (GED collab). */
export function EmployeeDocsActions({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("85000");
  const [paymentRef, setPaymentRef] = useState("");

  function act(
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string; message?: string }>,
  ) {
    setMsg(null);
    setError(null);
    void run(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setMsg(res.message ?? label);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            act("Attestation", async () => {
              const fd = new FormData();
              fd.set("employeeId", employeeId);
              return generateAttestationPdfAction(fd);
            })
          }
        >
          {pending ? "…" : "Attestation"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            act("Règlement", async () => {
              const fd = new FormData();
              fd.set("employeeId", employeeId);
              return generateReglementPdfAction(fd);
            })
          }
        >
          {pending ? "…" : "Règlement intérieur"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            act("Fiche paie", async () => {
              const fd = new FormData();
              fd.set("employeeId", employeeId);
              return generateFichePaiePdfAction(fd);
            })
          }
        >
          {pending ? "…" : "Fiche de paie"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="solde-amount">Solde tout compte (XOF)</Label>
          <Input
            id="solde-amount"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="solde-ref">Réf. paiement (optionnel)</Label>
          <Input
            id="solde-ref"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="Chèque N°…"
            disabled={pending}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            act("Solde", async () => {
              const fd = new FormData();
              fd.set("employeeId", employeeId);
              fd.set("amountXof", amount);
              if (paymentRef.trim()) fd.set("paymentRef", paymentRef.trim());
              return generateSoldePdfAction(fd);
            })
          }
        >
          {pending ? "…" : "Solde de tout compte"}
        </Button>
      </div>

      {msg ? <p className="text-sm text-msk-blue">{msg}</p> : null}
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
