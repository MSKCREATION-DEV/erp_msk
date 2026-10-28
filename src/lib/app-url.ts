/**
 * URL publique canonique pour e-mails / CTA.
 * Ignore localhost et les previews Vercel (`*-git-*`, `*-projects.vercel.app`).
 */
export function publicAppBaseUrl(): string {
  const candidates = [
    process.env.EMAIL_CTA_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];
  for (const raw of candidates) {
    const u = raw?.trim().replace(/\/$/, "");
    if (!u) continue;
    if (u.includes("localhost") || u.includes("127.0.0.1")) continue;
    try {
      const host = new URL(u).hostname.toLowerCase();
      if (
        host.endsWith(".vercel.app") &&
        host !== "erp-msk.vercel.app"
      ) {
        continue;
      }
      return u;
    } catch {
      continue;
    }
  }
  return "https://erp-msk.vercel.app";
}
