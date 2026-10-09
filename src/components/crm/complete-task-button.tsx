"use client";

import { useRouter } from "next/navigation";
import { completeTaskAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

export function CompleteTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => {
        const fd = new FormData();
        fd.set("taskId", taskId);
        void run(async () => {
          await completeTaskAction(fd);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Fait"}
    </Button>
  );
}
