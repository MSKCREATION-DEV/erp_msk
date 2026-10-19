import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { UserStatus } from "@prisma/client";
import { normalizePersonKey } from "@/lib/crm/import/keep";

export type ImportUserDef = {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  status: UserStatus;
  packs: string[];
  groups: string[];
  isFounder: boolean;
  employeeType: "DIRIGEANT" | "SALARIE" | "STAGIAIRE" | "PRESTATAIRE";
};

export type UsersMapFile = {
  aliases: Record<string, ImportUserDef>;
};

let cached: UsersMapFile | null = null;

export function loadUsersMap(path?: string): UsersMapFile {
  if (cached && !path) return cached;
  const p =
    path ??
    join(process.cwd(), "scripts/crm-import/users.map.json");
  const raw = JSON.parse(readFileSync(p, "utf8")) as UsersMapFile;
  if (!path) cached = raw;
  return raw;
}

export function resolveAliasKey(
  hint: string | null | undefined,
  map: UsersMapFile,
): string | null {
  if (!hint) return null;
  const key = normalizePersonKey(hint);
  if (map.aliases[key]) return key;
  // match first name start
  for (const k of Object.keys(map.aliases)) {
    if (key.startsWith(k) || k.startsWith(key)) return k;
  }
  return null;
}

export function resolveUserDef(
  hint: string | null | undefined,
  map: UsersMapFile,
): ImportUserDef | null {
  const key = resolveAliasKey(hint, map);
  if (!key) return null;
  return map.aliases[key] ?? null;
}
