import { mskEmail } from "@/lib/org/team";

/** E-mails jamais archivés / jamais bannis lors d’une purge users. */
export function keepEmails(extraTestEmail?: string | null): Set<string> {
  const set = new Set(
    [
      "a.guiro@mskcreation.net",
      mskEmail("Mathieu Diarra"),
      mskEmail("Andile Boussari"),
      mskEmail("Isdalinia Boisseaux"),
      extraTestEmail?.trim().toLowerCase() ||
        process.env.CRM_KEEP_TEST_EMAIL?.trim().toLowerCase() ||
        "test.guiro@test.com",
    ]
      .map((e) => e.toLowerCase())
      .filter(Boolean),
  );
  return set;
}

/** Alias Excel (prénom) → clé users.map.json. */
export function normalizePersonKey(raw: string): string {
  const s = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .trim();
  if (s.startsWith("mathieu")) return "mathieu";
  if (s.startsWith("madina")) return "madina";
  if (s.startsWith("fatou")) return "fatoumata";
  if (s.startsWith("abdoul")) return "abdoulaye";
  if (s.startsWith("yaye")) return "yaye";
  return s;
}
