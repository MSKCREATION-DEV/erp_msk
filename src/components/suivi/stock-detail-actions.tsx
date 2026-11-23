"use client";

import { useRouter } from "next/navigation";
import type { SvCountry } from "@/generated/prisma/client";
import { Archive, PackagePlus, Pencil } from "lucide-react";
import { ActionLink } from "@/components/ui/action-link";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePendingAction } from "@/hooks/use-pending-action";
import { archiveSvStockItem } from "@/actions/suivi/stock";
import { withSvCountryQuery } from "@/lib/suivi/country";

export function SvStockDetailActions({
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
  const { run, pending } = usePendingAction();

  if (!canManage) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <ActionLink
        href={withSvCountryQuery("/suivi/stocks/mouvements/nouveau", country, {
          itemId,
        })}
        icon={PackagePlus}
      >
        Ajuster le stock
      </ActionLink>
      <ActionLink
        href={withSvCountryQuery(`/suivi/stocks/${itemId}/edit`, country)}
        icon={Pencil}
        variant="secondary"
      >
        Modifier
      </ActionLink>
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => {
          void confirm({
            title: "Archiver cet article ?",
            description:
              "Il disparaîtra de l’inventaire courant. L’historique des mouvements est conservé.",
            confirmLabel: "Archiver",
            tone: "danger",
            loadingLabel: "Archivage…",
            action: () =>
              run(async () => {
                const res = await archiveSvStockItem(itemId);
                if (!res.ok) throw new Error(res.error);
                router.push(withSvCountryQuery("/suivi/stocks", country));
                router.refresh();
              }),
          });
        }}
      >
        <Archive className="size-3.5" aria-hidden />
        {pending ? "Archivage…" : "Archiver"}
      </Button>
    </div>
  );
}
