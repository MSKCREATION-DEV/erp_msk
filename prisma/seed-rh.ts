/**
 * Seed Phase 4 — fiches RH pour users actifs connus (lien 1–1 User).
 */
import type { PrismaClient } from "@prisma/client";

export async function seedPhase4Rh(prisma: PrismaClient) {
  const users = await prisma.user.findMany({
    where: { status: { in: ["ACTIVE", "MUST_CHANGE_PASSWORD"] } },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      isSuperAdmin: true,
    },
  });

  let created = 0;
  for (const u of users) {
    const existing = await prisma.rhEmployee.findUnique({
      where: { userId: u.id },
    });
    if (existing) continue;

    await prisma.rhEmployee.create({
      data: {
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        jobTitle: u.isSuperAdmin ? "Responsable Technique" : null,
        employeeType: u.isSuperAdmin ? "DIRIGEANT" : "SALARIE",
        status: "ACTIVE",
        hireDate: new Date("2024-01-01"),
        leaveBalanceDays: 22,
        reglementStatus: u.isSuperAdmin ? "SIGNED" : "PENDING",
        reglementSignedAt: u.isSuperAdmin ? new Date() : null,
      },
    });
    created += 1;
  }

  console.log(`✓ Phase 4 RH: ${created} fiche(s) créées (${users.length} users éligibles)`);
}
