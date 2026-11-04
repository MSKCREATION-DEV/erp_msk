/**
 * Client Prisma 7 pour scripts Node (.mjs).
 * Préférer : `node --import tsx scripts/….mjs`
 * (tsx résout le client généré + alias `@/`).
 */
import { config } from "dotenv";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });
config({ path: ".env" });

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const createMod = await import(
  pathToFileURL(resolve(root, "src/lib/create-prisma.ts")).href
);
const generated = await import(
  pathToFileURL(resolve(root, "src/generated/prisma/client.ts")).href
);

export const prisma = createMod.createPrisma({ max: 1 });
export const PrismaClient = generated.PrismaClient;
export const Prisma = generated.Prisma;
export const CrmTaskStatus = generated.CrmTaskStatus;
export const UserStatus = generated.UserStatus;
export const DocStatus = generated.DocStatus;
export const RhLeaveStatus = generated.RhLeaveStatus;
export const RhAbsenceStatus = generated.RhAbsenceStatus;
