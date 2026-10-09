import "dotenv/config";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient, UserStatus } from "@prisma/client";
import {
  GROUPS,
  PACKS,
  PACK_PERMISSIONS,
  PERMISSIONS,
} from "../src/lib/rbac/catalog";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();

const SUPER_ADMIN = {
  email: "a.guiro@mskcreation.net",
  firstName: "Amadou Samba",
  lastName: "Guiro",
} as const;

function requireEnv(key: string) {
  const v = process.env[key]?.trim();
  if (!v) throw new Error(`Variable manquante: ${key}`);
  return v;
}

async function seedCatalog() {
  for (const [i, p] of PERMISSIONS.entries()) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, domain: p.domain, description: p.description },
      update: { domain: p.domain, description: p.description },
    });
    void i;
  }

  const permByCode = Object.fromEntries(
    (await prisma.permission.findMany()).map((p) => [p.code, p.id]),
  );

  for (const [i, pack] of PACKS.entries()) {
    const row = await prisma.permissionPack.upsert({
      where: { code: pack.code },
      create: {
        code: pack.code,
        name: pack.name,
        description: pack.description,
        sortOrder: i,
      },
      update: {
        name: pack.name,
        description: pack.description,
        sortOrder: i,
      },
    });

    const codes = PACK_PERMISSIONS[pack.code] ?? [];
    await prisma.packPermission.deleteMany({ where: { packId: row.id } });
    for (const code of codes) {
      const permissionId = permByCode[code];
      if (!permissionId) {
        console.warn(`Permission inconnue pour pack ${pack.code}: ${code}`);
        continue;
      }
      await prisma.packPermission.create({
        data: { packId: row.id, permissionId },
      });
    }
  }

  const packs = await prisma.permissionPack.findMany();
  const packByCode = Object.fromEntries(packs.map((p) => [p.code, p.id]));

  for (const [i, g] of GROUPS.entries()) {
    await prisma.group.upsert({
      where: { code: g.code },
      create: {
        code: g.code,
        name: g.name,
        description: g.description,
        defaultPackId: packByCode[g.defaultPackCode] ?? null,
        sortOrder: i,
      },
      update: {
        name: g.name,
        description: g.description,
        defaultPackId: packByCode[g.defaultPackCode] ?? null,
        sortOrder: i,
      },
    });
  }

  await prisma.organizationSettings.upsert({
    where: { id: "msk" },
    create: {
      id: "msk",
      legalName: "MSK CREATION",
      tradeName: "MSK CREATION",
      defaultCurrency: "XOF",
      defaultVatRate: 18,
      frVatRate: 20,
      countryCode: "ML",
      timezone: "Africa/Bamako",
    },
    update: {
      defaultCurrency: "XOF",
      defaultVatRate: 18,
      frVatRate: 20,
    },
  });
}

