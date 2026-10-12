import { PageShell } from "@/components/ui/page-shell";

export default function Loading() {
  return (
    <PageShell>
      <div className="h-8 w-40 animate-pulse rounded bg-msk-ink/10" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-msk-ink/[0.06]"
          />
        ))}
      </div>
    </PageShell>
  );
}
