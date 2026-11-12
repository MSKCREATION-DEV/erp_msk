import { PageShell } from "@/components/ui/page-shell";

export default function SuiviChargeDetailLoading() {
  return (
    <PageShell>
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-msk-ink/6" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-2xl bg-msk-ink/6" />
        <div className="h-48 animate-pulse rounded-2xl bg-msk-ink/6" />
      </div>
    </PageShell>
  );
}
