/**
 * Nettoie les contacts importés avec placeholders Excel (`//`, `—`, etc.).
 *
 * Usage: npx tsx --env-file=.env.local scripts/crm-import/repair-contacts.ts
 */
import { PrismaClient } from "@prisma/client";
import { isJunkPersonToken } from "../../src/lib/crm/contact-label";

const prisma = new PrismaClient();

async function main() {
  const contacts = await prisma.crmContact.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      phone: true,
      email: true,
    },
  });

  let cleaned = 0;
  for (const c of contacts) {
    const firstJunk = isJunkPersonToken(c.firstName);
    const lastJunk = isJunkPersonToken(c.lastName);
    const jobJunk = c.jobTitle != null && isJunkPersonToken(c.jobTitle);
    const phoneJunk = c.phone != null && isJunkPersonToken(c.phone);
    const emailJunk = c.email != null && isJunkPersonToken(c.email);

    if (!firstJunk && !lastJunk && !jobJunk && !phoneJunk && !emailJunk) {
      continue;
    }

    await prisma.crmContact.update({
      where: { id: c.id },
      data: {
        firstName: firstJunk ? "—" : c.firstName.trim(),
        lastName: lastJunk ? "—" : c.lastName.trim(),
        jobTitle: jobJunk ? null : c.jobTitle?.trim() || null,
        phone: phoneJunk ? null : c.phone?.trim() || null,
        email: emailJunk ? null : c.email?.trim() || null,
      },
    });
    cleaned += 1;
  }

  console.log(`Contacts nettoyés : ${cleaned} / ${contacts.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
