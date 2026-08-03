export interface TabOption<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ options, value, onChange, className }: TabsProps<T>) {
  return (
    <div
      className={`flex rounded-xl overflow-x-auto w-full sm:w-fit ${className ?? ""}`}
      style={{ background: "#f3f0eb" }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${value === opt.value ? "" : "hover:bg-black/5"}`}
          style={{
            background: value === opt.value ? "#ffffff" : undefined,
            color: value === opt.value ? "#1a1a1a" : "#9ca3af",
            borderRadius: "10px",
            margin: "3px",
            boxShadow: value === opt.value ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
