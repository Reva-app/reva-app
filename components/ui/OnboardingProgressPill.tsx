import { ChevronRight } from "lucide-react";

interface OnboardingProgressPillProps {
  label: string;
  doneCount: number;
  totalCount: number;
  onClick: () => void;
}

/**
 * Ingeklapte staat van een onboarding-checklist — blijft altijd heropenbaar
 * i.p.v. de kaart voorgoed te laten verdwijnen zodra iemand 'm wegklikt.
 */
export function OnboardingProgressPill({ label, doneCount, totalCount, onClick }: OnboardingProgressPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 text-left px-4 py-3 rounded-xl border transition-colors hover:bg-gray-50"
      style={{ borderColor: "#e8e5df", background: "#ffffff" }}
    >
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="text-xs" style={{ color: "#c4bfb7" }}>{doneCount}/{totalCount} voltooid</span>
      <ChevronRight size={14} className="text-gray-400 ml-auto shrink-0" />
    </button>
  );
}
