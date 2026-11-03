"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  removeAvatarAction,
  uploadAvatarAction,
} from "@/actions/rh-avatar";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

export function AvatarUpload({
  avatarUrl,
  initials,
}: {
  avatarUrl: string | null;
  initials: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    const fd = new FormData();
    fd.set("avatar", file);
    void run(async () => {
      const res = await uploadAvatarAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        setPreview(null);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-msk-ink text-xl font-semibold text-white">
        {preview || avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview ?? avatarUrl!}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </div>
      <div className="space-y-2">
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
            {pending ? "Envoi…" : avatarUrl ? "Remplacer la photo" : "Ajouter une photo"}
          </Button>
          {avatarUrl ? (
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() => {
                setError(null);
                void run(async () => {
                  const res = await removeAvatarAction();
                  if (!res.ok) {
                    setError(res.error ?? "Échec");
                    return;
                  }
                  setPreview(null);
                  router.refresh();
                });
              }}
            >
              Retirer
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-msk-ink/45">
          JPEG, PNG ou WebP — max 2 Mo. Mise à jour immédiate (sans validation RH).
        </p>
        {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      </div>
    </div>
  );
}
