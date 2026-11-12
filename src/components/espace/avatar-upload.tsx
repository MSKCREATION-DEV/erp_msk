"use client";

import { failAction, reportActionSuccess } from "@/lib/toast/report";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import {
  removeAvatarAction,
  uploadAvatarAction,
} from "@/actions/rh-avatar";
import { compressAvatarImage } from "@/lib/espace/compress-image";
import { AvatarPhotoViewer } from "@/components/espace/avatar-photo-viewer";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

function friendlyUploadError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/413|too large|body.*limit|unexpected response/i.test(msg)) {
    return "Fichier trop volumineux pour le serveur. Réessayez — la photo est compressée automatiquement.";
  }
  if (msg) return msg;
  return "Échec de l’envoi";
}

export function AvatarUpload({
  avatarUrl,
  initials,
  size = "lg",
}: {
  avatarUrl: string | null;
  initials: string;
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "compress" | "upload">("idle");

  const box = size === "lg" ? "h-28 w-28 sm:h-32 sm:w-32" : "h-20 w-20";
  const displayUrl = preview ?? avatarUrl;

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setOkMsg(null);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    void run(async () => {
      try {
        setPhase("compress");
        const compressed = await compressAvatarImage(file);
        setPhase("upload");
        const fd = new FormData();
        fd.set(
          "avatar",
          new File([compressed.blob], compressed.fileName, {
            type: compressed.mime,
          }),
        );
        const res = await uploadAvatarAction(fd);
        if (failAction(res, setError, "Échec")) {
          setPreview(null);
          return;
        }
        reportActionSuccess("Photo mise à jour.");
        setOkMsg(res.message ?? "Photo mise à jour");
        router.refresh();
      } catch (e) {
        setError(friendlyUploadError(e));
        setPreview(null);
      } finally {
        setPhase("idle");
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  const label =
    phase === "compress"
      ? "Compression…"
      : phase === "upload" || pending
        ? "Envoi…"
        : avatarUrl
          ? "Remplacer"
          : "Ajouter une photo";

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
      <div className="relative">
        <AvatarPhotoViewer
          avatarUrl={displayUrl}
          initials={initials}
          sizeClassName={box}
          className={pending ? "opacity-70" : undefined}
        />
        {pending ? (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-msk-ink/50"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-msk-blue text-white shadow-md ring-2 ring-white transition hover:bg-msk-blue/90 disabled:opacity-50"
          aria-label={label}
        >
          <Camera className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="min-w-0 space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={pending}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {label}
              </>
            ) : (
              label
            )}
          </Button>
          {avatarUrl ? (
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() => {
                setError(null);
                setOkMsg(null);
                void run(async () => {
                  try {
                    setPhase("upload");
                    const res = await removeAvatarAction();
                    if (failAction(res, setError, "Échec")) return;
                    reportActionSuccess("Enregistré.");
                    setPreview(null);
                    setOkMsg("Photo retirée");
                    router.refresh();
                  } catch (e) {
                    setError(friendlyUploadError(e));
                  } finally {
                    setPhase("idle");
                  }
                });
              }}
            >
              {pending ? "…" : "Retirer"}
            </Button>
          ) : null}
        </div>
        <p className="max-w-xs text-xs text-msk-ink/45">
          Cliquez la photo pour l’agrandir. JPEG, PNG ou WebP — compression
          automatique. Mise à jour immédiate.
        </p>
        {error ? (
          <p className="text-sm font-medium text-msk-coral" role="alert">
            {error}
          </p>
        ) : null}
        {okMsg && !error ? (
          <p className="text-sm font-medium text-msk-blue" role="status">
            {okMsg}
          </p>
        ) : null}
      </div>
    </div>
  );
}
