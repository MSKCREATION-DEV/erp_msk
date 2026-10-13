"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { generateDemoPdfAction } from "@/actions/templates";
import { getDocumentDownloadUrlAction } from "@/actions/ged";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type DemoState = (ActionResult & { documentId?: string }) | null;

export function GenerateDemoButton({ templateId }: { templateId: string }) {
  const [state, action, pending] = useActionState<DemoState, FormData>(
    generateDemoPdfAction,
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (state?.ok && state.documentId) {
      void openPreview(state.documentId);
    }
  }, [state?.ok, state?.documentId]);

  async function openPreview(documentId: string) {
    setLoadingPreview(true);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewOpen(true);
    const res = await getDocumentDownloadUrlAction(documentId);
    setLoadingPreview(false);
    if (!res.ok || !res.url) {
      setPreviewError(res.error ?? "Aperçu impossible");
      return;
    }
    setPreviewUrl(res.url);
  }

  return (
    <>
      <form action={action} className="flex flex-col items-end gap-1">
        <input type="hidden" name="templateId" value={templateId} />
        <div className="flex flex-wrap justify-end gap-2">
          {state?.ok && state.documentId ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void openPreview(state.documentId!)}
            >
              <Eye className="h-3.5 w-3.5" />
              Voir PDF
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Génération…" : "PDF démo"}
          </Button>
        </div>
        {state?.error ? (
          <span className="text-xs text-msk-coral">{state.error}</span>
        ) : null}
        {state?.ok && state.message ? (
          <span className="max-w-60 text-right text-xs text-msk-blue">
            {state.message}
          </span>
        ) : null}
      </form>

      <Modal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Aperçu PDF démo"
        description="Contrôlez la mise en page avant utilisation."
        size="full"
        footer={
          previewUrl ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                window.open(previewUrl, "_blank", "noopener,noreferrer")
              }
            >
              Nouvel onglet
            </Button>
          ) : null
        }
      >
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          {loadingPreview ? (
            <p className="text-sm text-msk-ink/45">Chargement…</p>
          ) : null}
          {previewError ? (
            <p className="text-sm text-msk-coral">{previewError}</p>
          ) : null}
          {previewUrl ? (
            <iframe
              title="PDF démo"
              src={previewUrl}
              className="h-[75vh] w-full rounded-lg border border-msk-ink/[0.08] bg-white"
            />
          ) : null}
        </div>
      </Modal>
    </>
  );
}
