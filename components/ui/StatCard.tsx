import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor = "#e8632a",
  accent,
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx("rounded-2xl border p-5", className)}
      style={
        accent
          ? {
              background: "#1c1c1e",
              borderColor: "transparent",
            }
          : {
              background: "#ffffff",
              borderColor: "#e8e5df",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }
      }
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: accent ? "rgba(255,255,255,0.5)" : "#9ca3af" }}
          >
            {label}
          </p>
          <p
            className="text-3xl font-bold tracking-tight"
            style={{ color: accent ? "#ffffff" : "#1a1a1a" }}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className="text-xs mt-1"
              style={{ color: accent ? "rgba(255,255,255,0.4)" : "#9ca3af" }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: accent
                ? "rgba(255,255,255,0.08)"
                : `${iconColor}14`,
            }}
          >
            <Icon
              size={18}
              style={{ color: accent ? "rgba(255,255,255,0.7)" : iconColor }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
