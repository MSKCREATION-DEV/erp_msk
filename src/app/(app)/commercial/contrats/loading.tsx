import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { PageShell } from "@/components/ui/page-shell";

export default function ContratsLoading() {
  return (
    <PageShell>
      <ListTableSkeleton rows={8} />
    </PageShell>
  );
}
