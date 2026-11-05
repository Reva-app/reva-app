"use client";

import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { Check, Pipette } from "lucide-react";
import { isHexColor } from "@/lib/brand";

/**
 * Rustige, professionele huisstijlkleuren voor zorgpraktijken — allemaal
 * donker genoeg voor witte tekst (zie accessibleAccent in lib/brand.ts).
 */
export const COLOR_PRESETS: { value: string; label: string }[] = [
  { value: "#e8632a", label: "REVA-oranje" },
  { value: "#c2410c", label: "Terracotta" },
  { value: "#9f1d35", label: "Bordeaux" },
  { value: "#be3a6f", label: "Framboos" },
  { value: "#6d4bc4", label: "Paars" },
  { value: "#3b4cb8", label: "Indigo" },
  { value: "#1f6fd1", label: "Blauw" },
  { value: "#0e7490", label: "Petrol" },
  { value: "#2f6f5e", label: "Groen" },
  { value: "#55753a", label: "Olijf" },
  { value: "#334155", label: "Leisteen" },
];

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

/** Kleurkeuze: vaste paletkleuren, of een eigen kleur via kleurvlak en hexcode. */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const current = value.toLowerCase();
  const isPreset = COLOR_PRESETS.some((p) => p.value === current);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const pickerValue = isHexColor(current) ? current : COLOR_PRESETS[0].value;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Huisstijlkleur">
        {COLOR_PRESETS.map((preset) => {
          const selected = preset.value === current;
          return (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={preset.label}
              title={preset.label}
              onClick={() => { onChange(preset.value); setCustomOpen(false); }}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
              style={{
                background: preset.value,
                boxShadow: selected ? `0 0 0 2px #ffffff, 0 0 0 4px ${preset.value}` : "inset 0 0 0 1px rgba(0,0,0,0.06)",
              }}
            >
              {selected && <Check size={16} className="text-white" strokeWidth={3} />}
            </button>
          );
        })}

        <button
          type="button"
          role="radio"
          aria-checked={!isPreset}
          aria-label="Eigen kleur"
          title="Eigen kleur"
          onClick={() => setCustomOpen((o) => !o)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
          style={{
            background: !isPreset && isHexColor(current)
              ? current
              : "conic-gradient(from 180deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
            boxShadow: !isPreset ? `0 0 0 2px #ffffff, 0 0 0 4px ${isHexColor(current) ? current : "#9ca3af"}` : "none",
          }}
        >
          {!isPreset
            ? <Check size={16} className="text-white" strokeWidth={3} />
            : <span className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center"><Pipette size={11} className="text-gray-600" /></span>}
        </button>
      </div>

      {customOpen && (
        <div className="rounded-2xl border p-4 space-y-3 max-w-xs" style={{ borderColor: "#e8e5df", background: "#fbfaf8" }}>
          <div className="reva-colorful">
            <HexColorPicker color={pickerValue} onChange={(hex) => onChange(hex.toLowerCase())} />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl shrink-0 border" style={{ background: pickerValue, borderColor: "rgba(0,0,0,0.06)" }} />
            <div className="flex items-center flex-1 rounded-xl border px-3 py-2 bg-white" style={{ borderColor: "#e8e5df" }}>
              <span className="text-sm text-subtle mr-1">#</span>
              <HexColorInput
                color={pickerValue}
                onChange={(hex) => onChange(hex.toLowerCase())}
                className="w-full text-sm uppercase tracking-wide focus:outline-none bg-transparent"
                aria-label="Kleurcode"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
