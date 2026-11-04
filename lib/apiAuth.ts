/**
 * Leest de `aal`-claim uit een access token. Alleen aanroepen NADAT het token
 * al via `auth.getUser(token)` door de Auth-server is geverifieerd — deze
 * functie controleert zelf geen handtekening.
 *
 * Nodig voor API-routes met medewerker-/beheerdersacties (send-invite,
 * mfa-reset): RLS dwingt aal2 af op de tabellen, maar sommige
 * autorisatiechecks in die routes lezen tabellen zonder aal2-eis
 * (memberships, platform_admins). Zonder deze check kon een gestolen
 * wachtwoord zónder tweede factor die acties alsnog uitvoeren.
 */
export function tokenHasAal2(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { aal?: string };
    return payload.aal === "aal2";
  } catch {
    return false;
  }
}
