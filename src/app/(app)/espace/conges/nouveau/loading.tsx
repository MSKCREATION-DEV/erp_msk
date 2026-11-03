import { FormShell } from "@/components/ui/form-shell";
import { PageShell } from "@/components/ui/page-shell";

export default function Loading() {
  return (
    <PageShell>
      <div className="h-10 w-64 animate-pulse rounded bg-msk-ink/6" />
      <FormShell>
        <div className="h-40 animate-pulse rounded bg-msk-ink/4" />
      </FormShell>
    </PageShell>
  );
}
