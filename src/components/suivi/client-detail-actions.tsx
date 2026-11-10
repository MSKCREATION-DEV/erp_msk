import { Pencil, Receipt } from "lucide-react";
import { ActionLink } from "@/components/ui/action-link";

export function SvClientDetailActions({
  clientId,
  canEdit,
  canInvoice,
}: {
  clientId: string;
  canEdit: boolean;
  canInvoice: boolean;
}) {
  if (!canEdit && !canInvoice) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {canEdit ? (
        <ActionLink
          href={`/suivi/clients/${clientId}/edit`}
          icon={Pencil}
          variant="secondary"
        >
          Modifier
        </ActionLink>
      ) : null}
      {canInvoice ? (
        <ActionLink
          href={`/suivi/factures/nouveau?clientId=${clientId}`}
          icon={Receipt}
        >
          Nouvelle facture
        </ActionLink>
      ) : null}
    </div>
  );
}
