import { PageShell } from "@/components/ui/page-shell";

export default function SuiviComptesLoading() {
  return (
    <PageShell>
      <div className="mb-6 h-10 w-48 animate-pulse rounded-lg bg-msk-ink/6" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-xl bg-msk-ink/6" />
        <div className="h-36 animate-pulse rounded-xl bg-msk-ink/6" />
      </div>
    </PageShell>
  );
}
