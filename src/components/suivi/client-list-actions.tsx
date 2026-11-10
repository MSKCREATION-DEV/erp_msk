"use client";

import { useRouter } from "next/navigation";
import { Eye, Pencil, Receipt, Wallet } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";

/**
 * Actions ligne liste clients Suivi — pattern Commercial (menu + navigation).
 */
export function SvClientListActions({
  clientId,
  canEdit,
  canInvoice,
  hasUnpaid,
}: {
  clientId: string;
  canEdit: boolean;
  canInvoice: boolean;
  hasUnpaid: boolean;
}) {
  const router = useRouter();
  const items = [
    {
      id: "view",
      label: "Ouvrir la fiche",
      icon: <Eye className="size-3.5" aria-hidden />,
      onSelect: () => router.push(`/suivi/clients/${clientId}`),
    },
    ...(canEdit
      ? [
          {
            id: "edit",
            label: "Modifier",
            icon: <Pencil className="size-3.5" aria-hidden />,
            onSelect: () => router.push(`/suivi/clients/${clientId}/edit`),
          },
        ]
      : []),
    ...(canInvoice
      ? [
          {
            id: "invoice",
            label: "Nouvelle facture",
            icon: <Receipt className="size-3.5" aria-hidden />,
            onSelect: () =>
              router.push(`/suivi/factures/nouveau?clientId=${clientId}`),
          },
        ]
      : []),
    ...(canInvoice && hasUnpaid
      ? [
          {
            id: "pay",
            label: "Enregistrer un paiement",
            icon: <Wallet className="size-3.5" aria-hidden />,
            onSelect: () =>
              router.push(`/suivi/clients/${clientId}?focus=paiements`),
          },
        ]
      : []),
  ];

  return (
    <div
      className="flex justify-end"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <ActionMenu items={items} label="Actions client" />
    </div>
  );
}
