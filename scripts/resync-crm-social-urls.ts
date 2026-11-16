/**
 * One-shot : re-normalise les URLs réseaux des organisations CRM
 * (anciens sanitize / handles incomplets). Ne efface jamais une URL valide.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import {
  type SocialField,
  SOCIAL_NETWORKS,
  remigrateSocialField,
  socialUrlsEquivalent,
} from "../src/lib/crm/social";

const FIELDS = SOCIAL_NETWORKS.map((n) => n.field);

async function main() {
  const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!url) throw new Error("DATABASE_URL manquant");
  const pool = new pg.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const stats = {
    orgsScanned: 0,
    fieldsSeen: 0,
    updated: 0,
    unchanged: 0,
    unmappable: 0,
    skippedWouldNull: 0,
  };

  const samples: { org: string; field: SocialField; from: string; to: string }[] =
    [];

  try {
    const orgs = await prisma.crmOrganization.findMany({
      where: {
        OR: FIELDS.map((f) => ({ [f]: { not: null } })),
      },
      select: {
        id: true,
        name: true,
        instagramUrl: true,
        linkedinUrl: true,
        tiktokUrl: true,
        facebookUrl: true,
        whatsappUrl: true,
      },
    });

    stats.orgsScanned = orgs.length;

    for (const org of orgs) {
      const patch: Partial<Record<SocialField, string>> = {};
      for (const field of FIELDS) {
        const current = org[field];
        if (current == null || !String(current).trim()) continue;
        stats.fieldsSeen += 1;

        const res = remigrateSocialField(field, String(current));
        if (!res.ok) {
          stats.unmappable += 1;
          console.warn(
            `⚠ ${org.name} · ${field} : ${res.error} (conservé : ${current})`,
          );
          continue;
        }
        if (res.url == null) {
          stats.skippedWouldNull += 1;
          continue;
        }
        if (socialUrlsEquivalent(String(current), res.url)) {
          stats.unchanged += 1;
          continue;
        }

        patch[field] = res.url;
        stats.updated += 1;
        if (samples.length < 12) {
          samples.push({
            org: org.name,
            field,
            from: String(current),
            to: res.url,
          });
        }
      }

      if (Object.keys(patch).length > 0) {
        await prisma.crmOrganization.update({
          where: { id: org.id },
          data: patch,
        });
      }
    }

    console.log("\n── Resync URLs sociales CRM ──");
    console.log("Organisations avec au moins une URL :", stats.orgsScanned);
    console.log("Champs non nuls parcourus :", stats.fieldsSeen);
    console.log("Mis à jour :", stats.updated);
    console.log("Inchangés (déjà canoniques) :", stats.unchanged);
    console.log("Non corrigeables (conservés) :", stats.unmappable);
    console.log("Ignorés (vider le champ refusé) :", stats.skippedWouldNull);
    if (samples.length > 0) {
      console.log("\nExemples :");
      for (const s of samples) {
        console.log(`  ${s.org} · ${s.field}`);
        console.log(`    ${s.from}`);
        console.log(`    → ${s.to}`);
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});