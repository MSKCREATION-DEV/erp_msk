"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requestProfileChangeAction } from "@/actions/rh-profile";
import { usePendingAction } from "@/hooks/use-pending-action";
import {
  PROFILE_REQUESTABLE_FIELDS,
  type ProfileFieldMeta,
} from "@/lib/rh/profile-fields";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormShell } from "@/components/ui/form-shell";

const GROUPS: Array<{ id: ProfileFieldMeta["group"]; label: string }> = [
  { id: "civil", label: "Identité" },
  { id: "contact", label: "Coordonnées" },
  { id: "address", label: "Adresse" },
  { id: "emergency", label: "Contact d’urgence" },
  { id: "bank", label: "Coordonnées bancaires" },
];

const DATE_KEYS = new Set(["birthDate", "idIssuedOn", "idExpiresOn"]);

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
      d[f.key] = currentValues[f.key] ?? "";
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
    const lines = PROFILE_REQUESTABLE_FIELDS.map((f) => ({
      fieldKey: f.key,
      newValue: (draft[f.key] ?? "").trim(),
    })).filter((l) => (currentValues[l.fieldKey] ?? "") !== l.newValue);

    if (lines.length === 0) {
      setError("Aucun changement détecté");
      return;
    }

    const fd = new FormData();
    fd.set("note", note);
    fd.set("lines", JSON.stringify(lines));
    void run(async () => {
      const res = await requestProfileChangeAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setOkMsg("Modifications enregistrées — en attente de validation RH.");
      setEditing(false);
      setNote("");
      router.refresh();
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
              {pending ? "Enregistrement…" : "Enregistrer pour validation RH"}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-msk-ink">
            Informations personnelles
          </h2>
          <p className="mt-1 text-sm text-msk-ink/55">
            Modifiez plusieurs champs puis enregistrez. Les données officielles
            ne changent qu&apos;après validation RH.
          </p>
        </div>
        {!editing && !hasOpenPending ? (
          <Button type="button" size="sm" onClick={startEdit}>
            Modifier
          </Button>
        ) : null}
        {hasOpenPending && !editing ? (
          <p className="text-sm font-medium text-msk-blue">
            Modifications en attente de validation
          </p>
        ) : null}
      </div>

      {GROUPS.map((g) => {
        const fields = PROFILE_REQUESTABLE_FIELDS.filter((f) => f.group === g.id);
        return (
          <section key={g.id} className="mb-8 last:mb-0">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
              {g.label}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((f) => {
                const pendingVal = pendingByField[f.key];
                const official = currentValues[f.key] ?? "";
                return (
                  <div key={f.key}>
                    <FieldLabel htmlFor={`pf-${f.key}`}>{f.label}</FieldLabel>
                    {editing ? (
                      <Input
                        id={`pf-${f.key}`}
                        type={DATE_KEYS.has(f.key) ? "date" : "text"}
                        value={draft[f.key] ?? ""}
                        disabled={pending}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                        }
                      />
                    ) : (
                      <div className="rounded-lg border border-msk-ink/10 bg-msk-chalk/40 px-3 py-2.5 text-sm text-msk-ink">
                        <span>{official || "—"}</span>
                        {pendingVal != null ? (
                          <p className="mt-1 text-xs font-medium text-msk-blue">
                            Proposition : {pendingVal || "(vide)"}
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
            placeholder="Contexte pour la validation RH"
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
