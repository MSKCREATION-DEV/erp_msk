/**
 * One-shot PROD — crée 4 collaborateurs Marketing/Com + comptes minimaux.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/ops-create-marketing-collabs.ts
 *   SEND_INVITE=0 npx tsx --env-file=.env.local scripts/ops-create-marketing-collabs.ts
 *
 * Auth MDP (auth-password-safety) :
 * - createUser uniquement si Auth inexistant
 * - jamais reset MDP si compte ACTIVE / activé
 * - invite → MUST_CHANGE_PASSWORD + mustChangePassword=true
 *
 * Droits : groupe + pack `collaborateur` uniquement (espace perso / self.*).
 */
import { createClient } from "@supabase/supabase-js";
import { createPrisma } from "@/lib/create-prisma";
import { genTempPassword } from "@/lib/auth/password-recovery";
import { sendEmail } from "@/lib/email/resend";
import {
  inviteEmailHtml,
  inviteEmailText,
} from "@/lib/email/templates";
import { ensureCollaboratorFolders } from "@/lib/ged/tree";

const prisma = createPrisma({ max: 1 });

type CollabDef = {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department?: string;
  workLocation?: string;
  phone?: string;
  country?: string;
  roleHint: string;
};

const COLLABS: CollabDef[] = [
  {
    email: "f.diallo@mskcreation.net",
    firstName: "Fatimatou",
    lastName: "DIALLO",
    jobTitle: "Graphiste",
    workLocation: "ACI 2000",
    roleHint: "Collaborateur — accès minimal",
  },
  {
    email: "e.awesso@mskcreation.net",
    firstName: "Lidaou Espoir",
    lastName: "AWESSO",
    jobTitle: "Vidéaste & Graphisme",
    department: "Marketing & Communication",
    workLocation: "TOGO",
    phone: "+228 90 09 14 02",
    country: "Togo",
    roleHint: "Collaborateur — accès minimal",
  },
  {
    email: "d.keita@mskcreation.net",
    firstName: "Djoulde",
    lastName: "KEITA",
    jobTitle: "Community Manager",
    department: "Communication & Marketing",
    roleHint: "Collaborateur — accès minimal",
  },
  {
    email: "e.golo@mskcreation.net",
    firstName: "Eric Wilfried",
    lastName: "GOLO",
    jobTitle: "Monteur Vidéo",
    department: "Communication & Marketing",
    roleHint: "Collaborateur — accès minimal",
  },
];

