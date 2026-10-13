"use client";

import { useState, type ReactNode } from "react";
import { Eye, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export type SignaturePreviewItem = {
  id: string;
  label: string;
  status: string;
  mime: string;
  previewUrl: string | null;
  subtitle?: string | null;
  createdAt?: string;
};

export function SignaturePreviewCard({
  item,
  actions,
  compact,
}: {
  item: SignaturePreviewItem;
  actions?: ReactNode;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const tone =
    item.status === "ACTIVE"
      ? "success"
      : item.status === "REVOKED"
        ? "coral"
        : "muted";

  return (
    <>
      <li
        className={cn(
          "flex gap-3 rounded-xl border border-msk-ink/[0.08] bg-white p-3",
          compact && "items-center",
        )}
      >
        <button
          type="button"
          onClick={() => item.previewUrl && setOpen(true)}
          disabled={!item.previewUrl}
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-msk-ink/[0.08] bg-msk-chalk/60",
            compact ? "h-14 w-24" : "h-20 w-36",
            item.previewUrl
              ? "cursor-pointer transition hover:ring-2 hover:ring-msk-blue/30"
              : "cursor-default",
          )}
          aria-label={item.previewUrl ? "Agrandir la signature" : undefined}
        >
          {item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL privée, pas next/image
            <img
              src={item.previewUrl}
              alt={item.label}
              className="max-h-full max-w-full object-contain p-1.5"
            />
          ) : (
            <ImageOff className="h-5 w-5 text-msk-ink/25" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-msk-ink">{item.label}</p>
            <Badge tone={tone}>{item.status}</Badge>
          </div>
          {item.subtitle ? (
            <p className="truncate text-xs text-msk-ink/45">{item.subtitle}</p>
          ) : null}
          {item.createdAt ? (
            <p className="text-[11px] text-msk-ink/35">
              {new Date(item.createdAt).toLocaleString("fr-FR")}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {item.previewUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(true)}
              >
                <Eye className="h-3.5 w-3.5" />
                Aperçu
              </Button>
            ) : null}
            {actions}
          </div>
        </div>
      </li>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={item.label}
        description="Aperçu signature"
        size="md"
      >
        <div className="flex min-h-50 items-center justify-center bg-[linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%,#eee),linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%,#eee)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-8">
          {item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.previewUrl}
              alt={item.label}
              className="max-h-[50vh] max-w-full object-contain drop-shadow-sm"
            />
          ) : null}
        </div>
      </Modal>
    </>
  );
}
