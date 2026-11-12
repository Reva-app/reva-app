/**
 * Lichaamsdeel per herstelplancategorie (protocols.injury_category), om de
 * bibliotheek snel te kunnen filteren bij het kiezen van een plan.
 */
export type ProtocolRegion = "knie" | "heup" | "onderbeen" | "schouder" | "rug" | "bekken" | "overig";

export const PROTOCOL_REGION_LABELS: Record<ProtocolRegion, string> = {
  knie: "Knie",
  heup: "Heup en bovenbeen",
  onderbeen: "Onderbeen en voet",
  schouder: "Schouder en arm",
  rug: "Rug en nek",
  bekken: "Bekken en buik",
  overig: "Overig",
};

export const PROTOCOL_REGION_ORDER: ProtocolRegion[] = ["knie", "heup", "onderbeen", "schouder", "rug", "bekken", "overig"];

const REGION_BY_CATEGORY: Record<string, ProtocolRegion> = {
  acl: "knie", total_knee_replacement: "knie", meniscus: "knie", mcl_sprain: "knie",
  patellofemoral_pain: "knie", knee_osteoarthritis: "knie",
  total_hip_replacement: "heup", hip_osteoarthritis: "heup", groin_strain: "heup", hamstring_strain: "heup",
  ankle_ligament: "onderbeen", ankle_sprain: "onderbeen", plantar_fasciitis: "onderbeen",
  achilles_tendinopathy: "onderbeen", calf_strain: "onderbeen", shin_splints: "onderbeen",
  rotator_cuff: "schouder", shoulder_dislocation: "schouder", shoulder_chronic_pain: "schouder", elbow_tendinopathy: "schouder",
  low_back_pain: "rug", neck_pain_chronic: "rug",
  pelvic_instability: "bekken", pelvic_floor_dysfunction: "bekken", rectus_diastasis: "bekken",
};

export function protocolRegion(injuryCategory: string): ProtocolRegion {
  return REGION_BY_CATEGORY[injuryCategory] ?? "overig";
}
