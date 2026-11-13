"use client";

import { useRouter } from "next/navigation";
import { Eye, UserRound, Wallet } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";

/**
 * Actions ligne liste Factures clients Suivi — pattern Commercial (menu + navigation).
 */
export function SvInvoiceListActions({
  invoiceId,
  clientId,
  canPay,
  hasReste,
}: {
  invoiceId: string;
  clientId: string;
  canPay: boolean;
  hasReste: boolean;
}) {
  const router = useRouter();

  const items = [
    {
      id: "view",
      label: "Voir",
      icon: <Eye className="size-3.5" aria-hidden />,
      onSelect: () => router.push(`/suivi/factures/${invoiceId}`),
    },
    ...(canPay && hasReste
      ? [
          {
            id: "pay",
            label: "Enregistrer un paiement",
            icon: <Wallet className="size-3.5" aria-hidden />,
            onSelect: () => router.push(`/suivi/factures/${invoiceId}`),
          },
        ]
      : []),
    {
      id: "client",
      label: "Fiche client",
      icon: <UserRound className="size-3.5" aria-hidden />,
      onSelect: () => router.push(`/suivi/clients/${clientId}`),
    },
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
      <ActionMenu items={items} label="Actions facture" />
    </div>
  );
}
