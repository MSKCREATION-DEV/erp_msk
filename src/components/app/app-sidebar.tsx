import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/app/sidebar";

/**
 * Partie dynamique du shell (cookies / session).
 * Isolée dans <Suspense> pour ne pas bloquer loading.tsx des pages
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/loading#instant-loading-states
 */
export async function AppSidebar() {
  const user = await requireUser();
  return <Sidebar user={user} />;
}
