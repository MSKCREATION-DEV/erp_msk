"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, FileWarning, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { getDocumentDownloadUrlAction } from "@/actions/ged";
import { mimeKind } from "@/lib/ged/view-prefs";
import { formatSize } from "@/lib/ged/format";

export type PreviewDoc = {
  id: string;
  originalName: string;
  mime: string;
  size: number;
};

export function GedPreviewModal({
  doc,
  open,
  onOpenChange,
}: {
  doc: PreviewDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !doc) {
      setUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUrl(null);
    void (async () => {
      const res = await getDocumentDownloadUrlAction(doc.id);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok || !res.url) {
        setError(res.error ?? "Impossible d’ouvrir le document");
        return;
      }
      setUrl(res.url);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, doc]);

  const mime = doc?.mime ?? "";
  const canEmbedImage = mime.startsWith("image/");
  const canEmbedPdf = mime === "application/pdf";
  const canEmbedText =
    mime.startsWith("text/") || mime === "application/json";
  const canPreview = canEmbedImage || canEmbedPdf || canEmbedText;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={doc?.originalName ?? "Document"}
      description={
        doc
          ? `${mimeKind(doc.mime)} · ${formatSize(doc.size)}`
          : undefined
      }
      size="full"
      footer={
        <>
          {url ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4" />
                Nouvel onglet
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = doc?.originalName ?? "document";
                  a.target = "_blank";
                  a.rel = "noopener";
                  a.click();
                }}
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            </>
          ) : null}
        </>
      }
    >
      <div className="flex min-h-[50vh] items-center justify-center p-4 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-msk-ink/50">
            <Loader2 className="h-8 w-8 animate-spin text-msk-blue" />
            <p className="text-sm">Chargement de l’aperçu…</p>
          </div>
        ) : null}

        {error ? (
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <FileWarning className="h-10 w-10 text-msk-coral/70" />
            <p className="text-sm text-msk-coral">{error}</p>
          </div>
        ) : null}

        {!loading && !error && url && canEmbedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={doc?.originalName ?? ""}
            className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-sm"
          />
        ) : null}

        {!loading && !error && url && canEmbedPdf ? (
          <iframe
            title={doc?.originalName ?? "PDF"}
            src={url}
            className="h-[75vh] w-full rounded-lg border border-msk-ink/[0.08] bg-white"
          />
        ) : null}

        {!loading && !error && url && canEmbedText ? (
          <TextPreview url={url} />
        ) : null}

        {!loading && !error && url && !canPreview ? (
          <div className="flex max-w-md flex-col items-center gap-3 text-center">
            <FileWarning className="h-10 w-10 text-msk-ink/25" />
            <p className="font-medium text-msk-ink">
              Aperçu non disponible pour ce type
            </p>
            <p className="text-sm text-msk-ink/50">
              {mimeKind(mime)} — ouvrez dans un nouvel onglet ou téléchargez.
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(url);
        const body = await res.text();
        if (!cancelled) setText(body.slice(0, 200_000));
      } catch {
        if (!cancelled) setErr("Lecture impossible");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (err) return <p className="text-sm text-msk-coral">{err}</p>;
  if (text === null) {
    return <Loader2 className="h-6 w-6 animate-spin text-msk-blue" />;
  }
  return (
    <pre className="max-h-[75vh] w-full overflow-auto rounded-lg border border-msk-ink/[0.08] bg-white p-4 text-left text-xs leading-relaxed text-msk-ink whitespace-pre-wrap">
      {text}
    </pre>
  );
}
