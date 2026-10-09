"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { completeTaskAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";

export function CompleteTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("taskId", taskId);
        startTransition(async () => {
          await completeTaskAction(fd);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Fait"}
    </Button>
  );
}
