import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export default function Loading() {
  return (
    <PageShell>
      <div className="mb-4 h-10 w-56 animate-pulse rounded-lg bg-msk-chalk" />
      <Surface className="p-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-msk-chalk" />
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-msk-chalk" />
      </Surface>
    </PageShell>
  );
}
