import { prisma } from "@/lib/prisma";

/** IDs des users du groupe Commerciaux (visiblité team). */
export async function commercialTeamUserIds(): Promise<string[]> {
  const members = await prisma.groupMember.findMany({
    where: { group: { code: "commerciaux" } },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}
