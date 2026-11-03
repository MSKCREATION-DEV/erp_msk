"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

/** Affiche l’avatar ; clic → modal plein format (sans déclencher un parent Link). */
export function AvatarPhotoViewer({
  avatarUrl,
  initials,
  alt = "Photo de profil",
  className,
  sizeClassName = "h-20 w-20 sm:h-24 sm:w-24",
}: {
  avatarUrl: string | null;
  initials: string;
  alt?: string;
  className?: string;
  sizeClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasPhoto = Boolean(avatarUrl);

  return (
    <>
      <button
        type="button"
        disabled={!hasPhoto}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (hasPhoto) setOpen(true);
        }}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-msk-ink text-xl font-semibold text-white shadow-sm ring-2 ring-white",
          sizeClassName,
          hasPhoto &&
            "cursor-zoom-in transition hover:ring-msk-blue/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/50",
          !hasPhoto && "cursor-default",
          className,
        )}
        aria-label={hasPhoto ? "Agrandir la photo" : "Pas de photo"}
      >
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl!} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={alt}
        description="Aperçu de votre photo"
        size="md"
      >
        <div className="flex items-center justify-center bg-msk-ink/95 p-6 sm:p-8">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={alt}
              className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-lg"
            />
          ) : null}
        </div>
      </Modal>
    </>
  );
}
