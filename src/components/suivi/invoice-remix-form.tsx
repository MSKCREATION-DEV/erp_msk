"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  createSvInvoiceRemix,
  type SvInvoiceActionState,
} from "@/actions/suivi/invoices";
import { FormShell } from "@/components/ui/form-shell";
import { FormSteps } from "@/components/ui/form-steps";
import { FieldLabel } from "@/components/ui/field-label";
import { Button } from "@/components/ui/button";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { formatSvXof } from "@/lib/suivi/labels";

type ClientOpt = { id: string; name: string };
type InvoiceOpt = {
  id: string;
  number: string | null;
  clientId: string;
  object: string | null;
  lines: Array<{
    label: string;
    description: string | null;
    qty: number;
    unitPrice: number;
  }>;
};

type LineDraft = {
  label: string;
  description: string;
  qty: number;
  unitPrice: number;
};

const STEPS = [
  { id: "client", label: "Client", hint: "Qui facturer" },
  { id: "source", label: "Source", hint: "Historique" },
  { id: "lignes", label: "Lignes", hint: "À facturer" },
  { id: "recap", label: "Récap", hint: "Émettre" },
] as const;

export function SvInvoiceRemixForm({
  clients,
  invoices,
  initialClientId,
}: {
  clients: ClientOpt[];
  invoices: InvoiceOpt[];
  initialClientId?: string;
}) {
  const [step, setStep] = useState(initialClientId ? 1 : 0);
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [sourceId, setSourceId] = useState("");
  const [object, setObject] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [stepError, setStepError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState<
    SvInvoiceActionState,
    FormData
  >(createSvInvoiceRemix, null);
  useActionStateToast(state);

  const clientInvoices = useMemo(
    () => invoices.filter((i) => i.clientId === clientId),
    [invoices, clientId],
  );

  const totalHt = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const totalVat = Math.round((totalHt * 18) / 100);
  const totalTtc = totalHt + totalVat;

  function goNext() {
    setStepError(null);
    if (step === 0 && !clientId) {
      setStepError("Choisissez un client.");
      return;
    }
    if (step === 1) {
      const src = clientInvoices.find((i) => i.id === sourceId);
      if (src) {
        setLines(
          src.lines.map((l) => ({
            label: l.label,
            description: l.description ?? "",
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        );
        setObject(src.object ?? "");
      } else if (lines.length === 0) {
        setLines([{ label: "", description: "", qty: 1, unitPrice: 0 }]);
      }
    }
    if (step === 2) {
      if (lines.length === 0 || lines.some((l) => !l.label.trim())) {
        setStepError("Chaque ligne doit avoir un libellé.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <div className="space-y-4">
      <FormSteps
        steps={[...STEPS]}
        currentIndex={step}
        onGoTo={(i) => {
          setStepError(null);
          setStep(i);
        }}
      />
      {stepError ? (
        <p className="text-sm text-msk-coral">{stepError}</p>
      ) : null}
      {state && !state.ok ? (
        <p className="text-sm text-msk-coral">{state.error}</p>
      ) : null}

      {step < 3 ? (
        <FormShell
          footer={
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex gap-2">
                <Link
                  href="/suivi/factures"
                  className="inline-flex h-11 items-center rounded-lg border border-msk-ink/15 px-4 text-sm font-medium hover:bg-msk-chalk"
                >
                  Annuler
                </Link>
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep((s) => s - 1)}
                  >
                    Retour
                  </Button>
                ) : null}
              </div>
              <Button type="button" onClick={goNext}>
                Continuer
              </Button>
            </div>
          }
        >
          {step === 0 ? (
            <div>
              <FieldLabel required>Client</FieldLabel>
              <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-msk-ink/10">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClientId(c.id);
                      setSourceId("");
                      setLines([]);
                    }}
                    className={`flex w-full px-4 py-3 text-left text-sm hover:bg-msk-blue/4 ${
                      clientId === c.id
                        ? "bg-msk-blue/8 font-medium text-msk-blue"
                        : ""
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <FieldLabel>Facture source (optionnel)</FieldLabel>
              <p className="mt-1 text-xs text-msk-ink/50">
                Préremplit les lignes depuis l’historique. Vous pouvez aussi
                partir sans source.
              </p>
              <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-msk-ink/10">
                <button
                  type="button"
                  onClick={() => setSourceId("")}
                  className={`flex w-full px-4 py-3 text-left text-sm hover:bg-msk-blue/4 ${
                    !sourceId ? "bg-msk-blue/8 font-medium text-msk-blue" : ""
                  }`}
                >
                  Sans source — lignes vides
                </button>
                {clientInvoices.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSourceId(inv.id)}
                    className={`flex w-full flex-col px-4 py-3 text-left text-sm hover:bg-msk-blue/4 ${
                      sourceId === inv.id
                        ? "bg-msk-blue/8 font-medium text-msk-blue"
                        : ""
                    }`}
                  >
                    <span>{inv.number ?? "Sans n°"}</span>
                    <span className="text-xs text-msk-ink/50">
                      {inv.object ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div>
                <FieldLabel htmlFor="object">Objet</FieldLabel>
                <input
                  id="object"
                  value={object}
                  onChange={(e) => setObject(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                  placeholder="Objet de la facture"
                />
              </div>
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 rounded-lg border border-msk-ink/8 p-3 sm:grid-cols-12"
                >
                  <div className="sm:col-span-5">
                    <FieldLabel required>Libellé</FieldLabel>
                    <input
                      value={line.label}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = { ...line, label: e.target.value };
                        setLines(next);
                      }}
                      className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <FieldLabel>Description</FieldLabel>
                    <input
                      value={line.description}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = { ...line, description: e.target.value };
                        setLines(next);
                      }}
                      className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <FieldLabel>Qté</FieldLabel>
                    <input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = {
                          ...line,
                          qty: Number(e.target.value) || 1,
                        };
                        setLines(next);
                      }}
                      className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>PU</FieldLabel>
                    <input
                      type="number"
                      min={0}
                      value={line.unitPrice}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = {
                          ...line,
                          unitPrice: Number(e.target.value) || 0,
                        };
                        setLines(next);
                      }}
                      className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setLines(lines.filter((_, i) => i !== idx))
                      }
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setLines([
                    ...lines,
                    { label: "", description: "", qty: 1, unitPrice: 0 },
                  ])
                }
              >
                Ajouter une ligne
              </Button>
            </div>
          ) : null}
        </FormShell>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="remixedFromId" value={sourceId} />
          <input type="hidden" name="object" value={object} />
          <input type="hidden" name="vatRate" value="18" />
          <input type="hidden" name="linesJson" value={JSON.stringify(lines)} />
          <FormShell
            footer={
              <div className="flex flex-wrap justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(2)}
                  disabled={pending}
                >
                  Retour
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Émission…" : "Émettre la facture"}
                </Button>
              </div>
            }
          >
            <h3 className="text-sm font-semibold text-msk-ink">Récapitulatif</h3>
            <p className="mt-1 text-sm text-msk-ink/60">
              Client : {clients.find((c) => c.id === clientId)?.name}
            </p>
            <p className="text-sm text-msk-ink/60">
              Objet : {object || "—"} · {lines.length} ligne(s)
            </p>
            <dl className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-msk-chalk/80 p-3">
                <dt className="text-xs text-msk-ink/45">HT</dt>
                <dd className="font-semibold tabular-nums">
                  {formatSvXof(totalHt)}
                </dd>
              </div>
              <div className="rounded-lg bg-msk-chalk/80 p-3">
                <dt className="text-xs text-msk-ink/45">TVA 18 %</dt>
                <dd className="font-semibold tabular-nums">
                  {formatSvXof(totalVat)}
                </dd>
              </div>
              <div className="rounded-lg bg-msk-chalk/80 p-3">
                <dt className="text-xs text-msk-ink/45">TTC</dt>
                <dd className="font-semibold tabular-nums">
                  {formatSvXof(totalTtc)}
                </dd>
              </div>
            </dl>
          </FormShell>
        </form>
      )}
    </div>
  );
}
