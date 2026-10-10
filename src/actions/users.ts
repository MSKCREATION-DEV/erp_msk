"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { OverrideEffect, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/resend";
import { inviteEmailHtml, inviteEmailText } from "@/lib/email/templates";
import type { ActionResult } from "@/actions/auth";

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(40).optional(),
  groupIds: z.array(z.string()).default([]),
  packIds: z.array(z.string()).default([]),
});

function genTempPassword() {
  return `Msk-${Math.random().toString(36).slice(2, 10)}!A1`;
}

export async function inviteUserAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "users.create" });

  const groupIds = formData.getAll("groupIds").map(String).filter(Boolean);
  const packIds = formData.getAll("packIds").map(String).filter(Boolean);

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    groupIds,
    packIds,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Un compte existe déjà avec cet e-mail" };
  }

  const tempPassword = genTempPassword();
  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
    },
  });
  if (created.error || !created.data.user) {
    return {
      ok: false,
      error: created.error?.message ?? "Échec création Auth",
    };
  }

  const authId = created.data.user.id;

  try {
    const collab = await prisma.group.findUnique({
      where: { code: "collaborateur" },
    });
    const ensuredGroups = new Set(parsed.data.groupIds);
    if (collab) ensuredGroups.add(collab.id);

    await prisma.user.create({
      data: {
        id: authId,
        email,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        status: UserStatus.INVITE_PENDING,
        mustChangePassword: true,
        invitedAt: new Date(),
        groupMembers: {
          create: [...ensuredGroups].map((groupId) => ({ groupId })),
        },
        userPacks: {
          create: parsed.data.packIds.map((packId) => ({ packId })),
        },
      },
    });

    // GED : dossier collaborateur (lazy sous 05_COLLABORATEURS)
    try {
      const { ensureCollaboratorFolders } = await import("@/lib/ged/tree");
      await ensureCollaboratorFolders(
        parsed.data.firstName,
        parsed.data.lastName,
        new Date().getFullYear(),
        actor.id,
      );
    } catch (gedErr) {
      console.warn("GED collab folder:", gedErr);
    }
  } catch (e) {
    await admin.auth.admin.deleteUser(authId);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec création profil",
    };
  }

  const packs = await prisma.permissionPack.findMany({
    where: { id: { in: parsed.data.packIds } },
  });
  const packsSummary =
    packs.map((p) => p.name).join(", ") || "Collaborateur (groupe de base)";

  let emailSent = false;
  try {
    await sendEmail({
      to: email,
      subject: "MSK CREATION — Votre accès ERP",
      html: inviteEmailHtml({
        firstName: parsed.data.firstName,
        email,
        tempPassword,
        packsSummary,
      }),
      text: inviteEmailText({
        firstName: parsed.data.firstName,
        email,
        tempPassword,
        packsSummary,
      }),
    });
    emailSent = true;
  } catch {
    emailSent = false;
  }

  await writeAudit({
    actorId: actor.id,
    action: "users.invite",
    entityType: "user",
    entityId: authId,
    metadata: { email, emailSent, packs: packs.map((p) => p.code) },
  });

  revalidatePath("/administration/utilisateurs");
  return {
    ok: true,
    message: emailSent
      ? `Invitation envoyée à ${email}.`
      : `Compte créé. E-mail non délivré (Resend / domaine). MDP temporaire : ${tempPassword}`,
  };
}

const profileSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(40).optional(),
});

/** Corrige identité / e-mail (Prisma + Auth). Jamais de mot de passe ici. */
export async function updateUserProfileAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "users.edit_profile_any" });

  const parsed = profileSchema.safeParse({
    userId: formData.get("userId"),
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!target) return { ok: false, error: "Utilisateur introuvable" };
  if (target.isSuperAdmin && !actor.isSuperAdmin) {
    return { ok: false, error: "Seul le Super Admin peut modifier ce compte" };
  }

  if (email !== target.email) {
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash && clash.id !== target.id) {
      return { ok: false, error: "Un autre compte utilise déjà cet e-mail" };
    }
  }

  const admin = createAdminClient();
  if (email !== target.email) {
    const authUp = await admin.auth.admin.updateUserById(target.id, {
      email,
      email_confirm: true,
      user_metadata: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
      },
    });
    if (authUp.error) {
      return {
        ok: false,
        error: `Auth: ${authUp.error.message}`,
      };
    }
  } else {
    await admin.auth.admin
      .updateUserById(target.id, {
        user_metadata: {
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
        },
      })
      .catch(() => null);
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone ?? null,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "users.edit_profile",
    entityType: "user",
    entityId: target.id,
    metadata: {
      emailFrom: target.email,
      emailTo: email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    },
  });

  revalidatePath(`/administration/utilisateurs/${target.id}`);
  revalidatePath("/administration/utilisateurs");
  return { ok: true, message: "Profil mis à jour" };
}

