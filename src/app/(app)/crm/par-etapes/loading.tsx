import { PageShell } from "@/components/ui/page-shell";

export default function Loading() {
  return (
    <PageShell className="max-w-none">
      <div className="h-8 w-48 animate-pulse rounded bg-msk-ink/10" />
      <div className="mt-6 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-72 w-65 shrink-0 animate-pulse rounded-xl bg-msk-ink/6"
          />
        ))}
      </div>
    </PageShell>
  );
}
