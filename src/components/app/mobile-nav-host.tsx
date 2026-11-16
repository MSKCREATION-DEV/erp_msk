import { requireUser } from "@/lib/auth/session";
import { resolveAvatarUrlForUserId } from "@/lib/rh/avatar-url";
import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";

/**
 * Host serveur : session + Sidebar dans le drawer mobile.
 * Isolé sous Suspense dans la Topbar (ne bloque pas loading.tsx).
 */
export async function MobileNavHost() {
  const user = await requireUser();
  const avatarUrl = await resolveAvatarUrlForUserId(user.id);
  return (
    <MobileNav>
      <Sidebar user={user} avatarUrl={avatarUrl} variant="drawer" />
    </MobileNav>
  );
}
