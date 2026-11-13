"use client";

import { useRouter } from "next/navigation";
import { Eye, Wallet } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";

/**
 * Actions ligne liste Charges Suivi — pattern Commercial (menu + navigation).
 */
export function SvExpenseListActions({
  expenseId,
  canPay,
  hasReste,
}: {
  expenseId: string;
  canPay: boolean;
  hasReste: boolean;
}) {
  const router = useRouter();

  const items = [
    {
      id: "view",
      label: "Voir",
      icon: <Eye className="size-3.5" aria-hidden />,
      onSelect: () => router.push(`/suivi/charges/${expenseId}`),
    },
    ...(canPay && hasReste
      ? [
          {
            id: "pay",
            label: "Enregistrer un paiement",
            icon: <Wallet className="size-3.5" aria-hidden />,
            onSelect: () => router.push(`/suivi/charges/${expenseId}`),
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
      <ActionMenu items={items} label="Actions charge" />
    </div>
  );
}
