"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FilePlus2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ActionLink } from "@/components/ui/action-link";
import {
  ClientForm,
  type ClientFormInitial,
} from "@/components/commercial/client-form";
import { COM_DOCS_GATED } from "@/lib/commercial/gates";

/**
 * Actions fiche client — Modifier (modal) · Nouveau devis (si non gelé).
 */
export function ClientDetailActions({
  clientId,
  canEdit,
  canCreateQuote,
  initial,
}: {
  clientId: string;
  canEdit: boolean;
  canCreateQuote: boolean;
  initial: ClientFormInitial;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const showNewQuote = canCreateQuote && !COM_DOCS_GATED;

  if (!canEdit && !showNewQuote) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Modifier
          </Button>
        ) : null}
        {showNewQuote ? (
          <ActionLink
            href={`/commercial/devis/nouveau?clientId=${clientId}`}
            icon={FilePlus2}
          >
            Nouveau devis
          </ActionLink>
        ) : null}
      </div>

      {canEdit ? (
        <Modal
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Modifier le client"
          description="Mettez à jour les coordonnées commerciales."
          size="lg"
        >
          <div className="p-5">
            <ClientForm
              mode="edit"
              clientId={clientId}
              initial={initial}
              embedded
              onCancel={() => setEditOpen(false)}
              onSuccess={() => {
                setEditOpen(false);
                router.refresh();
              }}
            />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
