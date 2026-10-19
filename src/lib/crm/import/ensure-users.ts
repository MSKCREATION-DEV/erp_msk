import type { PrismaClient, UserStatus } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import {
  loadUsersMap,
  type ImportUserDef,
} from "@/lib/crm/import/users-map";

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

export type EnsureUsersResult = {
  ensured: { key: string; email: string; created: boolean; status: string }[];
  passwords: { email: string; tempPassword: string }[];
};

/**
 * Crée / synchronise les users du users.map.json.
 * Fondateur ACTIVE : jamais de reset MDP Auth.
 * ARCHIVED : create Auth + Prisma, pas d’invitation, packs vidés.
 */
export async function ensureImportUsers(
  prisma: PrismaClient,
  mapPath?: string,
): Promise<EnsureUsersResult> {
  const map = loadUsersMap(mapPath);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase env manquant (URL / SERVICE_ROLE_KEY)");
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as AuthAdmin;

  const ensured: EnsureUsersResult["ensured"] = [];
  const passwords: EnsureUsersResult["passwords"] = [];

  for (const [key, def] of Object.entries(map.aliases)) {
    const result = await ensureOne(prisma, admin, key, def);
    ensured.push(result.row);
    if (result.tempPassword) {
      passwords.push({ email: def.email, tempPassword: result.tempPassword });
    }
  }

  return { ensured, passwords };
}

type AuthAdmin = {
  auth: {
    admin: {
      listUsers: (opts: { perPage: number }) => Promise<{
        data: { users: { id: string; email?: string }[] };
      }>;
      createUser: (opts: {
        email: string;
        password: string;
        email_confirm: boolean;
        user_metadata: Record<string, string>;
      }) => Promise<{
        data: { user: { id: string } | null };
        error: { message: string } | null;
      }>;
      updateUserById: (
        id: string,
        attrs: { ban_duration?: string },
      ) => Promise<unknown>;
    };
  };
};

async function ensureOne(
  prisma: PrismaClient,
  admin: AuthAdmin,
  key: string,
  def: ImportUserDef,
): Promise<{
  row: EnsureUsersResult["ensured"][0];
  tempPassword: string | null;
}> {
  const email = def.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  let authId = existing?.id;
  let tempPassword: string | null = null;
  let created = false;

  if (!authId) {
    const listed = await admin.auth.admin.listUsers({ perPage: 200 });
    const found = listed.data.users.find(
      (u) => u.email?.toLowerCase() === email,
    );
    if (found) {
      authId = found.id;
    } else {
      tempPassword = genTempPassword();
      const createdAuth = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: def.firstName,
          last_name: def.lastName,
        },
      });
      if (createdAuth.error || !createdAuth.data.user) {
        throw new Error(
          `Auth ${email}: ${createdAuth.error?.message ?? "échec"}`,
        );
      }
      authId = createdAuth.data.user.id;
      created = true;
    }
  } else if (def.isFounder || isActivatedAccount(existing!)) {
    // ⛔ jamais reset MDP
    tempPassword = null;
  }

  const targetStatus = def.status as UserStatus;
  const mustChange =
    targetStatus === "MUST_CHANGE_PASSWORD" ||
    targetStatus === "INVITE_PENDING";

  const preserveActiveLogin =
    existing &&
    isActivatedAccount(existing) &&
    def.status !== "ARCHIVED";

  await prisma.user.upsert({
    where: { id: authId! },
    create: {
      id: authId!,
      email,
      firstName: def.firstName,
      lastName: def.lastName,
      status: targetStatus,
      mustChangePassword: mustChange,
      invitedAt: new Date(),
    },
    update: {
      firstName: def.firstName,
      lastName: def.lastName,
      email,
      // Ne downgrade pas un compte déjà activé (Mathieu, Yaye…) vers MUST_CHANGE
      // sauf si la cible est ARCHIVED (ex-collabs).
      ...(preserveActiveLogin
        ? {}
        : {
            status: targetStatus,
            mustChangePassword: mustChange,
          }),
      ...(def.status === "ARCHIVED"
        ? { status: "ARCHIVED" as UserStatus, mustChangePassword: false }
        : {}),
    },
  });

  // Packs / groups
  await prisma.userPack.deleteMany({ where: { userId: authId! } });
  await prisma.groupMember.deleteMany({ where: { userId: authId! } });

  for (const code of def.groups) {
    const g = await prisma.group.findUnique({ where: { code } });
    if (!g) continue;
    await prisma.groupMember.create({
      data: { userId: authId!, groupId: g.id },
    });
  }
  for (const code of def.packs) {
    const p = await prisma.permissionPack.findUnique({ where: { code } });
    if (!p) continue;
    await prisma.userPack.create({
      data: { userId: authId!, packId: p.id },
    });
  }

  // RH fiche (optionnel)
  const rh = await prisma.rhEmployee.findUnique({
    where: { userId: authId! },
  });
  if (!rh && def.status !== "ARCHIVED") {
    await prisma.rhEmployee.create({
      data: {
        userId: authId!,
        firstName: def.firstName,
        lastName: def.lastName,
        email,
        jobTitle: def.jobTitle,
        employeeType: def.employeeType,
        status: "ACTIVE",
        hireDate: new Date(),
        leaveBalanceDays: 0,
      },
    });
  }

  // Anciens archivés : ban Auth (pas de login)
  if (def.status === "ARCHIVED") {
    try {
      await admin.auth.admin.updateUserById(authId!, {
        ban_duration: "876000h",
      });
    } catch {
      /* ignore */
    }
  }

  const final = await prisma.user.findUniqueOrThrow({
    where: { id: authId! },
    select: { status: true },
  });

  return {
    row: {
      key,
      email,
      created,
      status: final.status,
    },
    tempPassword:
      created && def.status !== "ARCHIVED" ? tempPassword : null,
  };
}
