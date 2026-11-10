import { config } from "dotenv";
import { createPrisma } from "@/lib/create-prisma";
import { seedSuiviTampon } from "../prisma/seed-suivi";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = createPrisma({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  max: 1,
});

async function main() {
  await seedSuiviTampon(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
