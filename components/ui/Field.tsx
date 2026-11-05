"use client";

import { createContext, forwardRef, useContext, useId } from "react";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";

/**
 * Gedeelde formuliervelden. Eén plek voor hoogte, lettergrootte, focus- en
 * foutstijl, zodat formulieren overal hetzelfde aanvoelen.
 *
 * - 16px tekst op telefoon (text-base): iOS zoomt alleen in bij velden
 *   kleiner dan 16px. Vanaf 640px weer 14px, zoals de rest van de UI.
 * - Minimaal 44px hoog op telefoon (tikdoel), compacter vanaf 640px.
 * - <Field> koppelt label, hint en foutmelding automatisch aan het veld
 *   (htmlFor/id, aria-describedby, aria-invalid) via context.
 *
 *   <Field label="E-mailadres" error={emailError}>
 *     <Input type="email" value={email} onChange={…} />
 *   </Field>
 */

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Voor eigen controls (bv. DatePicker) die zich aan een <Field> willen koppelen. */
export function useFieldContext() {
  return useContext(FieldContext);
}

interface FieldProps {
  label: React.ReactNode;
  /** Toont "(optioneel)" achter het label. */
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, optional, hint, error, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: !!error }}>
      <div className={className}>
        <label htmlFor={id} className="block text-xs font-medium text-gray-500 mb-1.5">
          {label}
          {optional && <span className="font-normal text-gray-500"> (optioneel)</span>}
        </label>
        {children}
        {hint && !error && <p id={hintId} className="mt-1.5 text-xs text-gray-500">{hint}</p>}
        {error && <p id={errorId} role="alert" className="mt-1.5 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
      </div>
    </FieldContext.Provider>
  );
}

/** Basisklassen voor elk tekstveld — ook bruikbaar voor bijzondere gevallen. */
export const fieldControlClass = clsx(
  "w-full rounded-xl border bg-white text-gray-900 placeholder:text-gray-400",
  "text-base sm:text-sm px-3 min-h-11 sm:min-h-0 py-2.5 sm:py-2",
  "transition-colors focus:outline-none focus:border-[var(--brand-accent,#e8632a)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-accent,#e8632a)_15%,transparent)]",
  "disabled:bg-[#f8f7f4] disabled:text-gray-500 disabled:cursor-not-allowed",
  "aria-invalid:border-red-500"
);

const borderColor = { borderColor: "#e8e5df" };

function useControlProps(id: string | undefined, invalid: boolean | undefined) {
  const field = useContext(FieldContext);
  return {
    id: id ?? field?.id,
    "aria-describedby": field?.describedBy,
    "aria-invalid": (invalid ?? field?.invalid) ? true : undefined,
  };
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, style, id, invalid, type = "text", ...props },
  ref
) {
  const control = useControlProps(id, invalid);
  return (
    <input
      ref={ref}
      type={type}
      // Standaard het juiste toetsenbord en invulsuggesties per type.
      inputMode={props.inputMode ?? (type === "tel" ? "tel" : type === "email" ? "email" : undefined)}
      autoComplete={props.autoComplete ?? (type === "email" ? "email" : type === "tel" ? "tel" : undefined)}
      className={clsx(fieldControlClass, className)}
      style={{ ...borderColor, ...style }}
      {...control}
      {...props}
    />
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, style, id, invalid, rows = 3, ...props },
  ref
) {
  const control = useControlProps(id, invalid);
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={clsx(fieldControlClass, "resize-none", className)}
      style={{ ...borderColor, ...style }}
      {...control}
      {...props}
    />
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

/**
 * Native <select> onder de motorkap — op telefoon geeft dat de vertrouwde
 * keuzelijst van iOS/Android — maar de knop zelf in REVA-stijl.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, style, id, invalid, children, ...props },
  ref
) {
  const control = useControlProps(id, invalid);
  return (
    <div className="relative">
      <select
        ref={ref}
        className={clsx(fieldControlClass, "appearance-none pr-9 cursor-pointer", className)}
        style={{ ...borderColor, ...style }}
        {...control}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  );
});