export async function updateUserAccessAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "users.manage_access" });
  const userId = String(formData.get("userId") ?? "");
  if (!z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: "Utilisateur invalide" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "Introuvable" };
  if (target.isSuperAdmin && !actor.isSuperAdmin) {
    return { ok: false, error: "Seul le Super Admin peut modifier ce compte" };
  }

  const groupIds = formData.getAll("groupIds").map(String).filter(Boolean);
  const packIds = formData.getAll("packIds").map(String).filter(Boolean);

  await prisma.$transaction([
    prisma.groupMember.deleteMany({ where: { userId } }),
    prisma.userPack.deleteMany({ where: { userId } }),
    prisma.groupMember.createMany({
      data: groupIds.map((groupId) => ({ userId, groupId })),
      skipDuplicates: true,
    }),
    prisma.userPack.createMany({
      data: packIds.map((packId) => ({ userId, packId })),
      skipDuplicates: true,
    }),
  ]);

  await writeAudit({
    actorId: actor.id,
    action: "users.manage_access",
    entityType: "user",
    entityId: userId,
    metadata: { groupIds, packIds },
  });

  revalidatePath(`/administration/utilisateurs/${userId}`);
  revalidatePath("/administration/utilisateurs");
  return { ok: true, message: "Accès mis à jour" };
}

export async function setUserStatusAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "users.suspend" });
  const userId = String(formData.get("userId") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  const allowed = [
    UserStatus.ACTIVE,
    UserStatus.SUSPENDED,
    UserStatus.ARCHIVED,
  ] as const;

  if (!z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: "Utilisateur invalide" };
  }
  if (!allowed.includes(statusRaw as (typeof allowed)[number])) {
    return { ok: false, error: "Statut invalide" };
  }
  const status = statusRaw as (typeof allowed)[number];

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "Introuvable" };
  if (target.isSuperAdmin) {
    return { ok: false, error: "Impossible de suspendre / archiver le Super Admin" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      status,
      suspendedAt: status === UserStatus.SUSPENDED ? new Date() : null,
      archivedAt: status === UserStatus.ARCHIVED ? new Date() : null,
    },
  });

  try {
    const admin = createAdminClient();
    if (status === UserStatus.SUSPENDED || status === UserStatus.ARCHIVED) {
      await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    } else {
      await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
    }
  } catch {
    // Statut Prisma fait foi ; ban Auth best-effort
  }

  await writeAudit({
    actorId: actor.id,
    action: `users.status.${status.toLowerCase()}`,
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/administration/utilisateurs");
  return { ok: true, message: `Statut → ${status}` };
}

export async function setOverrideAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "overrides.manage" });
  const userId = String(formData.get("userId") ?? "");
  const permissionCodes = [
    ...new Set(
      formData
        .getAll("permissionCodes")
        .map(String)
        .filter(Boolean)
        .concat(
          // compat ancien champ single
          String(formData.get("permissionCode") ?? "")
            ? [String(formData.get("permissionCode"))]
            : [],
        ),
    ),
  ];
  const effect = String(formData.get("effect") ?? "") as OverrideEffect;
  const reason = String(formData.get("reason") ?? "") || undefined;

  if (!z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: "Utilisateur invalide" };
  }
  if (effect !== OverrideEffect.GRANT && effect !== OverrideEffect.DENY) {
    return { ok: false, error: "Effet invalide" };
  }

  const codesParsed = z.array(z.string().min(1)).min(1).safeParse(permissionCodes);
  if (!codesParsed.success) {
    return { ok: false, error: "Sélectionnez au moins une permission" };
  }

  const permissions = await prisma.permission.findMany({
    where: { code: { in: codesParsed.data } },
  });
  if (permissions.length !== codesParsed.data.length) {
    return { ok: false, error: "Une ou plusieurs permissions sont inconnues" };
  }

  for (const permission of permissions) {
    await prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionId: { userId, permissionId: permission.id },
      },
      create: {
        userId,
        permissionId: permission.id,
        effect,
        reason,
      },
      update: { effect, reason },
    });
  }

  await writeAudit({
    actorId: actor.id,
    action: "overrides.set",
    entityType: "user",
    entityId: userId,
    metadata: { permissionCodes: codesParsed.data, effect, count: permissions.length },
  });

  revalidatePath(`/administration/utilisateurs/${userId}`);
  return {
    ok: true,
    message:
      permissions.length === 1
        ? "Override enregistré"
        : `${permissions.length} overrides enregistrés`,
  };
}

export async function removeOverrideAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "overrides.manage" });
  const overrideId = String(formData.get("overrideId") ?? "");
  if (!overrideId) return { ok: false, error: "Override invalide" };

  const ov = await prisma.userPermissionOverride.findUnique({
    where: { id: overrideId },
  });
  if (!ov) return { ok: false, error: "Introuvable" };

  await prisma.userPermissionOverride.delete({ where: { id: overrideId } });
  await writeAudit({
    actorId: actor.id,
    action: "overrides.remove",
    entityType: "user",
    entityId: ov.userId,
    metadata: { overrideId },
  });

  revalidatePath(`/administration/utilisateurs/${ov.userId}`);
  return { ok: true, message: "Override retiré" };
}
