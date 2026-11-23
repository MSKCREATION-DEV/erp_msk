"use client";

import { useRouter } from "next/navigation";
import type { SvCountry } from "@/generated/prisma/client";
import { Archive, Eye, Pencil, PackagePlus } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { archiveSvStockItem } from "@/actions/suivi/stock";
import { withSvCountryQuery } from "@/lib/suivi/country";

export function SvStockListActions({
  itemId,
  canManage,
  country,
}: {
  itemId: string;
  canManage: boolean;
  country: SvCountry;
}) {
  const router = useRouter();
  const confirm = useConfirm();

  const items = [
    {
      id: "view",
      label: "Ouvrir la fiche",
      icon: <Eye className="size-3.5" aria-hidden />,
      onSelect: () =>
        router.push(withSvCountryQuery(`/suivi/stocks/${itemId}`, country)),
    },
    ...(canManage
      ? [
          {
            id: "move",
            label: "Ajuster le stock",
            icon: <PackagePlus className="size-3.5" aria-hidden />,
            onSelect: () =>
              router.push(
                withSvCountryQuery(
                  "/suivi/stocks/mouvements/nouveau",
                  country,
                  { itemId },
                ),
              ),
          },
          {
            id: "edit",
            label: "Modifier",
            icon: <Pencil className="size-3.5" aria-hidden />,
            onSelect: () =>
              router.push(
                withSvCountryQuery(`/suivi/stocks/${itemId}/edit`, country),
              ),
          },
          {
            id: "archive",
            label: "Archiver",
            icon: <Archive className="size-3.5" aria-hidden />,
            tone: "danger" as const,
            onSelect: () => {
              void confirm({
                title: "Archiver cet article ?",
                description:
                  "Il disparaîtra de l’inventaire courant. L’historique des mouvements est conservé.",
                confirmLabel: "Archiver",
                tone: "danger",
                action: async () => {
                  const res = await archiveSvStockItem(itemId);
                  if (!res.ok) throw new Error(res.error);
                  router.push(withSvCountryQuery("/suivi/stocks", country));
                  router.refresh();
                },
              });
            },
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
      <ActionMenu items={items} label="Actions article" />
    </div>
  );
}
