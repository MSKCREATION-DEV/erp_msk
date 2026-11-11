"use client";

import { useRouter } from "next/navigation";
import { Archive, PackagePlus, Pencil } from "lucide-react";
import { ActionLink } from "@/components/ui/action-link";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePendingAction } from "@/hooks/use-pending-action";
import { archiveSvStockItem } from "@/actions/suivi/stock";

export function SvStockDetailActions({
  itemId,
  canManage,
}: {
  itemId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = usePendingAction();

  if (!canManage) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <ActionLink
        href={`/suivi/stocks/mouvements/nouveau?itemId=${itemId}`}
        icon={PackagePlus}
      >
        Ajuster le stock
      </ActionLink>
      <ActionLink
        href={`/suivi/stocks/${itemId}/edit`}
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
                router.push("/suivi/stocks");
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
