"use client";

import { useRef } from "react";
import { clsx } from "clsx";

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Wordt aangeroepen zodra alle vakjes gevuld zijn (bv. automatisch versturen). */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  /** Toegankelijk label voor de groep, bv. "Eenmalige code". */
  label?: string;
}

/**
 * Invoer voor een eenmalige code in losse vakjes (zoals bij Apple, Google,
 * Microsoft). Typen springt automatisch door, Backspace springt terug,
 * pijltjestoetsen navigeren en plakken van de hele code (ook met spaties,
 * bv. "123 456") vult alle vakjes in één keer. iOS/Android kunnen de code
 * via autocomplete="one-time-code" in het eerste vakje aanbieden.
 */
export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  error,
  autoFocus,
  label = "Eenmalige code",
}: OtpCodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function focusAt(i: number) {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  }

  function commit(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  }

  /** Zet `chars` neer vanaf vakje `index` en overschrijft wat daar stond. */
  function setDigitsFrom(index: number, incoming: string) {
    const chars = incoming.replace(/\D/g, "");
    if (!chars) return;
    // Een volledige code (plakken, iOS/Android-autofill) vult altijd vanaf het begin.
    const start = chars.length >= length ? 0 : index;
    const next = value.slice(0, start) + chars + value.slice(start + chars.length);
    commit(next);
    focusAt(Math.min(start + chars.length, length - 1));
  }

  function handleInput(i: number, raw: string) {
    const v = raw.replace(/\D/g, "");
    if (!v) return;
    // Stond er al een cijfer en typt de gebruiker erbij, dan is het nieuwe
    // cijfer het teken dat niet het oude is.
    const typed = v.length === 2 && digits[i] ? (v[0] === digits[i] ? v[1] : v[0]) : v;
    setDigitsFrom(i, typed);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        commit(value.slice(0, i) + value.slice(i + 1));
        focusAt(i);
      } else if (i > 0) {
        commit(value.slice(0, i - 1) + value.slice(i));
        focusAt(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(i + 1);
    }
  }

  return (
    <div role="group" aria-label={label} className="flex justify-between gap-2 sm:gap-2.5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Cijfer ${i + 1} van ${length}`}
          maxLength={length}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onFocus={(e) => e.target.select()}
          // Klikken voorbij het eerste lege vakje → daar beginnen, zodat er
          // geen gaten in de code ontstaan.
          onClick={() => {
            const firstEmpty = Math.min(value.length, length - 1);
            if (i > firstEmpty) focusAt(firstEmpty);
          }}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => {
            e.preventDefault();
            setDigitsFrom(i, e.clipboardData.getData("text"));
          }}
          className={clsx(
            "w-full min-w-0 aspect-[4/5] max-w-14 rounded-xl border text-center text-2xl font-semibold tabular-nums text-[#1a1a1a] caret-(--brand-accent) transition-all duration-150",
            "focus:outline-none focus:border-(--brand-accent) focus:bg-white focus:ring-4 focus:ring-(--brand-accent)/15 disabled:opacity-60",
            error ? "border-[#dc2626] bg-[#fef2f2]" : d ? "border-[#cfc9c0] bg-white" : "border-[#e8e5df] bg-[#f8f7f4]"
          )}
        />
      ))}
    </div>
  );
}
