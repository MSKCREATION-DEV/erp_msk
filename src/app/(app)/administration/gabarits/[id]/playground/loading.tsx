import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export default function GabaritPlaygroundLoading() {
  return (
    <PageShell>
      <div className="mb-6 h-24 animate-pulse rounded-2xl bg-msk-chalk" />
      <div className="grid gap-4 lg:grid-cols-12">
        <Surface className="h-96 animate-pulse bg-msk-chalk lg:col-span-5" />
        <Surface className="h-[28rem] animate-pulse bg-msk-chalk lg:col-span-7" />
      </div>
    </PageShell>
  );
}
