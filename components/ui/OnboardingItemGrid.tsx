import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

export interface OnboardingItem {
  label: string;
  done: boolean;
  href: string;
  icon: LucideIcon;
}

interface OnboardingItemGridProps {
  items: OnboardingItem[];
  columns?: 2 | 3;
}

/**
 * Gedeelde checklist-itemgrid — hergebruikt door OnboardingChecklist (patiënt),
 * WelcomePanel en EmployeeWelcomePanel (Practice Portal), voorheen 3x los
 * gedupliceerd.
 */
export function OnboardingItemGrid({ items, columns = 2 }: OnboardingItemGridProps) {
  return (
    <div className={`grid grid-cols-1 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-gray-50"
          style={{ borderColor: "#e8e5df" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: item.done ? "#f0fdf4" : "#f8f7f4" }}
          >
            {item.done ? <Check size={15} style={{ color: "#16a34a" }} /> : <item.icon size={15} className="text-gray-400" />}
          </div>
          <span className={item.done ? "text-sm text-gray-400 line-through" : "text-sm text-gray-700 font-medium"}>
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
