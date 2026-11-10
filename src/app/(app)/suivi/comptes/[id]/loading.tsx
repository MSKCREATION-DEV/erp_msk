import { PageShell } from "@/components/ui/page-shell";

export default function SuiviCompteDetailLoading() {
  return (
    <PageShell>
      <div className="mb-6 h-10 w-56 animate-pulse rounded-lg bg-msk-ink/6" />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-xl bg-msk-ink/6" />
        <div className="h-24 animate-pulse rounded-xl bg-msk-ink/6 sm:col-span-2" />
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-msk-ink/6" />
    </PageShell>
  );
}
