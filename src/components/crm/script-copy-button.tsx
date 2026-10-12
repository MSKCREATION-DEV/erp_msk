"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fillScriptTemplate } from "@/lib/crm/script-vars";

export function ScriptCopyButton({
  text,
  defaultCommercial,
}: {
  text: string;
  defaultCommercial?: string;
}) {
  const [ok, setOk] = useState(false);
  const [open, setOpen] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [offre, setOffre] = useState("");

  async function copyFilled() {
    const filled = fillScriptTemplate(text, {
      prenom: prenom || "…",
      entreprise: entreprise || "…",
      offre: offre || "…",
      commercial: defaultCommercial || "…",
    });
    await navigator.clipboard.writeText(filled);
    setOk(true);
    setOpen(false);
    setTimeout(() => setOk(false), 1500);
  }

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
      >
        {ok ? "Copié" : "Copier"}
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-msk-ink/10 bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-msk-ink/55">
            Variables (optionnel)
          </p>
          <div className="space-y-2">
            <div>
              <Label htmlFor="sc-prenom" className="text-xs">
                Prénom
              </Label>
              <Input
                id="sc-prenom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="sc-ent" className="text-xs">
                Entreprise
              </Label>
              <Input
                id="sc-ent"
                value={entreprise}
                onChange={(e) => setEntreprise(e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="sc-offre" className="text-xs">
                Offre
              </Label>
              <Input
                id="sc-offre"
                value={offre}
                onChange={(e) => setOffre(e.target.value)}
                className="h-8"
              />
            </div>
            <Button type="button" size="sm" className="w-full" onClick={copyFilled}>
              Copier le texte
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
