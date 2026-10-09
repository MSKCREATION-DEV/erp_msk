import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

/**
 * Shell authentifié.
 * - Pas de `force-dynamic` explicite : cookies Auth suffisent à dynamiser.
 * - `loading.tsx` frère → Suspense sur `children` : la sidebar reste visible
 *   pendant le fetch RSC de la page (nav soft non bloquante).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-[#F4F6F9]">
      <div className="sticky top-0 z-20 hidden h-screen md:flex">
        <Sidebar user={user} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="w-full min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-6 xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
