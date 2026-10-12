import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config({ path: ".env" });

const u = process.env.DATABASE_URL ?? "";
console.log("DATABASE_URL set:", Boolean(u));
try {
  const normalized = u.replace(/^prisma\+?/, "").replace(/^postgresql:/, "http:");
  console.log("DB host:", new URL(normalized).host);
} catch {
  console.log("DB host: (parse failed)");
}
console.log("DIRECT_URL set:", Boolean(process.env.DIRECT_URL));
console.log("SUPABASE URL set:", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL));

const p = new PrismaClient();
const t0 = Date.now();
try {
  await Promise.race([
    p.$queryRaw`SELECT 1 as ok`,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("timeout 20s")), 20_000),
    ),
  ]);
  console.log("DB OK in", Date.now() - t0, "ms");
} catch (e) {
  console.error("DB FAIL:", e.message);
  process.exitCode = 1;
} finally {
  await p.$disconnect();
}
