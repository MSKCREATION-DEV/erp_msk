"use client";

import { useRouter } from "next/navigation";
import { toggleCatalogOfferAction } from "@/actions/catalogue";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

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
          await toggleCatalogOfferAction(fd);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : active ? "Désactiver" : "Activer"}
    </Button>
  );
}
