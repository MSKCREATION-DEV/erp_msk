/** Présence des variables (sans exposer les valeurs). */
export function envStatus() {
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "NEXT_PUBLIC_APP_URL",
  ] as const;

  return keys.map((key) => ({
    key,
    configured: Boolean(process.env[key]?.trim()),
  }));
}
