import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { PageShell } from "@/components/ui/page-shell";

export default function ComptabiliteClientsLoading() {
  return (
    <PageShell>
      <ListTableSkeleton rows={8} cols={8} />
    </PageShell>
  );
}
