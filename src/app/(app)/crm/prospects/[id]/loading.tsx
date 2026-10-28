import { PageShell } from "@/components/ui/page-shell";

export default function CrmProspectDetailLoading() {
  return (
    <PageShell>
      <div className="h-10 w-72 max-w-full animate-pulse rounded-lg bg-msk-ink/5" />
      <div className="h-36 w-full animate-pulse rounded-2xl bg-msk-ink/5" />
      <div className="grid gap-4 @xl:grid-cols-12">
        <div className="h-56 animate-pulse rounded-2xl bg-msk-ink/5 @xl:col-span-5" />
        <div className="h-56 animate-pulse rounded-2xl bg-msk-ink/5 @xl:col-span-4" />
        <div className="h-56 animate-pulse rounded-2xl bg-msk-ink/5 @xl:col-span-3" />
        <div className="h-48 animate-pulse rounded-2xl bg-msk-ink/5 @xl:col-span-6" />
        <div className="h-48 animate-pulse rounded-2xl bg-msk-ink/5 @xl:col-span-6" />
        <div className="h-64 animate-pulse rounded-2xl bg-msk-ink/5 @xl:col-span-12" />
      </div>
    </PageShell>
  );
}
