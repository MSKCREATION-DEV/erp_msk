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
import { DocDownloadButton } from "@/components/rh/doc-download-button";

export type EmployeeDocState = {
  attestationId: string | null;
  attestationAt: Date | string | null;
  reglementId: string | null;
  reglementAt: Date | string | null;
  soldeId: string | null;
  soldeAt: Date | string | null;
  fichePaieId: string | null;
  fichePaieAt: Date | string | null;
  reglementSigned: boolean;
};

function formatWhen(d: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR");
}

function DocRow({
  title,
  hint,
  documentId,
  generatedAt,
  generateLabel,
  onGenerate,
  pending,
  generateDisabled,
}: {
  title: string;
  hint?: string;
  documentId: string | null;
  generatedAt: Date | string | null;
  generateLabel: string;
  onGenerate: () => void;
  pending: boolean;
  generateDisabled?: boolean;
}) {
  const when = formatWhen(generatedAt);
  return (
    <div className="flex flex-col gap-2 border-b border-msk-ink/5 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-msk-ink">{title}</p>
        {documentId && when ? (
          <p className="text-xs text-msk-ink/45">Généré le {when}</p>
        ) : hint ? (
          <p className="text-xs text-msk-ink/45">{hint}</p>
        ) : (
          <p className="text-xs text-msk-ink/45">Pas encore généré</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {documentId ? (
          <>
            <DocDownloadButton
              documentId={documentId}
              label="Voir / Télécharger"
              variant="primary"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || generateDisabled}
              onClick={onGenerate}
            >
              {pending ? "…" : "Regénérer"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending || generateDisabled}
            onClick={onGenerate}
          >
            {pending ? "Génération…" : generateLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Actions PDF RH — états Voir/Télécharger si déjà en GED. */
export function EmployeeDocsActions({
  employeeId,
  docs,
}: {
  employeeId: string;
  docs: EmployeeDocState;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("85000");
  const [paymentRef, setPaymentRef] = useState("");
  const [local, setLocal] = useState(docs);

  function act(
    label: string,
    field: keyof Pick<
      EmployeeDocState,
      "attestationId" | "reglementId" | "fichePaieId" | "soldeId"
    >,
    fn: () => Promise<{
      ok: boolean;
      error?: string;
      message?: string;
      documentId?: string;
    }>,
  ) {
    setMsg(null);
    setError(null);
    void run(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      if (res.documentId) {
        setLocal((prev) => ({ ...prev, [field]: res.documentId! }));
      }
      setMsg(res.message ?? `${label} — utilisez Voir / Télécharger`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <DocRow
        title="Attestation"
        documentId={local.attestationId}
        generatedAt={docs.attestationAt}
        generateLabel="Générer l’attestation"
        pending={pending}
        onGenerate={() =>
          act("Attestation", "attestationId", async () => {
            const fd = new FormData();
            fd.set("employeeId", employeeId);
            return generateAttestationPdfAction(fd);
          })
        }
      />
      <DocRow
        title="Règlement intérieur (accusé)"
        hint={
          docs.reglementSigned
            ? "Règlement signé sur Mon espace — PDF d’accusé optionnel"
            : "Collaborateur n’a pas encore signé"
        }
        documentId={local.reglementId}
        generatedAt={docs.reglementAt}
        generateLabel="Générer l’accusé PDF"
        pending={pending}
        onGenerate={() =>
          act("Règlement", "reglementId", async () => {
            const fd = new FormData();
            fd.set("employeeId", employeeId);
            return generateReglementPdfAction(fd);
          })
        }
      />
      <DocRow
        title="Fiche de paie"
        hint="Indicatif — module Paie finalisera les cotisations"
        documentId={local.fichePaieId}
        generatedAt={docs.fichePaieAt}
        generateLabel="Générer la fiche"
        pending={pending}
        onGenerate={() =>
          act("Fiche paie", "fichePaieId", async () => {
            const fd = new FormData();
            fd.set("employeeId", employeeId);
            return generateFichePaiePdfAction(fd);
          })
        }
      />

      <div className="space-y-3 border-t border-msk-ink/10 pt-4">
        <p className="text-sm font-medium text-msk-ink">Solde de tout compte</p>
        {local.soldeId ? (
          <div className="flex flex-wrap items-center gap-2">
            <DocDownloadButton
              documentId={local.soldeId}
              label="Voir / Télécharger"
              variant="primary"
            />
            <span className="text-xs text-msk-ink/45">
              Généré le {formatWhen(docs.soldeAt)}
            </span>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="solde-amount">Montant (XOF)</Label>
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
            variant={local.soldeId ? "ghost" : "secondary"}
            size="sm"
            disabled={pending}
            onClick={() =>
              act("Solde", "soldeId", async () => {
                const fd = new FormData();
                fd.set("employeeId", employeeId);
                fd.set("amountXof", amount);
                if (paymentRef.trim()) fd.set("paymentRef", paymentRef.trim());
                return generateSoldePdfAction(fd);
              })
            }
          >
            {pending
              ? "…"
              : local.soldeId
                ? "Regénérer le solde"
                : "Générer le solde"}
          </Button>
        </div>
      </div>

      {msg ? <p className="pt-2 text-sm text-msk-blue">{msg}</p> : null}
      {error ? <p className="pt-2 text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
