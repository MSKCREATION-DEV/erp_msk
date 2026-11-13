import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export default function Loading() {
  return (
    <PageShell>
      <div className="mb-4 h-10 w-48 animate-pulse rounded-lg bg-msk-chalk" />
      <Surface className="mb-5 h-48 animate-pulse bg-msk-chalk/80" />
      <Surface className="h-40 animate-pulse bg-msk-chalk/60" />
    </PageShell>
  );
}
