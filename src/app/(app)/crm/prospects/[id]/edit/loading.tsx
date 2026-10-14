import { PageShell } from "@/components/ui/page-shell";

export default function CrmProspectEditLoading() {
  return (
    <PageShell>
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 rounded-lg bg-msk-ink/10" />
        <div className="h-4 w-40 rounded bg-msk-ink/5" />
        <div className="h-72 rounded-xl border border-msk-ink/[0.06] bg-white" />
      </div>
    </PageShell>
  );
}
