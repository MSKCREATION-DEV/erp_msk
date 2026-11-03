"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";
import type { VaultCategory, VaultDoc } from "@/lib/espace/documents-vault-types";
import {
  VAULT_CATEGORY_LABEL,
  countByCategory,
  filterVaultDocs,
} from "@/lib/espace/documents-vault-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import { ReglementSignButton } from "@/components/rh/reglement-sign-button";
import {
  GedPreviewModal,
  type PreviewDoc,
} from "@/components/ged/ged-preview-modal";
import { cn } from "@/lib/utils";

const CATS: VaultCategory[] = [
  "all",
  "a_signer",
  "pro",
  "paie",
  "internes",
  "justificatifs",
  "identite",
];

export function DocumentsVault({ docs }: { docs: VaultDoc[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const catParam = (sp.get("cat") as VaultCategory | null) ?? "all";
  const cat = CATS.includes(catParam) ? catParam : "all";
  const counts = useMemo(() => countByCategory(docs), [docs]);
  const filtered = useMemo(() => filterVaultDocs(docs, cat), [docs, cat]);

  const [preview, setPreview] = useState<PreviewDoc | null>(null);
  const [open, setOpen] = useState(false);

  const paieByYear = useMemo(() => {
    if (cat !== "paie") return null;
    const map = new Map<number, VaultDoc[]>();
    for (const d of filtered) {
      const y = d.year ?? d.createdAt.getFullYear();
      const list = map.get(y) ?? [];
      list.push(d);
      map.set(y, list);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [cat, filtered]);

  function setCat(c: VaultCategory) {
    const q = c === "all" ? "/espace/documents" : `/espace/documents?cat=${c}`;
    router.push(q);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              cat === c
                ? "bg-msk-blue text-white"
                : "border border-msk-ink/15 bg-white text-msk-ink/60 hover:border-msk-blue/30",
            )}
          >
            {VAULT_CATEGORY_LABEL[c]}
            <span className="ml-1.5 tabular-nums opacity-70">
              {counts[c]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucun document dans cette catégorie.
        </Surface>
      ) : paieByYear ? (
        <div className="space-y-6">
          {paieByYear.map(([year, yearDocs]) => (
            <div key={year}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
                {year}
              </h3>
              <DocTable
                docs={yearDocs}
                onPreview={(d) => {
                  setPreview(d);
                  setOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <DocTable
          docs={filtered}
          onPreview={(d) => {
            setPreview(d);
            setOpen(true);
          }}
        />
      )}

      <GedPreviewModal doc={preview} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function DocTable({
  docs,
  onPreview,
}: {
  docs: VaultDoc[];
  onPreview: (d: PreviewDoc) => void;
}) {
  return (
    <Surface className="overflow-x-auto p-0">
      <ul className="divide-y divide-msk-ink/6">
        {docs.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-msk-ink">{d.title}</p>
              <p className="truncate text-xs text-msk-ink/45">
                {d.originalName} ·{" "}
                {d.createdAt.toLocaleDateString("fr-FR")}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {d.needsSignature ? (
                  <Badge tone="coral">À signer</Badge>
                ) : null}
                {d.signed ? <Badge tone="success">Signé</Badge> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {d.needsSignature ? <ReglementSignButton /> : null}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  onPreview({
                    id: d.id,
                    originalName: d.originalName,
                    mime: d.mime,
                    size: d.size,
                  })
                }
              >
                <Eye className="h-4 w-4" aria-hidden />
                Aperçu
              </Button>
              <DocDownloadButton
                documentId={d.id}
                label="Télécharger"
                variant="primary"
                size="sm"
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-msk-ink/6 px-4 py-2 text-xs text-msk-ink/40">
        Besoin d’un autre document ?{" "}
        <Link prefetch={false} href="/ged" className="text-msk-blue hover:underline">
          Parcourir les fichiers
        </Link>
        .
      </p>
    </Surface>
  );
}
