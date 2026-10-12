import { PageShell } from "@/components/ui/page-shell";

export default function Loading() {
  return (
    <PageShell>
      <div className="h-8 w-48 animate-pulse rounded bg-msk-ink/10" />
      <div className="mt-6 h-48 animate-pulse rounded-xl bg-msk-ink/[0.06]" />
    </PageShell>
  );
}
