interface ScoreBarProps {
  label: string;
  value: number;
  max?: number;
  colorClass?: string;
}

export function ScoreBar({ label, value, max = 5, colorClass }: ScoreBarProps) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-semibold text-gray-700">{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={colorClass ?? ""}
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "9999px",
            background: colorClass ? undefined : "#e8632a",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