async function seedSuperAdmin() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const tempPassword =
    process.env.BOOTSTRAP_TEMP_PASSWORD?.trim() ||
    `Msk-${Math.random().toString(36).slice(2, 10)}!A1`;

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existing = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN.email },
  });

  let authId = existing?.id;

  if (!authId) {
    const listed = await admin.auth.admin.listUsers({ perPage: 200 });
    const found = listed.data.users.find(
      (u) => u.email?.toLowerCase() === SUPER_ADMIN.email,
    );
    if (found) {
      authId = found.id;
      await admin.auth.admin.updateUserById(authId, {
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: SUPER_ADMIN.firstName,
          last_name: SUPER_ADMIN.lastName,
        },
      });
    } else {
      const created = await admin.auth.admin.createUser({
        email: SUPER_ADMIN.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: SUPER_ADMIN.firstName,
          last_name: SUPER_ADMIN.lastName,
        },
      });
      if (created.error || !created.data.user) {
        throw new Error(
          `Création Auth Super Admin: ${created.error?.message ?? "inconnu"}`,
        );
      }
      authId = created.data.user.id;
    }
  } else if (
    process.env.BOOTSTRAP_FORCE_PASSWORD?.trim() === "1" &&
    process.env.BOOTSTRAP_TEMP_PASSWORD?.trim()
  ) {
    // Jamais réécrire le MDP d’un compte existant sauf force explicite
    // (évite de casser la session après un seed Phase N).
    await admin.auth.admin.updateUserById(authId, {
      password: tempPassword,
      email_confirm: true,
    });
    console.log("⚠ BOOTSTRAP_FORCE_PASSWORD=1 → mot de passe Auth réécrit");
  }

  const otherSuper = await prisma.user.findFirst({
    where: { isSuperAdmin: true, NOT: { id: authId } },
  });
  if (otherSuper) {
    throw new Error(
      `Un Super Admin existe déjà (${otherSuper.email}). Impossible d'en créer un second.`,
    );
  }

  await prisma.user.upsert({
    where: { id: authId! },
    create: {
      id: authId!,
      email: SUPER_ADMIN.email,
      firstName: SUPER_ADMIN.firstName,
      lastName: SUPER_ADMIN.lastName,
      status: UserStatus.MUST_CHANGE_PASSWORD,
      isSuperAdmin: true,
      mustChangePassword: true,
      invitedAt: new Date(),
    },
    update: {
      email: SUPER_ADMIN.email,
      firstName: SUPER_ADMIN.firstName,
      lastName: SUPER_ADMIN.lastName,
      isSuperAdmin: true,
    },
  });

  const collabGroup = await prisma.group.findUnique({
    where: { code: "collaborateur" },
  });
  const directionGroup = await prisma.group.findUnique({
    where: { code: "direction" },
  });
  const adminPack = await prisma.permissionPack.findUnique({
    where: { code: "admin_plateforme" },
  });

  if (collabGroup) {
    await prisma.groupMember.upsert({
      where: {
        userId_groupId: { userId: authId!, groupId: collabGroup.id },
      },
      create: { userId: authId!, groupId: collabGroup.id },
      update: {},
    });
  }
  if (directionGroup) {
    await prisma.groupMember.upsert({
      where: {
        userId_groupId: { userId: authId!, groupId: directionGroup.id },
      },
      create: { userId: authId!, groupId: directionGroup.id },
      update: {},
    });
  }
  if (adminPack) {
    await prisma.userPack.upsert({
      where: {
        userId_packId: { userId: authId!, packId: adminPack.id },
      },
      create: { userId: authId!, packId: adminPack.id },
      update: {},
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: authId,
      action: "seed.super_admin",
      entityType: "user",
      entityId: authId,
      metadata: { email: SUPER_ADMIN.email },
    },
  });

  console.log("✓ Catalogue IAM seedé");
  console.log(`✓ Super Admin: ${SUPER_ADMIN.email}`);
  if (!existing) {
    console.log(`✓ Mot de passe temporaire (à changer à la 1ʳᵉ connexion): ${tempPassword}`);
  } else if (process.env.BOOTSTRAP_FORCE_PASSWORD?.trim() === "1") {
    console.log(`✓ Mot de passe forcé: ${tempPassword}`);
  } else {
    console.log(
      "✓ Mot de passe Auth inchangé (pour forcer: BOOTSTRAP_FORCE_PASSWORD=1 + BOOTSTRAP_TEMP_PASSWORD)",
    );
  }
}

