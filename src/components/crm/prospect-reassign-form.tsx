"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRoundPen } from "lucide-react";
import { reassignProspectAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FieldError, FieldLabel } from "@/components/ui/field-label";
import { usePendingAction } from "@/hooks/use-pending-action";

type OwnerOpt = {
  id: string;
  firstName: string;
  lastName: string;
};

/**
 * LOT-E — changer le suivi (crm.reassign).
 */
export function ProspectReassignForm({
  opportunityId,
  currentOwnerId,
  candidates,
}: {
  opportunityId: string;
  currentOwnerId: string;
  candidates: OwnerOpt[];
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState(
    candidates.find((c) => c.id !== currentOwnerId)?.id ??
      candidates[0]?.id ??
      "",
  );
  const [error, setError] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!ownerId || ownerId === currentOwnerId) {
      setError("Choisissez un autre commercial");
      return;
    }
    const fd = new FormData();
    fd.set("opportunityId", opportunityId);
    fd.set("newOwnerId", ownerId);
    void run(async () => {
      const res = await reassignProspectAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec de la réaffectation");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <UserRoundPen className="h-4 w-4" aria-hidden />
        Changer le suivi
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Changer le suivi"
        description="Confie ce dossier à un autre commercial. Lecture partagée pour toute l’équipe ; écriture réservée à l’affecté."
        size="md"
      >
        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <div>
            <FieldLabel htmlFor="newOwnerId" required>
              Nouveau suivi
            </FieldLabel>
            <select
              id="newOwnerId"
              name="newOwnerId"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              disabled={pending}
              className="mt-1.5 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm text-msk-ink outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/20 disabled:opacity-60"
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id} disabled={c.id === currentOwnerId}>
                  {c.firstName} {c.lastName}
                  {c.id === currentOwnerId ? " (actuel)" : ""}
                </option>
              ))}
            </select>
          </div>
          {error ? <FieldError>{error}</FieldError> : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-msk-ink/8 pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={pending || !ownerId}>
              {pending ? "Affectation…" : "Confirmer"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
