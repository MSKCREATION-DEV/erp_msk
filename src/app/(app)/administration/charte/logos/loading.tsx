import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";

export default function Loading() {
  return <ListTableSkeleton rows={6} cols={4} />;
}
