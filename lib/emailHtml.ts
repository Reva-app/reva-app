/**
 * Invoerhulp voor server-side verstuurde e-mails. De opmaak en teksten zelf
 * staan in lib/email/ (layout.ts + messages.ts).
 */

// Strips newlines so user input can't be used for header/subject-line injection.
export function stripNewlines(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}
