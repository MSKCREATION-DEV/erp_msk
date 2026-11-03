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

const GROUPS: Array<{ id: ProfileFieldMeta["group"]; label: string }> = [
  { id: "civil", label: "Identité" },
  { id: "contact", label: "Coordonnées" },
  { id: "address", label: "Adresse" },
  { id: "emergency", label: "Contact d’urgence" },
  { id: "bank", label: "Coordonnées bancaires" },
];

const DATE_KEYS = new Set(["birthDate", "idIssuedOn", "idExpiresOn"]);

export function ProfileChangeForm({
  currentValues,
}: {
  currentValues: Record<string, string | null>;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [fieldKey, setFieldKey] = useState(PROFILE_REQUESTABLE_FIELDS[0]!.key);
  const [newValue, setNewValue] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const meta = useMemo(
    () => PROFILE_REQUESTABLE_FIELDS.find((f) => f.key === fieldKey),
    [fieldKey],
  );

  const current = currentValues[fieldKey] ?? "";

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOkMsg(null);
        void run(async () => {
          const fd = new FormData();
          fd.set("note", note);
          fd.set(
            "lines",
            JSON.stringify([{ fieldKey, newValue }]),
          );
          const res = await requestProfileChangeAction(fd);
          if (!res.ok) {
            setError(res.error ?? "Échec de la demande");
            return;
          }
          setOkMsg("Demande envoyée — en attente de validation RH.");
          setNewValue("");
          setNote("");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="profile-field" required>
            Information à modifier
          </FieldLabel>
          <select
            id="profile-field"
            className="h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm text-msk-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40"
            value={fieldKey}
            disabled={pending}
            onChange={(e) => {
              setFieldKey(e.target.value);
              setNewValue("");
            }}
          >
            {GROUPS.map((g) => (
              <optgroup key={g.id} label={g.label}>
                {PROFILE_REQUESTABLE_FIELDS.filter((f) => f.group === g.id).map(
                  (f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ),
                )}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Valeur actuelle</FieldLabel>
          <Input
            value={current || "—"}
            readOnly
            disabled
            className="bg-msk-chalk/60"
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="profile-new" required>
          Nouvelle valeur
        </FieldLabel>
        <Input
          id="profile-new"
          value={newValue}
          disabled={pending}
          type={DATE_KEYS.has(fieldKey) ? "date" : "text"}
          placeholder={
            DATE_KEYS.has(fieldKey)
              ? "AAAA-MM-JJ"
              : meta?.sensitive
                ? "Nouvelle valeur (sera masquée après enregistrement)"
                : "Ex. nouvelle adresse, téléphone…"
          }
          onChange={(e) => setNewValue(e.target.value)}
          required
        />
        {meta?.evidence === "required" ? (
          <p className="mt-1.5 text-xs text-msk-ink/45">
            Un justificatif pourra être demandé par les RH (pièce d’identité,
            RIB…).
          </p>
        ) : null}
      </div>

      <div>
        <FieldLabel htmlFor="profile-note">Commentaire (optionnel)</FieldLabel>
        <Textarea
          id="profile-note"
          value={note}
          disabled={pending}
          rows={3}
          placeholder="Précisez le contexte pour faciliter la validation RH"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error ? (
        <p className="text-sm text-msk-coral" role="alert">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="text-sm text-emerald-700" role="status">
          {okMsg}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !newValue.trim()}>
          {pending ? "Envoi…" : "Soumettre pour validation RH"}
        </Button>
      </div>
    </form>
  );
}
