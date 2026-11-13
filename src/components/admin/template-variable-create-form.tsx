"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTemplateVariableAction } from "@/actions/studio-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceCards, type ChoiceCardOption } from "@/components/ui/choice-cards";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field-label";
import { FormShell } from "@/components/ui/form-shell";
import { usePendingAction } from "@/hooks/use-pending-action";
import { failAction, reportActionSuccess } from "@/lib/toast/report";

type Category = "CLIENT" | "ENTREPRISE" | "DOCUMENT" | "COLLABORATEUR" | "DIVERS";

const CATEGORY_OPTIONS: ChoiceCardOption<Category>[] = [
  { value: "CLIENT", label: "Client", description: "Nom, adresse, contact…" },
  { value: "ENTREPRISE", label: "Entreprise", description: "MSK (identité agence)" },
  { value: "DOCUMENT", label: "Document", description: "Numéro, date, objet…" },
  { value: "COLLABORATEUR", label: "Collaborateur", description: "Nom, fonction…" },
  { value: "DIVERS", label: "Divers", description: "Ni l’un ni l’autre" },
];

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

/**
 * Formulaire simple (une seule intention) — mono-écran, règle `forms-stepper`.
 */
export function TemplateVariableCreateForm() {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [sampleValue, setSampleValue] = useState("");
  const [category, setCategory] = useState<Category>("DIVERS");
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    setError(null);
    if (!/^[a-z][a-z0-9_.]*$/i.test(slug)) {
      setError("Slug invalide (ex. client.nom)");
      return;
    }
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("label", label);
    fd.set("category", category);
    if (description.trim()) fd.set("description", description.trim());
    if (sampleValue.trim()) fd.set("sampleValue", sampleValue.trim());
    void run(async () => {
      const res = await createTemplateVariableAction(null, fd);
      if (failAction(res, setError, "Échec de la création")) return;
      reportActionSuccess(res.message ?? "Variable ajoutée");
      router.push("/administration/gabarits/variables");
    });
  }

  return (
    <FormShell
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/administration/gabarits/variables"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
          >
            Annuler
          </Link>
          <Button type="button" size="sm" disabled={pending} onClick={onSubmit}>
            {pending ? "Création…" : "Ajouter au catalogue"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="var-label" required>
            Libellé
          </FieldLabel>
          <Input
            id="var-label"
            value={label}
            disabled={pending}
            placeholder="Ex. Nom du client"
            onChange={(e) => {
              setLabel(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div>
          <FieldLabel htmlFor="var-slug" required>
            Slug {"{{slug}}"}
          </FieldLabel>
          <Input
            id="var-slug"
            value={slug}
            disabled={pending}
            placeholder="client.nom"
            className="font-mono text-sm"
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
          />
          <FieldHint>Unique — utilisé dans le contenu via {"{{"}{slug || "slug"}{"}}"}.</FieldHint>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel required>Catégorie</FieldLabel>
          <ChoiceCards
            name="category"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
            disabled={pending}
            columns={3}
          />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="var-sample">Valeur d’exemple (aperçu)</FieldLabel>
          <Input
            id="var-sample"
            value={sampleValue}
            disabled={pending}
            placeholder="Ex. ACME SARL"
            onChange={(e) => setSampleValue(e.target.value)}
          />
          <FieldHint>Affichée dans les aperçus/démos générés par le moteur.</FieldHint>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="var-desc">Description</FieldLabel>
          <Textarea
            id="var-desc"
            value={description}
            disabled={pending}
            rows={2}
            placeholder="À quoi correspond cette variable ?"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <FieldError>{error}</FieldError>
      </div>
    </FormShell>
  );
}
