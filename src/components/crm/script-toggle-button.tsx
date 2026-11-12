"use client";

import { useRouter } from "next/navigation";
import { toggleCrmScriptAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";
import { failAction, reportActionSuccess } from "@/lib/toast/report";

export function ScriptToggleButton({
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
          const res = await toggleCrmScriptAction(fd);
          if (failAction(res, undefined, "Échec de la mise à jour")) return;
          reportActionSuccess(active ? "Script désactivé." : "Script activé.");
          router.refresh();
        });
      }}
    >
      {pending ? "…" : active ? "Désactiver" : "Activer"}
    </Button>
  );
}
