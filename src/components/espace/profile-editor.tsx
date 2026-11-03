"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requestProfileChangeAction } from "@/actions/rh-profile";
import { usePendingAction } from "@/hooks/use-pending-action";
import {
  PROFILE_REQUESTABLE_FIELDS,
  coerceProfileOptionValue,
  formatProfileDisplayValue,
  type ProfileFieldMeta,
} from "@/lib/rh/profile-fields";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormShell } from "@/components/ui/form-shell";
import { cn } from "@/lib/utils";

const GROUPS: Array<{ id: ProfileFieldMeta["group"]; label: string }> = [
  { id: "civil", label: "Identité" },
  { id: "contact", label: "Coordonnées" },
  { id: "address", label: "Adresse" },
  { id: "emergency", label: "Contact d’urgence" },
  { id: "bank", label: "Coordonnées bancaires" },
];

const DATE_KEYS = new Set(["birthDate", "idIssuedOn", "idExpiresOn"]);

const selectClassName =
  "h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3.5 text-sm text-msk-ink shadow-sm transition focus:border-msk-blue focus:outline-none focus:ring-2 focus:ring-msk-blue/20 disabled:opacity-50";

export function ProfileEditor({
  currentValues,
  pendingByField,
}: {
  currentValues: Record<string, string | null>;
  /** Valeurs proposées encore PENDING (affichage overlay). */
  pendingByField: Record<string, string>;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const hasOpenPending = Object.keys(pendingByField).length > 0;

  const initialDraft = useMemo(() => {
    const d: Record<string, string> = {};
    for (const f of PROFILE_REQUESTABLE_FIELDS) {
      const raw = currentValues[f.key] ?? "";
      d[f.key] = f.options ? coerceProfileOptionValue(f, raw) : raw;
    }
    return d;
  }, [currentValues]);

  function startEdit() {
    setDraft({ ...initialDraft });
    setEditing(true);
    setError(null);
    setOkMsg(null);
  }

  function cancel() {
    setEditing(false);
    setDraft({});
    setNote("");
    setError(null);
  }

  function submit() {
    setError(null);
    setOkMsg(null);
    const lines = PROFILE_REQUESTABLE_FIELDS.map((f) => {
      const newValue = (draft[f.key] ?? "").trim();
      const current = f.options
        ? coerceProfileOptionValue(f, currentValues[f.key])
        : (currentValues[f.key] ?? "");
      return { fieldKey: f.key, newValue, current };
    })
      .filter((l) => l.current !== l.newValue)
      .map(({ fieldKey, newValue }) => ({ fieldKey, newValue }));

    if (lines.length === 0) {
      setError("Aucun changement détecté");
      return;
    }

    const fd = new FormData();
    fd.set("note", note);
    fd.set("lines", JSON.stringify(lines));
    void run(async () => {
      try {
        const res = await requestProfileChangeAction(fd);
        if (!res.ok) {
          setError(res.error ?? "Échec");
          return;
        }
        setOkMsg("Demande envoyée — les RH valideront vos modifications.");
        setEditing(false);
        setNote("");
        router.refresh();
      } catch {
        setError("Réponse serveur inattendue — réessayez.");
      }
    });
  }

  return (
    <FormShell
      footer={
        editing ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={cancel}
            >
              Annuler
            </Button>
            <Button type="button" disabled={pending} onClick={submit}>
              {pending ? "Envoi…" : "Envoyer pour validation RH"}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-msk-ink/6 pb-5">
        <div>
          <h2 className="text-base font-semibold text-msk-ink">
            Informations personnelles
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-msk-ink/55">
            Vos données officielles. Pour les modifier, utilisez « Modifier »
            puis envoyez une demande aux RH.
          </p>
        </div>
        {!editing && !hasOpenPending ? (
          <Button type="button" size="sm" onClick={startEdit}>
            Modifier
          </Button>
        ) : null}
        {hasOpenPending && !editing ? (
          <span className="inline-flex items-center rounded-full bg-msk-blue/10 px-3 py-1 text-xs font-semibold text-msk-blue">
            Demande en attente de validation
          </span>
        ) : null}
      </div>

      {GROUPS.map((g) => {
        const fields = PROFILE_REQUESTABLE_FIELDS.filter((f) => f.group === g.id);
        return (
          <section key={g.id} className="mb-8 last:mb-0">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
              {g.label}
            </h3>
            <div
              className={cn(
                "grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3",
                !editing && "sm:gap-y-6",
              )}
            >
              {fields.map((f) => {
                const pendingVal = pendingByField[f.key];
                const official = currentValues[f.key] ?? "";
                const display = formatProfileDisplayValue(f, official);
                const pendingDisplay =
                  pendingVal != null
                    ? formatProfileDisplayValue(f, pendingVal)
                    : null;

                return (
                  <div key={f.key} className="min-w-0">
                    {editing ? (
                      <>
                        <FieldLabel htmlFor={`pf-${f.key}`}>{f.label}</FieldLabel>
                        {f.options ? (
                          <select
                            id={`pf-${f.key}`}
                            className={selectClassName}
                            value={draft[f.key] ?? ""}
                            disabled={pending}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                [f.key]: e.target.value,
                              }))
                            }
                          >
                            <option value="">— Choisir —</option>
                            {f.options.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id={`pf-${f.key}`}
                            type={DATE_KEYS.has(f.key) ? "date" : "text"}
                            value={draft[f.key] ?? ""}
                            disabled={pending}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                [f.key]: e.target.value,
                              }))
                            }
                          />
                        )}
                      </>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-msk-ink/45">
                          {f.label}
                        </p>
                        <p className="text-sm font-medium text-msk-ink">
                          {display}
                        </p>
                        {pendingDisplay != null ? (
                          <p className="text-xs font-medium text-msk-blue">
                            Proposition : {pendingDisplay || "(vide)"}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {editing ? (
        <div className="mt-6">
          <FieldLabel htmlFor="profile-note">Commentaire (optionnel)</FieldLabel>
          <Textarea
            id="profile-note"
            value={note}
            disabled={pending}
            rows={2}
            placeholder="Précision utile pour les RH"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-msk-coral" role="alert">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="mt-4 text-sm text-msk-blue" role="status">
          {okMsg}
        </p>
      ) : null}
    </FormShell>
  );
}
