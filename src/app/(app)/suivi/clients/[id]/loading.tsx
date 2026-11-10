import { PageShell } from "@/components/ui/page-shell";

export default function SuiviClientDetailLoading() {
  return (
    <PageShell>
      <div className="h-8 w-56 animate-pulse rounded bg-msk-ink/6" />
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-msk-ink/4" />
        ))}
      </div>
    </PageShell>
  );
}
