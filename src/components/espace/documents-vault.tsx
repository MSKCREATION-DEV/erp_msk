"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import type { VaultCategory, VaultDoc } from "@/lib/espace/documents-vault-types";
import {
  VAULT_CATEGORY_LABEL,
  countByCategory,
  filterVaultDocs,
} from "@/lib/espace/documents-vault-types";
import { formatSize } from "@/lib/ged/format";
import { mimeKind } from "@/lib/ged/view-prefs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { ReglementSignButton } from "@/components/rh/reglement-sign-button";
import {
  GedPreviewModal,
  type PreviewDoc,
} from "@/components/ged/ged-preview-modal";
import { getDocumentDownloadUrlAction } from "@/actions/ged";
import { getRhDocumentUrlAction } from "@/actions/rh";
import { usePendingAction } from "@/hooks/use-pending-action";
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

function docIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  if (mime.includes("sheet") || mime.includes("excel")) return FileSpreadsheet;
  return File;
}

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

  function openPreview(d: VaultDoc) {
    setPreview({
      id: d.id,
      originalName: d.title,
      mime: d.mime,
      size: d.size,
    });
    setOpen(true);
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
            <span className="ml-1.5 tabular-nums opacity-70">{counts[c]}</span>
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
              <DocVignettes docs={yearDocs} onPreview={openPreview} />
            </div>
          ))}
        </div>
      ) : (
        <DocVignettes docs={filtered} onPreview={openPreview} />
      )}

      <p className="text-xs text-msk-ink/40">
        Besoin d’un autre document ?{" "}
        <Link
          prefetch={false}
          href="/ged"
          className="text-msk-blue hover:underline"
        >
          Parcourir les fichiers
        </Link>
        .
      </p>

      <GedPreviewModal doc={preview} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function DocVignettes({
  docs,
  onPreview,
}: {
  docs: VaultDoc[];
  onPreview: (d: VaultDoc) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {docs.map((d) => (
        <VaultDocTile key={d.id} doc={d} onPreview={() => onPreview(d)} />
      ))}
    </ul>
  );
}

function VaultDocTile({
  doc,
  onPreview,
}: {
  doc: VaultDoc;
  onPreview: () => void;
}) {
  const Icon = docIcon(doc.mime);
  const { pending, run } = usePendingAction();
  const [dlError, setDlError] = useState<string | null>(null);

  function download() {
    setDlError(null);
    void run(async () => {
      let res = await getDocumentDownloadUrlAction(doc.id);
      if (!res.ok || !res.url) {
        const fd = new FormData();
        fd.set("documentId", doc.id);
        res = await getRhDocumentUrlAction(fd);
      }
      if (!res.ok || !res.url) {
        setDlError(res.error ?? "Téléchargement impossible");
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <li className="flex flex-col rounded-xl border border-msk-ink/6 bg-white p-4">
      <button
        type="button"
        onClick={onPreview}
        className="mb-3 flex h-20 w-full cursor-pointer items-center justify-center rounded-lg bg-msk-chalk/80 transition hover:bg-msk-blue/10"
        aria-label={`Aperçu — ${doc.title}`}
      >
        <Icon className="h-8 w-8 text-msk-ink/40" />
      </button>
      <button
        type="button"
        onClick={onPreview}
        className="line-clamp-2 cursor-pointer text-left text-sm font-medium text-msk-ink hover:text-msk-blue"
      >
        {doc.title}
      </button>
      <p className="mt-1 text-[11px] text-msk-ink/40">
        {mimeKind(doc.mime)} · {formatSize(doc.size)} ·{" "}
        {doc.createdAt.toLocaleDateString("fr-FR")}
      </p>
      {(doc.needsSignature || doc.signed) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {doc.needsSignature ? <Badge tone="coral">À signer</Badge> : null}
          {doc.signed ? <Badge tone="success">Signé</Badge> : null}
        </div>
      )}
      {doc.needsSignature ? (
        <div className="mt-2">
          <ReglementSignButton />
        </div>
      ) : null}
      <div className="mt-auto flex gap-1 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={onPreview}
          aria-label="Aperçu"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={pending}
          onClick={download}
          aria-label={pending ? "Téléchargement…" : "Télécharger"}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
      {dlError ? (
        <p className="mt-1 text-[11px] text-msk-coral" role="alert">
          {dlError}
        </p>
      ) : null}
    </li>
  );
}
