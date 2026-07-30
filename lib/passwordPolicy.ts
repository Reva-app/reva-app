// Gedeeld wachtwoordbeleid — één plek in plaats van drie losse kopieën
// (register, reset-password/uitnodiging, wachtwoord wijzigen in
// instellingen). Deze app geeft toegang tot bijzondere persoonsgegevens
// (gezondheidsdata), dus een zuiver lengte-eis van 8 tekens zonder verdere
// eis was aan de lage kant.

export const PASSWORD_MIN_LENGTH = 10;

/** Retourneert een Nederlandse foutmelding, of null als het wachtwoord voldoet. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Wachtwoord moet minimaal ${PASSWORD_MIN_LENGTH} tekens bevatten`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Wachtwoord moet zowel letters als cijfers bevatten";
  }
  return null;
}

export type PasswordStrength = "zwak" | "matig" | "sterk" | null;

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return null;
  if (validatePassword(password)) return "zwak";
  if (password.length < 14) return "matig";
  return "sterk";
}
