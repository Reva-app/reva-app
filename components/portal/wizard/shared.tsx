export const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

export const GOAL_ICON_OPTIONS = ["🏃", "🚴", "💪", "🏋️", "⚽", "🎯", "🧘", "🏊", "🚶", "🦵", "🏆", "✨"];

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}
