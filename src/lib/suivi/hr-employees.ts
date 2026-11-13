import { prisma } from "@/lib/prisma";
import { employeeDisplayName } from "@/lib/suivi/hr";
import type { OptionPickerItem } from "@/components/ui/option-picker-modal";

/** Collaborateurs RH actifs pour les pickers Suivi (pas de 2ᵉ annuaire). */
export async function listSvHrEmployeeOptions(): Promise<OptionPickerItem[]> {
  const rows = await prisma.rhEmployee.findMany({
    where: { status: { in: ["ACTIVE", "ONBOARDING"] } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 400,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      department: true,
    },
  });
  return rows.map((e) => ({
    value: e.id,
    label: employeeDisplayName(e),
    description: [e.jobTitle, e.department].filter(Boolean).join(" · ") || undefined,
  }));
}
