import { dayOfYearIndex } from "@/lib/insights";

// ─── Motiverende zinnen ─────────────────────────────────────────────────────
// Eén nieuwe zin per kalenderdag, zelfde voor alle patiënten die dag. Puur
// bedoeld als rustige, ondersteunende toon bovenaan het dashboard — geen
// medisch advies, geen data-gedreven inhoud (dat is het domein van de coach
// in lib/coach.ts). Nederlands, geen leestekens die als "–"/"—" gelden.

export const MOTIVATIONAL_QUOTES: string[] = [
  "Elke stap vooruit telt, ook de kleine.",
  "Herstel is geen rechte lijn. Vertrouw het proces.",
  "Geduld is ook een vorm van kracht.",
  "Vandaag is een nieuwe kans om iets goeds te doen voor jezelf.",
  "Rust nemen is net zo belangrijk als vooruitgang boeken.",
  "Je hoeft niet elke dag record te breken. Consistent zijn is genoeg.",
  "Kleine vooruitgang is nog altijd vooruitgang.",
  "Luister naar je lichaam. Het weet meer dan je denkt.",
  "Je bent verder dan je gisteren was.",
  "Elke dag die je volhoudt, bouwt aan je herstel.",
  "Het is oké als het soms langzaam gaat. Langzaam is nog steeds vooruit.",
  "Je herstel is jouw traject. Vergelijk het met niemand anders.",
  "Sterke resultaten beginnen met kleine, herhaalde stappen.",
  "Vandaag hoeft niet perfect te zijn. Het hoeft alleen een stap te zijn.",
  "Je lichaam werkt hard, ook op de dagen dat je het niet voelt.",
  "Doorzettingsvermogen wint het vaak van snelheid.",
  "Wat je vandaag doet, telt mee voor morgen.",
  "Herstel vraagt tijd. Jij geeft het die tijd.",
  "Je bent niet je blessure. Je bent iemand die herstelt.",
  "Elke oefening die je afrondt, is een investering in jezelf.",
  "Vooruitgang voelt niet altijd groots. Vaak is het gewoon volhouden.",
  "Je hoeft het niet alleen te doen. Je team staat achter je.",
  "Een rustige dag is ook een dag waarop je herstelt.",
  "Je grenzen kennen is net zo belangrijk als ze verleggen.",
  "Wat vandaag zwaar voelt, wordt morgen makkelijker.",
  "Herstel gebeurt niet in een dag, maar wel elke dag een beetje.",
  "Je bent goed bezig, ook als het niet zo voelt.",
  "Blijf vertrouwen op het proces, ook op mindere dagen.",
  "Elke check-in geeft je meer grip op je herstel.",
  "Je hebt al veel meer bereikt dan je soms beseft.",
  "Consistentie wint het van perfectie.",
  "Een goede dag begint vaak met een klein besluit.",
  "Je bent sterker dan de dag dat dit begon.",
  "Neem de tijd die je nodig hebt. Er is geen wedstrijd.",
  "Herstellen is een vorm van moed.",
  "Ook stilstaan is soms nodig om verder te kunnen.",
  "Je hoeft niet alles tegelijk te doen. Eén stap is genoeg voor vandaag.",
  "De weg terug naar waar je wilt zijn, begint bij vandaag.",
  "Wat je volhoudt, wordt uiteindelijk gewoonte.",
  "Je herstel is het bewijs van je doorzettingsvermogen.",
  "Kleine overwinningen verdienen ook aandacht.",
  "Vertrouw op de opbouw, ook als je die nog niet ziet.",
  "Iedere training die je afrondt, brengt je dichterbij.",
  "Je bent niet aan het falen als het langzaam gaat. Je bent aan het herstellen.",
  "Rustdagen zijn geen verloren dagen.",
  "Je inzet van vandaag telt, ook zonder direct resultaat.",
  "Herstel vraagt om aandacht, niet om perfectie.",
  "Elke keer dat je opstaat na een moeilijke dag, ben je sterker geworden.",
  "Je hoeft het tempo niet te vergelijken met dat van een ander.",
  "Wat klein begint, wordt met de tijd groot.",
  "Blijf bij jezelf. Jouw herstel volgt jouw ritme.",
  "Vandaag goed voor jezelf zorgen, is morgen sterker staan.",
  "Je bent verder gekomen dan je op de moeilijke dagen zou denken.",
  "Elke stap, hoe klein ook, brengt beweging in je herstel.",
  "Herstel is een proces van vallen en weer opstaan, en dat is oké.",
  "Je doet dit niet voor niets. Het resultaat komt met de tijd.",
  "Wees net zo geduldig met jezelf als je zou zijn met iemand anders.",
  "Je hoeft vandaag alleen maar te doen wat binnen je bereik ligt.",
  "Volhouden is soms het enige dat nodig is.",
  "Je bouwt vandaag verder aan waar je morgen wilt staan.",
  "Elke dag dat je hiermee bezig bent, is een dag dichter bij herstel.",
];

/**
 * Zelfde zin voor iedereen op een gegeven kalenderdag, wisselt om
 * middernacht. Deterministisch (geen state nodig, ook stabiel na een
 * paginavernieuwing).
 */
export function getQuoteOfTheDay(date: Date = new Date()): string {
  const index = dayOfYearIndex(MOTIVATIONAL_QUOTES.length, date);
  return MOTIVATIONAL_QUOTES[index];
}
