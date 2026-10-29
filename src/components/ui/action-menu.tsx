"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

/**
 * Menu d’actions secondaires (⋯).
 * Panneau en `createPortal(document.body)` + `position: fixed` pour ne pas
 * être découpé par `overflow` / cellules sticky des tableaux.
 */
export function ActionMenu({
  items,
  label = "Autres actions",
  align = "right",
  className,
}: {
  items: ActionMenuItem[];
  label?: string;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menu = menuRef.current;
      const menuH = menu?.offsetHeight ?? 120;
      const menuW = menu?.offsetWidth ?? 176;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuH + gap && rect.top > menuH + gap;
      const top = openUp
        ? Math.max(8, rect.top - gap - menuH)
        : Math.min(window.innerHeight - 8 - menuH, rect.bottom + gap);
      let left = align === "right" ? rect.right - menuW : rect.left;
      left = Math.min(Math.max(8, left), window.innerWidth - menuW - 8);
      setCoords({ top, left });
    }

    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align, items.length]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className={cn("inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-msk-ink/10 bg-white text-msk-ink/55 transition",
          "hover:border-msk-ink/20 hover:bg-msk-chalk hover:text-msk-ink",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/30",
          open && "border-msk-blue/30 bg-msk-blue/5 text-msk-blue",
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>

      {open && mounted
        ? createPortal(
            <ul
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              style={
                coords
                  ? { top: coords.top, left: coords.left }
                  : { top: 0, left: 0, visibility: "hidden" as const }
              }
              className="fixed z-50 min-w-44 overflow-hidden rounded-xl border border-msk-ink/8 bg-white py-1 shadow-lg shadow-msk-ink/12"
            >
              {items.map((item) => (
                <li key={item.id} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.disabled) return;
                      setOpen(false);
                      item.onSelect();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition",
                      "focus-visible:outline-none focus-visible:bg-msk-chalk",
                      item.disabled
                        ? "cursor-not-allowed text-msk-ink/30"
                        : item.tone === "danger"
                          ? "text-msk-coral hover:bg-msk-coral/5"
                          : "text-msk-ink/80 hover:bg-msk-chalk hover:text-msk-ink",
                    )}
                  >
                    {item.icon ? (
                      <span className="shrink-0 opacity-70" aria-hidden>
                        {item.icon}
                      </span>
                    ) : null}
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
