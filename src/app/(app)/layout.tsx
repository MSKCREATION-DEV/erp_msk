import { Suspense } from "react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { SidebarSkeleton } from "@/components/app/sidebar-skeleton";
import { Topbar } from "@/components/app/topbar";
import { NavigationProgress } from "@/components/ui/navigation-progress";

/**
 * Shell authentifié — navigation instantanée.
 *
 * Important (doc Next.js loading.js) :
 * Si le layout `await` cookies()/session, la nav **bloque** et `loading.tsx`
 * ne s’affiche pas. On isole donc la session sidebar dans <Suspense>.
 * Auth route : middleware + requireUser() dans chaque page.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/loading#instant-loading-states
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/layout#interaction-with-loadingjs
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavigationProgress />
      <div className="flex h-screen overflow-hidden bg-[#F4F6F9]">
        <div className="z-20 hidden h-full shrink-0 md:flex">
          <Suspense fallback={<SidebarSkeleton />}>
            <AppSidebar />
          </Suspense>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="w-full min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-6 xl:px-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
