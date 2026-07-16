"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
}

interface MenuPos {
  top?: number;
  bottom?: number;
  left: number;
}

const MENU_WIDTH = 208;
const ITEM_HEIGHT = 36;

/**
 * Kebab-menu met acties, portal-gerenderd naar document.body zodat het menu
 * nooit wordt afgekapt door een overflow-hidden voorouder (bv. een
 * tabelkaart) — zelfde patroon als DatePicker. Klapt automatisch omhoog open
 * als er onder de trigger niet genoeg ruimte meer is.
 */
export function ActionMenu({ items }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos>({ top: 0, left: 0 });
  const [mounted] = useState(() => typeof window !== "undefined");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const estimatedHeight = items.length * ITEM_HEIGHT + 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const left = Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8);

      if (spaceBelow >= estimatedHeight + 8 || spaceBelow >= spaceAbove) {
        setPos({ top: rect.bottom + 4, left });
      } else {
        setPos({ bottom: window.innerHeight - rect.top + 4, left });
      }
    }
    setOpen(true);
  }

  const menu = (
    <div
      ref={menuRef}
      className="text-sm"
      style={{
        position: "fixed",
        top: pos.top,
        bottom: pos.bottom,
        left: pos.left,
        width: MENU_WIDTH,
        zIndex: 9999,
        background: "#ffffff",
        border: "1px solid #e8e5df",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        overflow: "hidden",
        padding: "4px 0",
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          className="w-full text-left px-4 py-2 hover:bg-gray-50"
          style={item.danger ? { color: "#dc2626" } : undefined}
          onClick={() => {
            setOpen(false);
            item.onClick();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
      >
        <MoreVertical size={16} />
      </button>
      {mounted && open && createPortal(menu, document.body)}
    </div>
  );
}