async function seedPhase1Ged() {
  const year = new Date().getFullYear();
  const { ensureYearTree, ensureCollaboratorFolders } = await import(
    "../src/lib/ged/tree"
  );
  const { ensureGedBucket } = await import("../src/lib/ged/storage");

  try {
    await ensureGedBucket();
    console.log("✓ Bucket Storage `ged`");
  } catch (e) {
    console.warn("⚠ Bucket GED:", e instanceof Error ? e.message : e);
  }

  await ensureYearTree(year);
  console.log(`✓ Arborescence GED /${year}`);

  const brandRows = [
    {
      kind: "logo_white",
      label: "Logo blanc",
      publicPath: "/brand/logo-white.svg",
    },
    {
      kind: "mark_white",
      label: "Signe blanc",
      publicPath: "/brand/mark-white.svg",
    },
    {
      kind: "lockup_bloc",
      label: "Lockup bloc",
      publicPath: "/brand/lockup-bloc.png",
    },
    {
      kind: "lockup",
      label: "Lockup",
      publicPath: "/brand/lockup.png",
    },
  ];
  for (const a of brandRows) {
    await prisma.brandAsset.upsert({
      where: { kind: a.kind },
      create: a,
      update: { label: a.label, publicPath: a.publicPath, active: true },
    });
  }
  console.log("✓ Brand assets");

  const templates = [
    {
      code: "devis_standard",
      type: "DEVIS" as const,
      name: "Devis standard MSK",
      structureJson: { slots: ["header", "lines", "totals", "signature"] },
    },
    {
      code: "facture_standard",
      type: "FACTURE" as const,
      name: "Facture standard MSK",
      structureJson: { slots: ["header", "lines", "totals", "signature"] },
    },
  ];
  for (const t of templates) {
    await prisma.documentTemplate.upsert({
      where: { code: t.code },
      create: {
        code: t.code,
        type: t.type,
        name: t.name,
        structureJson: t.structureJson,
        active: true,
      },
      update: { name: t.name, active: true, structureJson: t.structureJson },
    });
  }
  console.log("✓ Gabarits devis / facture");

  // Organigramme équipe MSK (CDC §14bis) — ids stables via email lookup
  const team: {
    email: string | null;
    fullName: string;
    title: string;
    parentEmail: string | null;
    sortOrder: number;
  }[] = [
    {
      email: null,
      fullName: "Mathieu Diarra",
      title: "Fondateur",
      parentEmail: null,
      sortOrder: 0,
    },
    {
      email: null,
      fullName: "Isdalinia Boisseaux",
      title: "Co-fondatrice",
      parentEmail: null,
      sortOrder: 1,
    },
    {
      email: "a.guiro@mskcreation.net",
      fullName: "Amadou Samba Guiro",
      title: "Responsable Technique",
      parentEmail: null,
      sortOrder: 2,
    },
    {
      email: null,
      fullName: "Andile Boussari",
      title: "Chef de Projet",
      parentEmail: null,
      sortOrder: 10,
    },
    {
      email: null,
      fullName: "Yaye Bah",
      title: "Commerciale",
      parentEmail: null,
      sortOrder: 20,
    },
    {
      email: null,
      fullName: "Issiaka Yacouba Traoré",
      title: "Comptable",
      parentEmail: null,
      sortOrder: 30,
    },
  ];

  // Clear + recreate simple flat org (MVP lecture) — keep stable by fullName
  for (const member of team) {
    const user = member.email
      ? await prisma.user.findUnique({ where: { email: member.email } })
      : null;
    const existing = await prisma.orgNode.findFirst({
      where: { fullName: member.fullName },
    });
    if (existing) {
      await prisma.orgNode.update({
        where: { id: existing.id },
        data: {
          title: member.title,
          email: member.email,
          userId: user?.id ?? null,
          sortOrder: member.sortOrder,
        },
      });
    } else {
      await prisma.orgNode.create({
        data: {
          fullName: member.fullName,
          title: member.title,
          email: member.email,
          userId: user?.id ?? null,
          sortOrder: member.sortOrder,
        },
      });
    }
  }
  console.log("✓ Organigramme seedé");

  const guiro = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN.email },
  });
  if (guiro) {
    await ensureCollaboratorFolders(
      guiro.firstName,
      guiro.lastName,
      year,
      guiro.id,
    );
    console.log("✓ Dossier collaborateur Super Admin");
  }
}

async function main() {
  await seedCatalog();
  await seedSuperAdmin();
  await seedPhase1Ged();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
