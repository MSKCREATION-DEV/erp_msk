import { Surface } from "@/components/ui/surface";
import { LEAVE_MOVEMENT_LABEL } from "@/lib/rh/leave-ledger";
import { formatLeaveDays } from "@/lib/espace/overview";
import type { RhLeaveMovementType } from "@prisma/client";

export type LeaveMovementRow = {
  id: string;
  type: RhLeaveMovementType;
  days: number;
  effectiveDate: Date;
  note: string | null;
};

export function LeaveMovementsList({
  movements,
}: {
  movements: LeaveMovementRow[];
}) {
  if (movements.length === 0) {
    return (
      <Surface className="p-6 text-sm text-msk-ink/50">
        Aucun mouvement de solde pour l&apos;instant. L&apos;acquisition
        mensuelle (+2,5 j) et les congés approuvés apparaîtront ici.
      </Surface>
    );
  }

  return (
    <Surface className="overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-msk-ink/6 text-msk-ink/45">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium text-right">Jours</th>
            <th className="px-4 py-3 font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => {
            const positive = m.days > 0;
            return (
              <tr key={m.id} className="border-b border-msk-ink/6 last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 text-msk-ink/70">
                  {m.effectiveDate.toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-2.5 text-msk-ink">
                  {LEAVE_MOVEMENT_LABEL[m.type]}
                </td>
                <td
                  className={`px-4 py-2.5 text-right font-medium tabular-nums ${
                    positive ? "text-msk-blue" : "text-msk-coral"
                  }`}
                >
                  {positive ? "+" : ""}
                  {formatLeaveDays(m.days)}
                </td>
                <td className="max-w-xs truncate px-4 py-2.5 text-msk-ink/50">
                  {m.note ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Surface>
  );
}
