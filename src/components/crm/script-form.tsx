"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { upsertCrmScriptAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FieldHint, FieldLabel } from "@/components/ui/field-label";
import { Surface } from "@/components/ui/surface";
import { usePendingAction } from "@/hooks/use-pending-action";
import { SOURCE_LABELS } from "@/lib/crm/labels";
import { SCRIPT_VAR_KEYS } from "@/lib/crm/script-vars";
import type { CrmSource } from "@prisma/client";

const CHANNELS = (
  [
    "INSTAGRAM",
    "LINKEDIN",
    "WHATSAPP",
    "EMAIL",
    "TELEPHONE",
    "AUTRE",
  ] as const
).map((c) => ({ value: c as CrmSource, label: SOURCE_LABELS[c] }));

type Initial = {
  id?: string;
  code?: string;
  channel?: CrmSource;
  title?: string;
  body?: string;
  tips?: string;
  sortOrder?: string;
};

export function ScriptForm({ initial }: { initial?: Initial }) {
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<CrmSource>(
    initial?.channel ?? "INSTAGRAM",
  );
  const [body, setBody] = useState(initial?.body ?? "");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertVar(key: string) {
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    if (!el) {
      setBody((b) => `${b}${token}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("channel", channel);
    fd.set("body", body);
    void run(async () => {
      const res = await upsertCrmScriptAction(fd);
      // Succès → redirect() dans l’action (exception de contrôle).
      if (res && !res.ok) setError(res.error ?? "Échec");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full"
      aria-busy={pending || undefined}
    >
      <Surface className="w-full space-y-6 p-5 sm:p-6">
        {initial?.id ? (
          <input type="hidden" name="id" value={initial.id} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel htmlFor="code" required>
              Code unique
            </FieldLabel>
            {initial?.id ? (
              <>
                <Input
                  id="code"
                  defaultValue={initial.code}
                  disabled
                  className="opacity-70"
                />
                <input type="hidden" name="code" value={initial.code} />
                <FieldHint>Identifiant technique (non modifiable).</FieldHint>
              </>
            ) : (
              <>
                <Input
                  id="code"
                  name="code"
                  required
                  placeholder="ex. ig_premier_contact"
                  disabled={pending}
                  pattern="[a-z0-9_]+"
                />
                <FieldHint>a-z, 0-9 et _ uniquement.</FieldHint>
              </>
            )}
          </div>
          <div>
            <FieldLabel htmlFor="title" required>
              Titre
            </FieldLabel>
            <Input
              id="title"
              name="title"
              required
              defaultValue={initial?.title}
              disabled={pending}
              placeholder="ex. Premier contact Instagram"
            />
          </div>
          <div>
            <FieldLabel htmlFor="sortOrder">Ordre d’affichage</FieldLabel>
            <Input
              id="sortOrder"
              name="sortOrder"
              inputMode="numeric"
              defaultValue={initial?.sortOrder ?? "100"}
              disabled={pending}
              placeholder="10"
            />
          </div>
        </div>

        <div>
          <FieldLabel required>Canal</FieldLabel>
          <ChoiceCards
            name="channel"
            className="mt-2"
            columns={3}
            disabled={pending}
            value={channel}
            onChange={setChannel}
            options={CHANNELS}
          />
        </div>

        <div>
          <FieldLabel htmlFor="body" required>
            Corps du script
          </FieldLabel>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SCRIPT_VAR_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                disabled={pending}
                onClick={() => insertVar(k)}
                className="rounded-md border border-msk-ink/10 bg-msk-chalk/80 px-2 py-0.5 font-mono text-[11px] text-msk-blue hover:border-msk-blue/40 hover:bg-white disabled:opacity-50"
              >
                {`{{${k}}}`}
              </button>
            ))}
          </div>
          <textarea
            ref={bodyRef}
            id="body"
            name="body"
            required
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={pending}
            placeholder="Bonjour {{prenom}}…"
            className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 font-mono text-sm leading-relaxed focus:border-msk-blue focus:outline-none focus:ring-2 focus:ring-msk-blue/20"
          />
          <FieldHint>
            Cliquez une variable pour l’insérer à la position du curseur.
          </FieldHint>
        </div>

        <div>
          <FieldLabel htmlFor="tips">Conseils / horaires</FieldLabel>
          <textarea
            id="tips"
            name="tips"
            rows={2}
            defaultValue={initial?.tips}
            disabled={pending}
            placeholder="ex. Envoyer le matin entre 8h et 10h."
            className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm focus:border-msk-blue focus:outline-none focus:ring-2 focus:ring-msk-blue/20"
          />
        </div>

        {error ? (
          <p className="text-sm font-medium text-msk-coral" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-msk-ink/[0.06] pt-4">
          <Link
            prefetch={false}
            href="/crm/scripts"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink transition hover:bg-msk-chalk aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-disabled={pending || undefined}
            tabIndex={pending ? -1 : undefined}
          >
            Annuler
          </Link>
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </Surface>
    </form>
  );
}
