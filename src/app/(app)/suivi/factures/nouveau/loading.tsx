import { PageShell } from "@/components/ui/page-shell";

export default function Loading() {
  return (
    <PageShell>
      <div className="h-8 w-64 animate-pulse rounded bg-msk-ink/6" />
      <div className="mt-4 h-64 animate-pulse rounded-xl bg-msk-ink/4" />
    </PageShell>
  );
}
