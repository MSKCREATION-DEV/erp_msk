import { PageShell } from "@/components/ui/page-shell";

export default function SuiviDashboardLoading() {
  return (
    <PageShell>
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-56 rounded-lg bg-msk-ink/8" />
        <div className="h-4 w-80 max-w-full rounded bg-msk-ink/6" />
        <div className="h-36 rounded-xl border border-msk-ink/8 bg-white" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 rounded-xl bg-white border border-msk-ink/8" />
          <div className="h-28 rounded-xl bg-white border border-msk-ink/8" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-msk-ink/8 bg-white"
            />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="h-64 rounded-xl border border-msk-ink/8 bg-white lg:col-span-3" />
          <div className="h-64 rounded-xl border border-msk-ink/8 bg-white lg:col-span-2" />
        </div>
      </div>
    </PageShell>
  );
}
