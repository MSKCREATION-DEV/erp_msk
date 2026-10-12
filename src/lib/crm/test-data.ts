/** Préfixe obligatoire des entreprises de fixtures (jamais de vrais clients). */
export const TEST_ORG_PREFIX = "[TEST]";

export function isTestOrgName(name: string): boolean {
  return name.trim().toUpperCase().startsWith(TEST_ORG_PREFIX);
}

export function testOrgName(label: string): string {
  const clean = label.replace(/^\[TEST\]\s*/i, "").trim();
  return `${TEST_ORG_PREFIX} ${clean}`;
}

export const TEST_EMAIL_DOMAIN = "test.msk.local";

export function testEmail(local: string): string {
  return `${local.replace(/[^a-z0-9._-]/gi, ".")}@${TEST_EMAIL_DOMAIN}`;
}
