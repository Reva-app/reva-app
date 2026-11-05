import type { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

export interface StatStripItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  /** Toelichting onder het cijfer (alleen op de grote kaart vanaf 768px). */
  subtitle?: string;
}

/**
 * Kerncijfers boven een lijst. Vanaf 768px (md) de gewone StatCards in een
 * raster; op telefoon één compacte, horizontaal scrollbare strook, zodat de
 * lijst zelf niet onder de vouw verdwijnt.
 */
export function StatStrip({ items }: { items: StatStripItem[] }) {
  return (
    <>
      <div className="md:hidden -mx-4 px-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {items.map((item) => (
          <div
            key={item.label}
            className="shrink-0 rounded-xl border px-3 py-2 flex items-baseline gap-1.5"
            style={{ background: "#ffffff", borderColor: "#e8e5df" }}
          >
            <span className="text-base font-semibold text-gray-900 tabular-nums">{item.value}</span>
            <span className="text-xs text-gray-500 whitespace-nowrap">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="hidden md:grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} icon={item.icon} iconColor={item.iconColor} subtitle={item.subtitle} />
        ))}
      </div>
    </>
  );
}
