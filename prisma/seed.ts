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
import { MSK_TEAM } from "../src/lib/org/team";
import { CATALOG_OFFERS_SEED } from "../src/lib/catalogue/offers-seed";
import { CRM_SCRIPTS_SEED } from "../src/lib/crm/scripts-seed";

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

/**
 * ABSOLU — compte déjà activé (ACTIVE) : jamais toucher au MDP Auth.
 * MDP Auth uniquement à createUser (compte neuf). Voir auth-password-safety.mdc.
 */
function isActivatedAccount(u: {
  status: UserStatus;
  mustChangePassword: boolean;
  activatedAt: Date | null;
}): boolean {
  return (
    u.status === UserStatus.ACTIVE ||
    (!u.mustChangePassword && u.activatedAt != null)
  );
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
  let passwordJustSet = false;

  if (!authId) {
    const listed = await admin.auth.admin.listUsers({ perPage: 200 });
    const found = listed.data.users.find(
      (u) => u.email?.toLowerCase() === SUPER_ADMIN.email,
    );
    if (found) {
      // Auth existe déjà → lier sans JAMAIS réécrire le MDP
      authId = found.id;
      await admin.auth.admin.updateUserById(authId, {
        email_confirm: true,
        user_metadata: {
          first_name: SUPER_ADMIN.firstName,
          last_name: SUPER_ADMIN.lastName,
        },
      });
      console.log(
        "ℹ Auth Super Admin déjà présent — MDP conservé (pas de reset seed)",
      );
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
      passwordJustSet = true;
    }
  } else if (existing && isActivatedAccount(existing)) {
    // Compte ACTIVÉ → interdit absolu de toucher au MDP (ignore FORCE)
    if (
      process.env.BOOTSTRAP_FORCE_PASSWORD?.trim() === "1" ||
      process.env.BOOTSTRAP_TEMP_PASSWORD?.trim()
    ) {
      console.log(
        "⛔ Compte ACTIVE — MDP Auth NON modifié (BOOTSTRAP_* ignoré)",
      );
    } else {
      console.log("✓ Compte ACTIVE — MDP Auth conservé");
    }
  } else if (
    process.env.BOOTSTRAP_FORCE_PASSWORD?.trim() === "1" &&
    process.env.BOOTSTRAP_TEMP_PASSWORD?.trim()
  ) {
    // Uniquement comptes non activés (invite / must change) + FORCE explicite
    await admin.auth.admin.updateUserById(authId, {
      password: tempPassword,
      email_confirm: true,
    });
    passwordJustSet = true;
    console.log(
      "⚠ BOOTSTRAP_FORCE_PASSWORD=1 sur compte non activé → MDP temporaire réécrit",
    );
  } else if (process.env.BOOTSTRAP_TEMP_PASSWORD?.trim()) {
    console.log(
      "ℹ BOOTSTRAP_TEMP_PASSWORD ignoré (compte existant). Force seulement si non ACTIVE + BOOTSTRAP_FORCE_PASSWORD=1",
    );
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
  if (passwordJustSet) {
    console.log(
      `✓ Mot de passe temporaire (à changer à la 1ʳᵉ connexion): ${tempPassword}`,
    );
  } else {
    console.log("✓ Mot de passe Auth inchangé (compte déjà provisionné / activé)");
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
      structureJson: {
        layout: "msk_v1",
        slots: [
          "logo_header",
          "doc_title",
          "parties",
          "mission",
          "lines_table",
          "totals",
          "legal_footer",
        ],
        ref: "gabarit_msk_v1_devis",
      },
    },
    {
      code: "facture_standard",
      type: "FACTURE" as const,
      name: "Facture standard MSK",
      structureJson: {
        layout: "msk_v1",
        slots: [
          "logo_header",
          "doc_title",
          "parties",
          "lines_table",
          "iban",
          "totals",
          "legal_footer",
        ],
        ref: "gabarit_msk_v1_facture",
      },
    },
    {
      code: "contrat_travail_msk",
      type: "CONTRAT_TRAVAIL" as const,
      name: "Contrat de travail MSK",
      structureJson: {
        layout: "msk_rh_v1",
        slots: ["header", "parties", "articles", "signatures", "footer"],
        ref: "docs/Contrat de Travail",
      },
    },
    {
      code: "contrat_stage_msk",
      type: "CONTRAT_STAGE" as const,
      name: "Contrat de stage MSK",
      structureJson: {
        layout: "msk_rh_v1",
        slots: ["header", "parties", "articles", "signatures", "footer"],
        ref: "docs/Contrat de Stage",
      },
    },
    {
      code: "contrat_presta_msk",
      type: "CONTRAT_PRESTA" as const,
      name: "Contrat de prestation MSK",
      structureJson: {
        layout: "msk_rh_v1",
        slots: ["header", "parties", "articles", "signatures", "footer"],
        ref: "docs/CONTRAT DE PRESTATION",
      },
    },
    {
      code: "attestation_stage_msk",
      type: "ATTESTATION_STAGE" as const,
      name: "Attestation de stage MSK",
      structureJson: {
        layout: "msk_rh_v1",
        slots: ["header", "certificat", "signatures", "footer"],
        ref: "docs/ATTESTATION DE STAGE",
      },
    },
    {
      code: "reglement_interieur_msk",
      type: "REGLEMENT_INTERIEUR" as const,
      name: "Règlement intérieur — accusé MSK",
      structureJson: {
        layout: "msk_rh_v1",
        slots: ["header", "articles", "accuse", "signatures", "footer"],
        ref: "docs/Règlement intérieur",
      },
    },
    {
      code: "solde_tout_compte_msk",
      type: "SOLDE_TOUT_COMPTE" as const,
      name: "Solde de tout compte MSK",
      structureJson: {
        layout: "msk_rh_v1",
        slots: ["header", "recu", "signatures", "footer"],
        ref: "docs/Solde de tout compte",
      },
    },
    {
      code: "fiche_paie_msk",
      type: "FICHE_PAIE" as const,
      name: "Fiche de paie (indicative) MSK",
      structureJson: {
        layout: "msk_rh_v1",
        slots: ["header", "infos", "cotisations", "net", "footer"],
        ref: "docs/Fiche de Paie",
        note: "Phase 5 finalisera INPS officiel",
      },
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
  console.log("✓ Gabarits devis / facture / RH");

  const inpsCount = await prisma.rhInpsSettings.count();
  if (inpsCount === 0) {
    const { DEFAULT_INPS_RATES, INPS_PROVISIONAL_NOTE } = await import(
      "../src/lib/paie/rates"
    );
    await prisma.rhInpsSettings.create({
      data: {
        effectiveFrom: new Date("2026-01-01"),
        ratesJson: DEFAULT_INPS_RATES,
        note: INPS_PROVISIONAL_NOTE,
      },
    });
    console.log("✓ Paramètres INPS provisoires");
  } else {
    console.log("✓ Paramètres INPS (déjà présents)");
  }

  // Organigramme équipe MSK (slide 05 + assets public/team)
  const idByKey = new Map<string, string>();

  for (const member of MSK_TEAM) {
    const user = member.email
      ? await prisma.user.findUnique({ where: { email: member.email } })
      : null;
    const existing = await prisma.orgNode.findFirst({
      where: { fullName: member.fullName },
    });
    const data = {
      title: member.title,
      email: member.email,
      photoPath: member.photoPath,
      userId: user?.id ?? null,
      sortOrder: member.sortOrder,
    };
    if (existing) {
      const updated = await prisma.orgNode.update({
        where: { id: existing.id },
        data,
      });
      idByKey.set(member.key, updated.id);
    } else {
      const created = await prisma.orgNode.create({
        data: { fullName: member.fullName, ...data },
      });
      idByKey.set(member.key, created.id);
    }
  }

  for (const member of MSK_TEAM) {
    const id = idByKey.get(member.key);
    if (!id) continue;
    const parentId = member.parentKey
      ? (idByKey.get(member.parentKey) ?? null)
      : null;
    await prisma.orgNode.update({
      where: { id },
      data: { parentId },
    });
  }

  const keptNames = MSK_TEAM.map((m) => m.fullName);
  await prisma.orgNode.deleteMany({
    where: { fullName: { notIn: keptNames } },
  });
  console.log(`✓ Organigramme seedé (${MSK_TEAM.length} nœuds + photos)`);

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

async function seedPhase2CatalogueCrm() {
  for (const offer of CATALOG_OFFERS_SEED) {
    const { highlights: _highlights, ...data } = offer;
    await prisma.catalogOffer.upsert({
      where: { sku: data.sku },
      create: data,
      update: {
        name: data.name,
        description: data.description,
        pillar: data.pillar,
        billing: data.billing,
        priceXof: data.priceXof,
        priceEurHint: data.priceEurHint,
        sortOrder: data.sortOrder,
        active: true,
      },
    });
  }
  console.log(`✓ Catalogue ${CATALOG_OFFERS_SEED.length} offres`);

  for (const script of CRM_SCRIPTS_SEED) {
    await prisma.crmScript.upsert({
      where: { code: script.code },
      create: script,
      update: {
        channel: script.channel,
        title: script.title,
        body: script.body,
        tips: script.tips,
        sortOrder: script.sortOrder,
        active: true,
      },
    });
  }
  console.log(`✓ CRM scripts ${CRM_SCRIPTS_SEED.length}`);
}

async function main() {
  await seedCatalog();
  await seedSuperAdmin();
  await seedPhase1Ged();
  await seedPhase2CatalogueCrm();
  const { seedPhase6Compta } = await import("./seed-cpt");
  await seedPhase6Compta(prisma);
  const { seedPhase4Rh } = await import("./seed-rh");
  await seedPhase4Rh(prisma);
  const { seedTeamUsers } = await import("./seed-team-users");
  await seedTeamUsers(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
