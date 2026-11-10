import { PageShell } from "@/components/ui/page-shell";

export default function SuiviCompteMouvementLoading() {
  return (
    <PageShell>
      <div className="mb-6 h-10 w-64 animate-pulse rounded-lg bg-msk-ink/6" />
      <div className="h-80 animate-pulse rounded-xl bg-msk-ink/6" />
    </PageShell>
  );
}
