/**
 * Seed comptes Mathieu + Andile — Auth safe (pas de reset MDP si ACTIVE).
 */
import type { PrismaClient, UserStatus } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../src/lib/email/resend";
import {
  inviteEmailHtml,
  inviteEmailText,
} from "../src/lib/email/templates";
import { ensureCollaboratorFolders } from "../src/lib/ged/tree";
import { ensureContractTypeRules } from "../src/lib/paie/contract-rules";

type SeedTeamUser = {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  employeeType: "DIRIGEANT" | "SALARIE";
  groupCodes: string[];
  packCodes: string[];
  roleHint: string;
};

const TEAM_USERS: SeedTeamUser[] = [
  {
    email: "m.diarra@mskcreation.net",
    firstName: "Mathieu",
    lastName: "Diarra",
    jobTitle: "Fondateur",
    employeeType: "DIRIGEANT",
    groupCodes: ["collaborateur", "direction"],
    packCodes: ["direction", "admin_plateforme"],
    roleHint: "Direction & administration plateforme",
  },
  {
    email: "a.boussari@mskcreation.net",
    firstName: "Andile",
    lastName: "Boussari",
    jobTitle: "Chef de Projet",
    employeeType: "SALARIE",
    groupCodes: ["collaborateur", "direction"],
    packCodes: ["projets", "direction", "admin_plateforme"],
    roleHint: "Projets, Direction & administration plateforme",
  },
];

function isActivatedAccount(u: {
  status: UserStatus;
  mustChangePassword: boolean;
  activatedAt: Date | null;
}): boolean {
  return (
    u.status === "ACTIVE" ||
    (!u.mustChangePassword && u.activatedAt != null)
  );
}

function genTempPassword() {
  return `Msk-${Math.random().toString(36).slice(2, 10)}!A1`;
}

export async function seedTeamUsers(prisma: PrismaClient) {
  await ensureContractTypeRules();
  console.log("✓ Règles éligibilité types de contrat");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn("⚠ Seed team users ignoré — Supabase env manquant");
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const member of TEAM_USERS) {
    const email = member.email.toLowerCase();
    let existing = await prisma.user.findUnique({ where: { email } });
    let authId = existing?.id;
    let tempPassword: string | null = null;
    let createdNew = false;

    if (!authId) {
      const listed = await admin.auth.admin.listUsers({ perPage: 200 });
      const found = listed.data.users.find(
        (u) => u.email?.toLowerCase() === email,
      );
      if (found) {
        authId = found.id;
        console.log(`ℹ Auth ${email} déjà présent — MDP conservé`);
      } else {
        tempPassword = genTempPassword();
        const created = await admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: member.firstName,
            last_name: member.lastName,
          },
        });
        if (created.error || !created.data.user) {
          console.error(
            `✗ Auth ${email}: ${created.error?.message ?? "échec"}`,
          );
          continue;
        }
        authId = created.data.user.id;
        createdNew = true;
      }
    } else if (isActivatedAccount(existing!)) {
      console.log(`⛔ ${email} ACTIVE — MDP Auth NON modifié`);
    }

    await prisma.user.upsert({
      where: { id: authId! },
      create: {
        id: authId!,
        email,
        firstName: member.firstName,
        lastName: member.lastName,
        status: "MUST_CHANGE_PASSWORD",
        mustChangePassword: true,
        invitedAt: new Date(),
      },
      update: {
        firstName: member.firstName,
        lastName: member.lastName,
        email,
      },
    });

    for (const code of member.groupCodes) {
      const g = await prisma.group.findUnique({ where: { code } });
      if (!g) continue;
      await prisma.groupMember.upsert({
        where: { userId_groupId: { userId: authId!, groupId: g.id } },
        create: { userId: authId!, groupId: g.id },
        update: {},
      });
    }

    for (const code of member.packCodes) {
      const p = await prisma.permissionPack.findUnique({ where: { code } });
      if (!p) continue;
      await prisma.userPack.upsert({
        where: { userId_packId: { userId: authId!, packId: p.id } },
        create: { userId: authId!, packId: p.id },
        update: {},
      });
    }

    const rh = await prisma.rhEmployee.findUnique({
      where: { userId: authId! },
    });
    if (!rh) {
      await prisma.rhEmployee.create({
        data: {
          userId: authId!,
          firstName: member.firstName,
          lastName: member.lastName,
          email,
          jobTitle: member.jobTitle,
          employeeType: member.employeeType,
          status: "ACTIVE",
          hireDate: new Date("2024-01-01"),
          leaveBalanceDays: 22,
          reglementStatus: "SIGNED",
          reglementSignedAt: new Date(),
        },
      });
    } else {
      await prisma.rhEmployee.update({
        where: { id: rh.id },
        data: {
          jobTitle: member.jobTitle,
          employeeType: member.employeeType,
          email,
        },
      });
    }

    try {
      await ensureCollaboratorFolders(
        member.firstName,
        member.lastName,
        new Date().getFullYear(),
        authId!,
      );
    } catch (e) {
      console.warn(`GED ${email}:`, e);
    }

    const org = await prisma.orgNode.findFirst({
      where: {
        fullName: { contains: member.lastName, mode: "insensitive" },
      },
    });
    if (org && !org.userId) {
      await prisma.orgNode.update({
        where: { id: org.id },
        data: { userId: authId! },
      });
    }

    const packsSummary = member.packCodes.join(", ");

    if (createdNew && tempPassword) {
      try {
        await sendEmail({
          to: email,
          subject: "MSK CREATION — Votre accès ERP",
          html: inviteEmailHtml({
            firstName: member.firstName,
            email,
            tempPassword,
            packsSummary,
            roleHint: member.roleHint,
          }),
          text: inviteEmailText({
            firstName: member.firstName,
            email,
            tempPassword,
            packsSummary,
          }),
        });
        console.log(`✓ Invitation e-mail envoyée → ${email}`);
      } catch (e) {
        console.warn(
          `⚠ E-mail non délivré ${email} — MDP temporaire: ${tempPassword}`,
          e instanceof Error ? e.message : e,
        );
      }
    } else {
      console.log(`✓ Compte ${email} synchronisé (groupes/packs/RH)`);
    }
  }
}
