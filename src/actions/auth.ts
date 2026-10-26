"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { requireUser, touchLastLogin } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/resend";
import { resetRequestNotifyHtml } from "@/lib/email/templates";
import { hasPermission, resolveUserPermissions } from "@/lib/rbac/resolve";
import {
  isPasswordResetEligible,
  sendRecoveryLinkEmail,
  setTempPasswordAndEmail,
} from "@/lib/auth/password-recovery";

const loginSchema = z.object({
  email: z.string().email("E-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  /** @deprecated Ne plus exposer de secret au client. */
  login?: string;
  /** @deprecated Ne plus exposer de secret au client. */
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

  await prisma.passwordResetRequest.updateMany({
    where: { userId: session.id, status: "PENDING" },
    data: {
      status: "DONE",
      resolvedAt: new Date(),
      resolvedById: session.id,
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

const GENERIC_RESET_MESSAGE =
  "Si un compte correspond à cet e-mail, un message de réinitialisation a été envoyé.";

/**
 * Mot de passe oublié (public) — envoie un lien recovery au collaborateur
 * + notifie les admins. Réponse neutre anti-énumération.
 */
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
  const generic = { ok: true as const, message: GENERIC_RESET_MESSAGE };

  if (!user || !isPasswordResetEligible(user.status)) {
    return generic;
  }

  // Anti-abus simple : max 3 demandes / heure / compte
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.passwordResetRequest.count({
    where: { userId: user.id, createdAt: { gte: since } },
  });
  if (recent >= 3) {
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

  const linkSent = await sendRecoveryLinkEmail({
    email: user.email,
    firstName: user.firstName,
  });

  let channel: "recovery_link" | "temp_password_fallback" | "none" =
    linkSent.ok ? "recovery_link" : "none";

  // Filet : si le lien échoue, MDP temporaire par e-mail + force change
  if (!linkSent.ok) {
    const tempSent = await setTempPasswordAndEmail({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
    });
    if (tempSent.ok) {
      channel = "temp_password_fallback";
      await prisma.user.update({
        where: { id: user.id },
        data: {
          mustChangePassword: true,
          status: user.isSuperAdmin
            ? UserStatus.ACTIVE
            : UserStatus.MUST_CHANGE_PASSWORD,
        },
      });
    }
  }

  // Notif admins (file de suivi) — best-effort
  try {
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
      const channelHint =
        channel === "recovery_link"
          ? "un lien a été envoyé au collaborateur"
          : channel === "temp_password_fallback"
            ? "un mot de passe temporaire a été envoyé (filet)"
            : "l’envoi automatique a échoué — action admin requise";
      await sendEmail({
        to: notifyEmails,
        subject: `MSK CREATION — Demande reset MDP — ${user.firstName} ${user.lastName}`,
        html: resetRequestNotifyHtml({
          subjectName: `${user.firstName} ${user.lastName}`,
          subjectEmail: user.email,
          requesterHint:
            parsed.data.note ||
            `Demande depuis « Mot de passe oublié » — ${channelHint}.`,
        }),
      });
    }
  } catch {
    /* ignore */
  }

  return generic;
}

const adminUserIdSchema = z.object({
  userId: z.string().uuid(),
});

async function loadResetTarget(userId: string) {
  const actor = await requireUser({ permission: "users.reset_password" });
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { ok: false as const, error: "Utilisateur introuvable" };
  }
  if (target.isSuperAdmin && !actor.isSuperAdmin) {
    return {
      ok: false as const,
      error: "Seul le Super Admin peut réinitialiser ce compte",
    };
  }
  if (target.status === UserStatus.ARCHIVED) {
    return {
      ok: false as const,
      error: "Compte archivé — réactivez-le avant une réinitialisation",
    };
  }
  if (target.status === UserStatus.SUSPENDED) {
    return {
      ok: false as const,
      error: "Compte suspendu — réactivez-le avant une réinitialisation",
    };
  }
  return { ok: true as const, actor, target };
}

async function markResetRequestsDone(userId: string, actorId: string) {
  await prisma.passwordResetRequest.updateMany({
    where: { userId, status: "PENDING" },
    data: {
      status: "DONE",
      resolvedAt: new Date(),
      resolvedById: actorId,
    },
  });
}

/** Admin : envoie un lien de réinitialisation (jamais de MDP à l’écran). */
export async function adminSendPasswordResetLinkAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = adminUserIdSchema.safeParse({
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Utilisateur invalide" };
  }

  const loaded = await loadResetTarget(parsed.data.userId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { actor, target } = loaded;

  const sent = await sendRecoveryLinkEmail({
    email: target.email,
    firstName: target.firstName,
  });
  if (!sent.ok) {
    return { ok: false, error: sent.error };
  }

  await markResetRequestsDone(target.id, actor.id);
  await writeAudit({
    actorId: actor.id,
    action: "users.reset_password",
    entityType: "user",
    entityId: target.id,
    metadata: { channel: "recovery_link" },
  });

  revalidatePath("/administration/utilisateurs");
  revalidatePath(`/administration/utilisateurs/${target.id}`);
  return {
    ok: true,
    message: `Lien de réinitialisation envoyé à ${target.email}.`,
  };
}

/** Admin : génère un MDP temporaire et l’envoie par e-mail uniquement. */
export async function adminSendTempPasswordEmailAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = adminUserIdSchema.safeParse({
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Utilisateur invalide" };
  }

  const loaded = await loadResetTarget(parsed.data.userId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { actor, target } = loaded;

  const sent = await setTempPasswordAndEmail({
    userId: target.id,
    email: target.email,
    firstName: target.firstName,
  });
  if (!sent.ok) {
    return { ok: false, error: sent.error };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      mustChangePassword: true,
      status: target.isSuperAdmin
        ? UserStatus.ACTIVE
        : UserStatus.MUST_CHANGE_PASSWORD,
    },
  });

  await markResetRequestsDone(target.id, actor.id);
  await writeAudit({
    actorId: actor.id,
    action: "users.reset_password",
    entityType: "user",
    entityId: target.id,
    metadata: { channel: "temp_password_email" },
  });

  revalidatePath("/administration/utilisateurs");
  revalidatePath(`/administration/utilisateurs/${target.id}`);
  return {
    ok: true,
    message: `Mot de passe temporaire envoyé à ${target.email}. Le collaborateur devra le changer à la connexion.`,
  };
}

/**
 * @deprecated Préférer adminSendPasswordResetLinkAction /
 * adminSendTempPasswordEmailAction. Ne renvoie plus de secret.
 */
export async function adminResetPasswordAction(
  prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const mode = String(formData.get("mode") ?? "link");
  if (mode === "temp_email") {
    return adminSendTempPasswordEmailAction(prev, formData);
  }
  return adminSendPasswordResetLinkAction(prev, formData);
}
