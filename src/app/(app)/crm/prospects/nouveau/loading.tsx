import { PageShell } from "@/components/ui/page-shell";

export default function NouveauProspectLoading() {
  return (
    <PageShell>
      <div className="h-10 w-64 animate-pulse rounded-lg bg-msk-ink/5" />
      <div className="h-[28rem] w-full animate-pulse rounded-2xl bg-msk-ink/5" />
    </PageShell>
  );
}
