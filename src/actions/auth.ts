"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { requireUser, touchLastLogin } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/resend";
import { resetRequestNotifyHtml } from "@/lib/email/templates";
import { hasPermission, resolveUserPermissions } from "@/lib/rbac/resolve";

const loginSchema = z.object({
  email: z.string().email("E-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  /** Affichage admin quand Resend ne délivre pas encore. */
  login?: string;
  tempPassword?: string;
};

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: "Identifiants incorrects" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Session introuvable" };
  }

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "Compte non provisionné dans l’ERP. Contactez un administrateur.",
    };
  }

  if (
    profile.status === UserStatus.SUSPENDED ||
    profile.status === UserStatus.ARCHIVED
  ) {
    await supabase.auth.signOut();
    return { ok: false, error: "Compte suspendu ou archivé" };
  }

  await touchLastLogin(user.id);

  if (
    profile.mustChangePassword ||
    profile.status === UserStatus.MUST_CHANGE_PASSWORD ||
    profile.status === UserStatus.INVITE_PENDING
  ) {
    redirect("/changer-mot-de-passe");
  }

  redirect("/accueil");
}

/** Déconnexion Auth — le client doit faire un hard nav (`window.location`) pour vider l’état. */
export async function logoutAction(): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true, message: "Déconnecté" };
}

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Au moins 10 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[a-z]/, "Au moins une minuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireUser({ allowMustChangePassword: true });

  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  await prisma.user.update({
    where: { id: session.id },
    data: {
      mustChangePassword: false,
      status: UserStatus.ACTIVE,
      activatedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: session.id,
    action: "auth.password_changed",
    entityType: "user",
    entityId: session.id,
  });

  redirect("/accueil");
}

const resetRequestSchema = z.object({
  email: z.string().email(),
  note: z.string().max(500).optional(),
});

export async function requestPasswordResetAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetRequestSchema.safeParse({
    email: formData.get("email"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "E-mail invalide" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Réponse générique anti-énumération
  const generic = {
    ok: true,
    message:
      "Si ce compte existe, les administrateurs autorisés ont été notifiés.",
  };

  if (!user || user.status === UserStatus.ARCHIVED) {
    return generic;
  }

  await prisma.passwordResetRequest.create({
    data: {
      userId: user.id,
      requesterEmail: email,
      note: parsed.data.note,
    },
  });

  await writeAudit({
    actorId: null,
    action: "auth.reset_requested",
    entityType: "user",
    entityId: user.id,
    metadata: { email },
  });

  const holders = await prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      OR: [{ isSuperAdmin: true }, { userPacks: { some: {} } }],
    },
    select: { id: true, email: true },
  });

  const notifyEmails: string[] = [];
  for (const h of holders) {
    const resolved = await resolveUserPermissions(h.id);
    if (resolved && hasPermission(resolved, "users.reset_password")) {
      notifyEmails.push(h.email);
    }
  }

  if (notifyEmails.length > 0) {
    try {
      await sendEmail({
        to: notifyEmails,
        subject: `MSK CREATION — Demande reset MDP — ${user.firstName} ${user.lastName}`,
        html: resetRequestNotifyHtml({
          subjectName: `${user.firstName} ${user.lastName}`,
          subjectEmail: user.email,
          requesterHint: parsed.data.note || "Demande depuis le formulaire public.",
        }),
      });
    } catch {
      // Ne pas exposer l’échec e-mail à l’utilisateur public
    }
  }

  return generic;
}

const adminResetSchema = z.object({
  userId: z.string().uuid(),
  tempPassword: z
    .string()
    .min(10, "Mot de passe temporaire trop court")
    .optional(),
});

export async function adminResetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "users.reset_password" });
  const parsed = adminResetSchema.safeParse({
    userId: formData.get("userId"),
    tempPassword: formData.get("tempPassword") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!target) return { ok: false, error: "Utilisateur introuvable" };
  if (target.isSuperAdmin && !actor.isSuperAdmin) {
    return {
      ok: false,
      error: "Seul le Super Admin peut réinitialiser ce compte",
    };
  }
  if (target.status === UserStatus.ARCHIVED) {
    return { ok: false, error: "Compte archivé — réactivez-le avant un reset MDP" };
  }

  const temp =
    parsed.data.tempPassword ??
    `Tmp-${Math.random().toString(36).slice(2, 10)}!A1`;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(target.id, {
    password: temp,
  });
  if (error) return { ok: false, error: error.message };

  await prisma.user.update({
    where: { id: target.id },
    data: {
      mustChangePassword: true,
      status:
        target.status === UserStatus.SUSPENDED
          ? UserStatus.SUSPENDED
          : target.isSuperAdmin
            ? UserStatus.ACTIVE // Super Admin : MDP changé mais reste ACTIVE + mustChange
            : UserStatus.MUST_CHANGE_PASSWORD,
    },
  });

  await prisma.passwordResetRequest.updateMany({
    where: { userId: target.id, status: "PENDING" },
    data: {
      status: "DONE",
      resolvedAt: new Date(),
      resolvedById: actor.id,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "users.reset_password",
    entityType: "user",
    entityId: target.id,
  });

  revalidatePath("/administration/utilisateurs");
  revalidatePath(`/administration/utilisateurs/${target.id}`);
  return {
    ok: true,
    message: `Mot de passe temporaire généré — communiquez-le de façon sécurisée.`,
    login: target.email,
    tempPassword: temp,
  };
}
