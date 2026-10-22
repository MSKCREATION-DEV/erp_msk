import { Badge } from "@/components/ui/badge";
import { guideStatusLabel, guideStatusTone, type GuideStatus } from "@/lib/guides";

export function GuideStatusBadge({ status }: { status: GuideStatus }) {
  return <Badge tone={guideStatusTone(status)}>{guideStatusLabel(status)}</Badge>;
}
