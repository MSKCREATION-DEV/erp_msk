"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/**
 * Navigation mobile — drawer gauche réutilisant le contenu Sidebar (passé en children).
 * Visible uniquement sous `md` ; ferme automatiquement au changement de route.
 */
export function MobileNav({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className={cn("md:hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-msk-ink/10 text-msk-ink/70 transition hover:bg-msk-chalk hover:text-msk-ink"
        aria-label="Ouvrir le menu de navigation"
        data-testid="mobile-nav-trigger"
      >
        <Menu className="h-4.5 w-4.5" aria-hidden />
      </button>

      <Drawer open={open} onOpenChange={setOpen} direction="left">
        <DrawerContent
          showClose
          className="!w-56 !max-w-[min(100vw,17rem)] border-r border-msk-ink/7 p-0 sm:!max-w-[17rem]"
          data-testid="mobile-nav-drawer"
        >
          <DrawerTitle className="sr-only">Navigation principale</DrawerTitle>
          <div className="flex h-full min-h-0 flex-col">{children}</div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
