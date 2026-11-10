import { PageShell } from "@/components/ui/page-shell";

export default function SuiviLoading() {
  return (
    <PageShell>
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-msk-ink/6" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-msk-ink/4" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl border border-msk-ink/6 bg-white"
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
