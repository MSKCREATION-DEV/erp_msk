/**
 * Fixtures CRM réalistes mais marquées [TEST] — jamais de vrais clients.
 * Usage: node --env-file=.env.local scripts/seed-crm-test-fixtures.mjs
 * Purge: PURGE=1 node --env-file=.env.local scripts/seed-crm-test-fixtures.mjs
 */
import { PrismaClient, CrmPipelineStage, CrmSource } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const PREFIX = "[TEST]";

const FIXTURES = [
  {
    org: "Savane Déco SARL",
    sector: "Décoration",
    city: "Bamako",
    contact: { first: "Awa", last: "Diarra", job: "Gérante", phone: "+223 00 00 00 01" },
    stage: "NOUVEAU",
    source: "INSTAGRAM",
    budget: 150_000,
    next: "Premier message IG",
  },
  {
    org: "Nigerien Tech Hub",
    sector: "Tech",
    city: "Bamako",
    contact: { first: "Ibrahim", last: "Touré", job: "CEO", phone: "+223 00 00 00 02" },
    stage: "CONTACTE",
    source: "LINKEDIN",
    budget: 400_000,
    next: "Relance LinkedIn J+3",
  },
  {
    org: "Boulangerie Du Fleuve",
    sector: "Agroalimentaire",
    city: "Ségou",
    contact: { first: "Fatou", last: "Keita", job: "Responsable com", phone: "+223 00 00 00 03" },
    stage: "QUALIFICATION",
    source: "WHATSAPP",
    budget: 100_000,
    next: "Qualifier budget RS",
  },
  {
    org: "Clinique Horizon",
    sector: "Santé",
    city: "Bamako",
    contact: { first: "Dr.", last: "Sangaré", job: "Directeur", phone: "+223 00 00 00 04" },
    stage: "INTERESSE",
    source: "RECOMMANDATION",
    budget: 800_000,
    next: "Envoyer devis site vitrine",
  },
  {
    org: "Mode Ankara Shop",
    sector: "Mode",
    city: "Bamako",
    contact: { first: "Mariam", last: "Coulibaly", job: "Fondatrice", phone: "+223 00 00 00 05" },
    stage: "DEVIS_ENVOYE",
    source: "INSTAGRAM",
    budget: 250_000,
    next: "Relance devis 48h",
  },
  {
    org: "Hotel Sahel View",
    sector: "Hôtellerie",
    city: "Mopti",
    contact: { first: "Oumar", last: "Traoré", job: "Manager", phone: "+223 00 00 00 06" },
    stage: "GAGNE",
    source: "GOOGLE",
    budget: 1_200_000,
    next: null,
  },
  {
    org: "Garage Rapid Auto",
    sector: "Automobile",
    city: "Bamako",
    contact: { first: "Moussa", last: "Diallo", job: "Patron", phone: "+223 00 00 00 07" },
    stage: "PERDU",
    source: "TERRAIN",
    budget: 80_000,
    next: null,
  },
  {
    org: "École Baobab",
    sector: "Éducation",
    city: "Kati",
    contact: { first: "Aminata", last: "Sissoko", job: "Directrice", phone: "+223 00 00 00 08" },
    stage: "INTERESSE",
    source: "EMAIL",
    budget: 350_000,
    next: "Devis présence digitale",
  },
];

async function resolveOwnerId() {
  const email = process.env.FIXTURE_OWNER_EMAIL?.trim();
  if (email) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) return u.id;
  }
  const any = await prisma.user.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (!any) throw new Error("Aucun user ACTIVE pour owner fixtures");
  return any.id;
}

async function purge() {
  const orgs = await prisma.crmOrganization.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = orgs.map((o) => o.id);
  if (ids.length === 0) {
    console.log("Rien à purger.");
    return;
  }
  await prisma.crmOpportunity.deleteMany({
    where: { organizationId: { in: ids } },
  });
  await prisma.crmOrganization.deleteMany({ where: { id: { in: ids } } });
  console.log(`✓ Purge ${ids.length} orgs ${PREFIX}`);
}

async function main() {
  if (process.env.PURGE === "1") {
    await purge();
    return;
  }

  const ownerId = await resolveOwnerId();
  console.log("Owner fixtures:", ownerId);

  const offer = await prisma.catalogOffer.findFirst({
    where: { active: true, sku: { contains: "RS" } },
  });

  let n = 0;
  for (const f of FIXTURES) {
    const name = `${PREFIX} ${f.org}`;
    const normalizedName = name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    const existing = await prisma.crmOrganization.findFirst({
      where: { normalizedName },
    });
    if (existing) {
      console.log("skip", name);
      continue;
    }

    const local = `${f.contact.first}.${f.contact.last}`
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");
    const org = await prisma.crmOrganization.create({
      data: {
        name,
        normalizedName,
        sector: f.sector,
        city: f.city,
        country: "ML",
        notes: "Fixture CRM — données de test MSK (ne pas traiter comme réel).",
        source: f.source,
        ownerId,
        createdById: ownerId,
        contacts: {
          create: {
            firstName: f.contact.first,
            lastName: f.contact.last,
            jobTitle: f.contact.job,
            phone: f.contact.phone,
            email: `${local}@test.msk.local`,
            isPrimary: true,
          },
        },
      },
    });

    const followUpAt =
      f.stage !== "GAGNE" && f.stage !== "PERDU"
        ? new Date(Date.now() + (f.stage === "INTERESSE" ? -2 : 2) * 864e5)
        : null;

    const deal = await prisma.crmOpportunity.create({
      data: {
        organizationId: org.id,
        title: name,
        stage: f.stage,
        source: f.source,
        budgetXof: f.budget,
        nextAction: f.next,
        followUpAt,
        catalogOfferId: offer?.id ?? null,
        ownerId,
        createdById: ownerId,
        wonAt: f.stage === "GAGNE" ? new Date() : null,
        lostAt: f.stage === "PERDU" ? new Date() : null,
        lossReason: f.stage === "PERDU" ? "BUDGET" : null,
        lastActivityAt: new Date(),
      },
    });

    if (offer) {
      await prisma.crmOpportunityOffer.create({
        data: {
          opportunityId: deal.id,
          catalogOfferId: offer.id,
          config: { networks: ["instagram", "tiktok"] },
          sortOrder: 0,
        },
      });
    }

    if (followUpAt) {
      await prisma.crmTask.create({
        data: {
          organizationId: org.id,
          opportunityId: deal.id,
          title: f.next || `Relance ${name}`,
          dueAt: followUpAt,
          assigneeId: ownerId,
          createdById: ownerId,
        },
      });
    }

    n += 1;
    console.log("✓", name, f.stage);
  }
  console.log(`Done — ${n} fixtures ${PREFIX}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
