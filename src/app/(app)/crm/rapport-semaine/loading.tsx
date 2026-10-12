import { PageShell } from "@/components/ui/page-shell";

export default function Loading() {
  return (
    <PageShell>
      <div className="h-8 w-56 animate-pulse rounded bg-msk-ink/10" />
      <div className="mt-6 h-64 animate-pulse rounded-xl bg-msk-ink/[0.06]" />
    </PageShell>
  );
}