function isActivatedAccount(u: {
  status: string;
  mustChangePassword: boolean;
  activatedAt: Date | null;
}): boolean {
  return (
    u.status === "ACTIVE" ||
    (!u.mustChangePassword && u.activatedAt != null)
  );
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  // Pagination courte — volume Auth MSK faible.
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureMinimalRbac(userId: string) {
  const group = await prisma.group.findUnique({
    where: { code: "collaborateur" },
  });
  const pack = await prisma.permissionPack.findUnique({
    where: { code: "collaborateur" },
  });
  if (!group || !pack) {
    throw new Error("Groupe/pack collaborateur introuvable — seed RBAC requis");
  }
  await prisma.groupMember.upsert({
    where: { userId_groupId: { userId, groupId: group.id } },
    create: { userId, groupId: group.id },
    update: {},
  });
  await prisma.userPack.upsert({
    where: { userId_packId: { userId, packId: pack.id } },
    create: { userId, packId: pack.id },
    update: {},
  });
  return { groupCode: group.code, packCode: pack.code };
}

async function main() {
  const sendInvite = process.env.SEND_INVITE !== "0";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Record<string, unknown>[] = [];

  for (const def of COLLABS) {
    const email = def.email.toLowerCase().trim();
    console.log(`\n── ${def.firstName} ${def.lastName} <${email}>`);

    let existing = await prisma.user.findUnique({ where: { email } });
    let authId = existing?.id ?? null;
    let tempPassword: string | null = null;
    let createdAuth = false;
    let authLinkedExisting = false;

    if (existing && isActivatedAccount(existing)) {
      console.log("⛔ Compte ACTIVE — MDP Auth NON modifié");
    }

    if (!authId) {
      const foundAuth = await findAuthUserIdByEmail(admin, email);
      if (foundAuth) {
        authId = foundAuth;
        authLinkedExisting = true;
        console.log("ℹ Auth existant — liaison sans toucher au MDP");
      } else {
        tempPassword = genTempPassword();
        const created = await admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: def.firstName,
            last_name: def.lastName,
          },
        });
        if (created.error || !created.data.user) {
          throw new Error(
            `Auth create ${email}: ${created.error?.message ?? "échec"}`,
          );
        }
        authId = created.data.user.id;
        createdAuth = true;
        console.log(`✓ Auth créé ${authId}`);
      }
    }

    if (!existing) {
      existing = await prisma.user.create({
        data: {
          id: authId!,
          email,
          firstName: def.firstName,
          lastName: def.lastName,
          phone: def.phone ?? null,
          status: "MUST_CHANGE_PASSWORD",
          mustChangePassword: true,
          invitedAt: new Date(),
        },
      });
      console.log(`✓ User Prisma créé ${existing.id}`);
    } else {
      // Identité / téléphone — jamais status/MDP si déjà activé
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: def.firstName,
          lastName: def.lastName,
          phone: def.phone ?? existing.phone,
          ...(isActivatedAccount(existing)
            ? {}
            : {
                status: "MUST_CHANGE_PASSWORD" as const,
                mustChangePassword: true,
                invitedAt: existing.invitedAt ?? new Date(),
              }),
        },
      });
      console.log(`✓ User Prisma mis à jour ${existing.id}`);
    }

    const rbac = await ensureMinimalRbac(authId!);
    console.log(`✓ RBAC ${rbac.groupCode} + ${rbac.packCode}`);

    let rh = await prisma.rhEmployee.findUnique({ where: { userId: authId! } });
    if (!rh) {
      // Fiche orpheline même e-mail ?
      const byEmail = await prisma.rhEmployee.findFirst({
        where: { email, userId: null },
      });
      if (byEmail) {
        rh = await prisma.rhEmployee.update({
          where: { id: byEmail.id },
          data: {
            userId: authId!,
            firstName: def.firstName,
            lastName: def.lastName,
            jobTitle: def.jobTitle,
            department: def.department ?? null,
            workLocation: def.workLocation ?? null,
            phone: def.phone ?? null,
            country: def.country ?? "Mali",
            status: "ACTIVE",
          },
        });
        console.log(`✓ RH lié (orphelin) ${rh.id}`);
      } else {
        rh = await prisma.rhEmployee.create({
          data: {
            userId: authId!,
            firstName: def.firstName,
            lastName: def.lastName,
            email,
            phone: def.phone ?? null,
            jobTitle: def.jobTitle,
            department: def.department ?? null,
            workLocation: def.workLocation ?? null,
            country: def.country ?? "Mali",
            employeeType: "SALARIE",
            status: "ACTIVE",
            leaveBalanceDays: 0,
            reglementStatus: "PENDING",
          },
        });
        console.log(`✓ RH créé ${rh.id}`);
      }
    } else {
      rh = await prisma.rhEmployee.update({
        where: { id: rh.id },
        data: {
          firstName: def.firstName,
          lastName: def.lastName,
          email,
          phone: def.phone ?? rh.phone,
          jobTitle: def.jobTitle,
          department: def.department ?? rh.department,
          workLocation: def.workLocation ?? rh.workLocation,
          country: def.country ?? rh.country,
          status: "ACTIVE",
        },
      });
      console.log(`✓ RH mis à jour ${rh.id}`);
    }

    try {
      await ensureCollaboratorFolders(
        def.firstName,
        def.lastName,
        new Date().getFullYear(),
        authId!,
      );
      console.log("✓ Dossiers GED collab");
    } catch (e) {
      console.warn("⚠ GED:", e instanceof Error ? e.message : e);
    }

    let emailSent = false;
    if (sendInvite && createdAuth && tempPassword) {
      try {
        await sendEmail({
          to: email,
          subject: "MSK CREATION — Votre accès ERP",
          html: inviteEmailHtml({
            firstName: def.firstName,
            email,
            tempPassword,
            packsSummary: "Collaborateur (accès minimal)",
            roleHint: def.roleHint,
          }),
          text: inviteEmailText({
            firstName: def.firstName,
            email,
            tempPassword,
            packsSummary: "Collaborateur (accès minimal)",
          }),
        });
        emailSent = true;
        console.log("✓ Invitation e-mail envoyée");
      } catch (e) {
        console.warn(
          "⚠ E-mail non délivré — MDP temporaire (à communiquer manuellement) :",
          tempPassword,
        );
        console.warn(e instanceof Error ? e.message : e);
      }
    } else if (!createdAuth) {
      console.log(
        authLinkedExisting || existing
          ? "ℹ Pas d’e-mail invite (Auth/User déjà présents — MDP non réécrit)"
          : "ℹ SEND_INVITE=0",
      );
    }

    results.push({
      email,
      userId: authId,
      employeeId: rh.id,
      status: (await prisma.user.findUniqueOrThrow({ where: { id: authId! } }))
        .status,
      packs: ["collaborateur"],
      groups: ["collaborateur"],
      createdAuth,
      emailSent,
      jobTitle: def.jobTitle,
      department: def.department ?? null,
      workLocation: def.workLocation ?? null,
    });
  }

  console.log("\n=== RÉSUMÉ ===");
  console.log(JSON.stringify(results, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
