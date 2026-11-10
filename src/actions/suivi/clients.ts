"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";

const clientSchema = z.object({
  name: z.string().trim().min(1, "Nom obligatoire").max(200),
  contactName: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail invalide").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  country: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type SvClientActionState = {
  ok: false;
  error: string;
} | null;

function emptyToNull(v: string | undefined) {
  const t = v?.trim();
  return t ? t : null;
}

export async function createSvClient(
  _prev: SvClientActionState,
  formData: FormData,
): Promise<SvClientActionState> {
  const user = await requireUser();
  if (!hasPermission(user, "sv.clients.manage") && !user.isSuperAdmin) {
    return { ok: false, error: "Permission refusée." };
  }

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    city: formData.get("city") ?? "",
    country: formData.get("country") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const d = parsed.data;
  let id: string;
  try {
    const row = await prisma.svClient.create({
      data: {
        name: d.name,
        contactName: emptyToNull(d.contactName),
        email: emptyToNull(d.email),
        phone: emptyToNull(d.phone),
        city: emptyToNull(d.city),
        country: emptyToNull(d.country),
        notes: emptyToNull(d.notes),
      },
    });
    id = row.id;
  } catch {
    return { ok: false, error: "Création impossible." };
  }

  revalidatePath("/suivi/clients");
  redirect(`/suivi/clients/${id}`);
}

export async function updateSvClient(
  clientId: string,
  _prev: SvClientActionState,
  formData: FormData,
): Promise<SvClientActionState> {
  const user = await requireUser();
  if (!hasPermission(user, "sv.clients.manage") && !user.isSuperAdmin) {
    return { ok: false, error: "Permission refusée." };
  }

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    city: formData.get("city") ?? "",
    country: formData.get("country") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const d = parsed.data;
  try {
    await prisma.svClient.update({
      where: { id: clientId },
      data: {
        name: d.name,
        contactName: emptyToNull(d.contactName),
        email: emptyToNull(d.email),
        phone: emptyToNull(d.phone),
        city: emptyToNull(d.city),
        country: emptyToNull(d.country),
        notes: emptyToNull(d.notes),
      },
    });
  } catch {
    return { ok: false, error: "Mise à jour impossible." };
  }

  revalidatePath(`/suivi/clients/${clientId}`);
  revalidatePath("/suivi/clients");
  redirect(`/suivi/clients/${clientId}`);
}
