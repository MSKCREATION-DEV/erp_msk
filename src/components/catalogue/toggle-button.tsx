"use client";

import { useRouter } from "next/navigation";
import { toggleCatalogOfferAction } from "@/actions/catalogue";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";
import { failAction, reportActionSuccess } from "@/lib/toast/report";

export function CatalogueToggleButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();

  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "danger" : "secondary"}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("active", active ? "false" : "true");
        void run(async () => {
          const res = await toggleCatalogOfferAction(fd);
          if (failAction(res, undefined, "Échec de la mise à jour")) return;
          reportActionSuccess(active ? "Offre désactivée." : "Offre activée.");
          router.refresh();
        });
      }}
    >
      {pending ? "…" : active ? "Désactiver" : "Activer"}
    </Button>
  );
}
