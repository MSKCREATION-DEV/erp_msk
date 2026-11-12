import { PageShell } from "@/components/ui/page-shell";

export default function SuiviChargeNouveauLoading() {
  return (
    <PageShell>
      <div className="mb-4 h-8 w-56 animate-pulse rounded bg-msk-ink/6" />
      <div className="h-64 animate-pulse rounded-2xl bg-msk-ink/6" />
    </PageShell>
  );
}
