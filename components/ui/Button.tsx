import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
        sizes[size],
        fullWidth && "w-full",
        variant === "secondary" &&
          "border text-gray-700 hover:bg-gray-50",
        variant === "ghost" &&
          "text-gray-600 hover:bg-gray-100",
        variant === "danger" &&
          "bg-red-600 text-white hover:bg-red-700",
        className
      )}
      style={
        variant === "primary"
          ? {
              background: "#e8632a",
              color: "#ffffff",
            }
          : variant === "secondary"
          ? {
              borderColor: "#e8e5df",
              background: "#ffffff",
            }
          : undefined
      }
      {...props}
    >
      {children}
    </button>
  );
}
