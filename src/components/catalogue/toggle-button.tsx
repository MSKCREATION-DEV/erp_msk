"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleCatalogOfferAction } from "@/actions/catalogue";
import { Button } from "@/components/ui/button";

export function CatalogueToggleButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("active", active ? "false" : "true");
        startTransition(async () => {
          await toggleCatalogOfferAction(fd);
          router.refresh();
        });
      }}
    >
      {active ? "Off" : "On"}
    </Button>
  );
}
