import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

/**
 * Shell authentifié.
 * - Pas de `force-dynamic` explicite : cookies Auth suffisent à dynamiser.
 * - `loading.tsx` frère → Suspense sur `children` : la sidebar reste visible
 *   pendant le fetch RSC de la page (nav soft non bloquante).
 * - ConfirmProvider : modales de confirmation (delete, logout, …).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <ConfirmProvider>
      <div className="flex h-screen overflow-hidden bg-[#F4F6F9]">
        <div className="z-20 hidden h-full shrink-0 md:flex">
          <Sidebar user={user} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="w-full min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-6 xl:px-8">
            {children}
          </main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
