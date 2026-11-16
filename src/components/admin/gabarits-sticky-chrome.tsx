"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Chrome sticky Studio gabarits :
 * - bandeau pleine largeur (fond opaque + fuite padding main bouchée)
 * - offset CSS mesuré pour la colonne droite (`--gabarits-sticky-top`)
 *   afin qu’elle reste **sous** le bandeau, jamais dedans.
 */
export function GabaritsStickyChrome({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [stickyTopPx, setStickyTopPx] = useState(220);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const GAP_PX = 16;
    const update = () => {
      const height = el.getBoundingClientRect().height;
      setStickyTopPx(Math.max(160, Math.ceil(height + GAP_PX)));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      className="w-full min-w-0"
      style={
        {
          "--gabarits-sticky-top": `${stickyTopPx}px`,
        } as CSSProperties
      }
    >
      {/*
        Sticky dans le scroll de <main>. Sous-couche absolute = peinture opaque
        sur toute la largeur utile (y compris padding main / gaps), sans bleed.
      */}
      <div ref={headerRef} className="sticky top-0 z-20 -mt-5">
        {/*
          Sous-couche : couvre padding main (haut + latéral) pour zéro bleed.
          -top-5 = py-5 du <main> ; -mx = px du <main>.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-5 right-0 bottom-0 left-0 -mx-4 bg-[#F4F6F9] sm:-mx-6 xl:-mx-8"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-px -mx-4 h-3 bg-[#F4F6F9] sm:-mx-6 xl:-mx-8"
        />
        <div className="relative space-y-4 border-b border-msk-ink/6 bg-[#F4F6F9] pb-4 pt-5">
          {header}
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
