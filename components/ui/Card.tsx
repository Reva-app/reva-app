import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
  hoverable?: boolean;
}

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  children,
  className,
  padding = "md",
  onClick,
  hoverable,
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border",
        paddings[padding],
        hoverable &&
          "cursor-pointer transition-shadow hover:shadow-md",
        className
      )}
      style={{
        background: "#ffffff",
        borderColor: "#e8e5df",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
