import { crewCatalog } from "./data";
import { clamp } from "./math";
import type {
  CrewDemandId,
  CrewProfile,
  CrewRankId,
  CrewRoutePreferenceId,
  CrewTemperamentId,
  CrewTraitId,
  GameState,
  ShipStats,
} from "./types";

export const crewPaydayInterval = 7;
export const initialCrewMorale = 72;
export const crewMoraleMin = 0;
export const crewMoraleMax = 100;
export type CrewFacility = {
  id: "none" | "crew_quarters" | "officer_cabins" | "galley_mess" | "watch_bunks";
  label: string;
  detail: string;
  moraleRecoveryBonus: number;
  moraleStrainRelief: number;
  paydayMoraleBonus: number;
  shoreLeaveDiscount: number;
  xpMultiplier: number;
  casualtyProtection: number;
};

export type CrewFacilityDrill = {
  available: boolean;
  cost: number;
  crewXp: number;
  detail: string;
  facilityId: CrewFacility["id"];
  label: string;
  morale: number;
  reason: string;
  source: string;
  strainRelief: number;
};
export const crewRankCatalog: Array<{
  id: CrewRankId;
  label: string;
  minXp: number;
  wageMultiplier: number;
  bonus: number;
  specialtyLabel: string;
}> = [
  { id: "green", label: "Green", minXp: 0, wageMultiplier: 1, bonus: 0, specialtyLabel: "basic watch" },
  { id: "seasoned", label: "Seasoned", minXp: 60, wageMultiplier: 1.08, bonus: 1, specialtyLabel: "specialty live" },
  { id: "veteran", label: "Veteran", minXp: 160, wageMultiplier: 1.16, bonus: 1, specialtyLabel: "reliable hand" },
  { id: "master", label: "Master", minXp: 320, wageMultiplier: 1.25, bonus: 2, specialtyLabel: "master perk" },
];

export type CrewTraitDefinition = {
  id: CrewTraitId;
  label: string;
  detail: string;
  effects: Partial<ShipStats>;
  dismissalCostModifier: number;
  dismissalMoraleDelta: number;
  casualtyProtection: number;
};

export const crewTraitCatalog: CrewTraitDefinition[] = [
  {
    id: "loyal",
    label: "Loyal",
    detail: "stays steady when morale is high, but dismissal hurts the crew",
    effects: {},
    dismissalCostModifier: 0.12,
    dismissalMoraleDelta: 4,
    casualtyProtection: 0.02,
  },
  {
    id: "storm_scarred",
    label: "Storm-Scarred",
    detail: "reads ugly water sooner after hard weather",
    effects: { openWater: 1 },
    dismissalCostModifier: 0.04,
    dismissalMoraleDelta: 1,
    casualtyProtection: 0.04,
  },
  {
    id: "marketwise",
    label: "Marketwise",
    detail: "learned dockside prices, manifests, and cargo discipline",
    effects: { negotiation: 1 },
    dismissalCostModifier: 0.06,
    dismissalMoraleDelta: 1,
    casualtyProtection: 0.01,
  },
];

const crewTraitIds = new Set<CrewTraitId>(crewTraitCatalog.map((trait) => trait.id));

const crewTemperamentIds = new Set<CrewTemperamentId>(["steady", "bold", "cautious", "mercantile"]);
const crewRoutePreferenceIds = new Set<CrewRoutePreferenceId>(["safe_water", "fast_water", "profitable_cargo", "armed_routes"]);
const crewDemandIds = new Set<CrewDemandId>(["shore_leave", "safer_orders", "profit_share", "action"]);

const crewProfileDefaults: Record<string, CrewProfile> = {
  navigator: {
    temperament: "bold",
    preference: "fast_water",
    loyalty: 50,
    strain: 0,
  },
  quartermaster: {
    temperament: "mercantile",
    preference: "profitable_cargo",
    loyalty: 48,
    strain: 0,
  },
  boatswain: {
    temperament: "cautious",
    preference: "safe_water",
    loyalty: 52,
    strain: 0,
  },
  gunner: {
    temperament: "bold",
    preference: "armed_routes",
    loyalty: 46,
    strain: 0,
  },
};

const crewTemperamentLabels: Record<CrewTemperamentId, string> = {
  steady: "Steady",
  bold: "Bold",
  cautious: "Cautious",
  mercantile: "Mercantile",
};

const crewPreferenceLabels: Record<CrewRoutePreferenceId, string> = {
  safe_water: "Safe water",
  fast_water: "Fast water",
  profitable_cargo: "Profit cargo",
  armed_routes: "Armed routes",
};

const crewPreferenceDetails: Record<CrewRoutePreferenceId, string> = {
  safe_water: "prefers reefed or quiet routes with low wear and low crew strain",
  fast_water: "prefers fast tradewind windows and dislikes slow orders",
  profitable_cargo: "prefers cargo runs with visible margin over empty repositioning",
  armed_routes: "prefers routes where cannons, escort work, or risk can matter",
};

const crewDemandLabels: Record<CrewDemandId, string> = {
  shore_leave: "shore leave",
  safer_orders: "safer orders",
  profit_share: "profit share",
  action: "action",
};

const crewDemandDetails: Record<CrewDemandId, string> = {
  shore_leave: "wants paid time ashore before more hard water",
  safer_orders: "wants reefed or quieter routes until strain eases",
  profit_share: "wants a profitable cargo run to justify the risk",
  action: "wants a route where guns or bold sailing matter",
};

const crewSpecialties: Record<string, { label: string; detail: string; protection: number }> = {
  navigator: {
    label: "Wayfinder",
    detail: "route reads, watches, and speed calls",
    protection: 0.03,
  },
  quartermaster: {
    label: "Factor",
    detail: "cargo order, prices, and bribe discipline",
    protection: 0.02,
  },
  boatswain: {
    label: "Damage Lead",
    detail: "hull work, rigging, and crew safety",
    protection: 0.09,
  },
  gunner: {
    label: "Arms Lead",
    detail: "battle stations and boarding defense",
    protection: 0.07,
  },
};

export function crewById(id: string) {
  return crewCatalog.find((crew) => crew.id === id) ?? null;
}

export function crewWeeklyWage(state: Pick<GameState, "crew"> & Partial<Pick<GameState, "crewXp">>) {
  return state.crew.reduce((sum, id) => {
    return sum + crewWageFor(id, state.crewXp?.[id] ?? 0);
  }, 0);
}

export function crewWageFor(crewId: string, xp = 0) {
  const crew = crewById(crewId);
  if (!crew) return 0;
  return Math.round(crew.wage * crewRankFor(xp).wageMultiplier);
}

export function crewRankFor(xp = 0) {
  const normalized = Math.max(0, Math.round(xp));
  return [...crewRankCatalog].reverse().find((rank) => normalized >= rank.minXp) ?? crewRankCatalog[0];
}

export function crewXpToNext(xp = 0) {
  const normalized = Math.max(0, Math.round(xp));
  const next = crewRankCatalog.find((rank) => rank.minXp > normalized);
  return next ? next.minXp - normalized : 0;
}

export function crewRankEffects(effects: Partial<ShipStats>, xp = 0): Partial<ShipStats> {
  const bonus = crewRankFor(xp).bonus;
  if (bonus <= 0) return {};
  const strongest = Object.entries(effects)
    .filter((entry): entry is [keyof ShipStats, number] => (entry[1] ?? 0) > 0)
    .sort((left, right) => right[1] - left[1])[0];
  return strongest ? { [strongest[0]]: bonus } : {};
}

export function crewSpecialtyFor(crewId: string, xp = 0) {
  const crew = crewById(crewId);
  const rank = crewRankFor(xp);
  const specialty = crewSpecialties[crewId] ?? {
    label: "Deckhand",
    detail: "general ship work",
    protection: 0.01,
  };
  const rankEffects = crew ? crewRankEffects(crew.effects, xp) : {};
  const rankEffectText = Object.entries(rankEffects)
    .map(([key, value]) => `${value && value > 0 ? "+" : ""}${value} ${statLabel(key)}`)
    .join(" | ");
  return {
    ...specialty,
    rank,
    active: rank.bonus > 0,
    perk: rankEffectText || rank.specialtyLabel,
    text: `${specialty.label} | ${rank.label}${rankEffectText ? ` | ${rankEffectText}` : ""}`,
  };
}

export function crewTraitDefinitionFor(traitId: CrewTraitId) {
  return crewTraitCatalog.find((trait) => trait.id === traitId) ?? crewTraitCatalog[0];
}

export function isCrewTraitId(value: unknown): value is CrewTraitId {
  return typeof value === "string" && crewTraitIds.has(value as CrewTraitId);
}

export function crewTraitsFor(state: Partial<Pick<GameState, "crewTraits">>, crewId: string): CrewTraitId[] {
  const traits = state.crewTraits?.[crewId];
  if (!Array.isArray(traits)) return [];
  const normalized: CrewTraitId[] = [];
  for (const trait of traits) {
    if (!isCrewTraitId(trait) || normalized.includes(trait)) continue;
    normalized.push(trait);
  }
  return normalized;
}

export function defaultCrewProfile(crewId: string): CrewProfile {
  const fallback = crewProfileDefaults[crewId] ?? {
    temperament: "steady" as CrewTemperamentId,
    preference: "safe_water" as CrewRoutePreferenceId,
    loyalty: 46,
    strain: 0,
  };
  return { ...fallback };
}

export function isCrewTemperamentId(value: unknown): value is CrewTemperamentId {
  return typeof value === "string" && crewTemperamentIds.has(value as CrewTemperamentId);
}

export function isCrewRoutePreferenceId(value: unknown): value is CrewRoutePreferenceId {
  return typeof value === "string" && crewRoutePreferenceIds.has(value as CrewRoutePreferenceId);
}

export function isCrewDemandId(value: unknown): value is CrewDemandId {
  return typeof value === "string" && crewDemandIds.has(value as CrewDemandId);
}

export function crewProfileFor(state: Partial<Pick<GameState, "crewProfiles">>, crewId: string): CrewProfile {
  const raw = state.crewProfiles?.[crewId];
  return normalizeCrewProfile(crewId, raw);
}

export function normalizeCrewProfile(crewId: string, raw: unknown, day = 1): CrewProfile {
  const base = defaultCrewProfile(crewId);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const value = raw as Partial<CrewProfile>;
  const loyalty = Number(value.loyalty);
  const strain = Number(value.strain);
  const demand = isCrewDemandId(value.demand) && (!value.demandExpires || value.demandExpires >= day) ? value.demand : undefined;
  const demandExpires = demand && Number.isFinite(Number(value.demandExpires)) ? Math.round(Number(value.demandExpires)) : undefined;
  const lastRoute = typeof value.lastRoute === "string" ? value.lastRoute.slice(0, 80) : undefined;
  return {
    temperament: isCrewTemperamentId(value.temperament) ? value.temperament : base.temperament,
    preference: isCrewRoutePreferenceId(value.preference) ? value.preference : base.preference,
    loyalty: clamp(Number.isFinite(loyalty) ? Math.round(loyalty) : base.loyalty, 0, 100),
    strain: clamp(Number.isFinite(strain) ? Math.round(strain) : base.strain, 0, 100),
    ...(demand ? { demand } : {}),
    ...(demandExpires ? { demandExpires } : {}),
    ...(lastRoute ? { lastRoute } : {}),
  };
}

export function normalizeCrewProfiles(state: Pick<GameState, "crew"> & { crewProfiles?: Record<string, unknown> | null; day?: number }) {
  const profiles: Record<string, CrewProfile> = {};
  for (const crewId of state.crew ?? []) {
    profiles[crewId] = normalizeCrewProfile(crewId, state.crewProfiles?.[crewId], state.day ?? 1);
  }
  return profiles;
}

export function crewProfileSummary(profile: CrewProfile) {
  const parts = [
    `${crewPreferenceLabels[profile.preference]} ${loyaltyTier(profile.loyalty)}`,
    `strain ${strainTier(profile.strain)}`,
    profile.demand ? `wants ${crewDemandLabels[profile.demand]}` : "",
  ].filter(Boolean);
  return parts.join(" | ");
}

export function crewProfileDetail(profile: CrewProfile) {
  const demand = profile.demand ? `Demand: ${crewDemandDetails[profile.demand]}.` : "No active demand.";
  return `${crewTemperamentLabels[profile.temperament]} temperament; ${crewPreferenceDetails[profile.preference]}. Loyalty ${profile.loyalty}, strain ${profile.strain}. ${demand}`;
}

export function crewDemandLabel(demand: CrewDemandId) {
  return crewDemandLabels[demand];
}

export function crewPreferenceLabel(preference: CrewRoutePreferenceId) {
  return crewPreferenceLabels[preference];
}

export function crewTraitEffects(traits: CrewTraitId[]): Partial<ShipStats> {
  const effects: Partial<ShipStats> = {};
  for (const traitId of traits) {
    const trait = crewTraitDefinitionFor(traitId);
    for (const [key, value] of Object.entries(trait.effects) as Array<[keyof ShipStats, number]>) {
      effects[key] = (effects[key] ?? 0) + value;
    }
  }
  return effects;
}

export function crewTraitSummary(traits: CrewTraitId[]) {
  return traits.length ? traits.map((traitId) => crewTraitDefinitionFor(traitId).label).join(" | ") : "No traits yet";
}

export function crewTraitDetail(traits: CrewTraitId[]) {
  return traits.map((traitId) => crewTraitDefinitionFor(traitId).detail).join(" | ");
}

export function crewDismissalCost(state: Pick<GameState, "crew" | "crewXp"> & Partial<Pick<GameState, "crewTraits" | "crewProfiles">>, crewId: string) {
  if (!state.crew.includes(crewId)) return 0;
  const xp = state.crewXp?.[crewId] ?? 0;
  const wage = crewWageFor(crewId, xp);
  const base = wage * 1.35 + Math.min(140, xp * 0.28);
  const traitModifier = 1 + crewTraitsFor(state, crewId).reduce((sum, traitId) => sum + crewTraitDefinitionFor(traitId).dismissalCostModifier, 0);
  const profile = crewProfileFor(state, crewId);
  const identityModifier = 1 + (profile.loyalty >= 78 ? 0.14 : profile.loyalty >= 64 ? 0.07 : 0) + (profile.demand ? 0.06 : 0) - (profile.strain >= 78 ? 0.05 : 0);
  return Math.max(32, Math.round(base * traitModifier * identityModifier));
}

export function crewDismissalMoralePenalty(xp = 0, traits: CrewTraitId[] = [], profile?: CrewProfile) {
  const rank = crewRankFor(xp);
  const base = rank.id === "master" ? 14 : rank.id === "veteran" ? 10 : rank.id === "seasoned" ? 7 : 4;
  const identityPenalty = profile ? (profile.loyalty >= 78 ? 4 : profile.loyalty >= 64 ? 2 : 0) + (profile.demand ? 1 : 0) - (profile.strain >= 82 ? 1 : 0) : 0;
  return base + traits.reduce((sum, traitId) => sum + crewTraitDefinitionFor(traitId).dismissalMoraleDelta, 0) + identityPenalty;
}

export function crewCasualtyProtection(state: Pick<GameState, "crew" | "crewXp" | "crewMorale"> & Partial<Pick<GameState, "crewTraits">>) {
  if (!state.crew.length) return 0;
  const morale = normalizeCrewMorale(state.crewMorale);
  const moraleRelief = morale >= 86 ? 0.03 : morale < 42 ? -0.04 : morale < 56 ? -0.02 : 0;
  const roleRelief = state.crew.reduce((sum, crewId) => {
    const specialty = crewSpecialtyFor(crewId, state.crewXp?.[crewId] ?? 0);
    const traitRelief = crewTraitsFor(state, crewId).reduce((total, traitId) => total + crewTraitDefinitionFor(traitId).casualtyProtection, 0);
    return sum + specialty.protection + specialty.rank.bonus * 0.018 + traitRelief;
  }, 0);
  const facilityRelief = crewFacilityFor(state).casualtyProtection;
  return clamp(roleRelief + moraleRelief + facilityRelief, -0.05, 0.3);
}

export function nextCrewPayday(day: number) {
  const remainder = day % crewPaydayInterval;
  return day + (remainder === 0 ? crewPaydayInterval : crewPaydayInterval - remainder);
}

export function normalizeCrewMorale(value?: number) {
  return clamp(Math.round(value ?? initialCrewMorale), crewMoraleMin, crewMoraleMax);
}

export function crewMoraleTier(morale: number) {
  const normalized = normalizeCrewMorale(morale);
  if (normalized >= 86) return { label: "Inspired", note: "+nav +water", tone: "high" };
  if (normalized >= 64) return { label: "Steady", note: "reliable", tone: "good" };
  if (normalized >= 42) return { label: "Strained", note: "-nav -water", tone: "warn" };
  return { label: "Ragged", note: "-speed -nav -water", tone: "low" };
}

export function moraleStatEffects(state: Pick<GameState, "crew" | "crewMorale">) {
  if (!state.crew.length) return {};
  const morale = normalizeCrewMorale(state.crewMorale);
  if (morale >= 86) return { navigation: 1, openWater: 1 };
  if (morale < 42) return { speed: -1, navigation: -1, openWater: -1 };
  if (morale < 56) return { navigation: -1, openWater: -1 };
  return {};
}

export function shoreLeaveCost(state: Pick<GameState, "crew"> & Partial<Pick<GameState, "crewXp" | "equipment">>) {
  const base = 18 + state.crew.length * 28 + crewWeeklyWage(state) * 0.28;
  return Math.max(28, Math.round(base * (1 - crewFacilityFor(state).shoreLeaveDiscount)));
}

export function crewFacilityDrillFor(
  state: Pick<GameState, "cash" | "crew" | "encounter" | "gameOver" | "voyage"> &
    Partial<Pick<GameState, "crewXp" | "equipment">>
): CrewFacilityDrill {
  const facility = crewFacilityFor(state);
  const spec = crewFacilityDrillSpecs[facility.id];
  const cost = Math.max(35, Math.round((spec.baseCost + state.crew.length * 14 + crewWeeklyWage(state) * 0.12) / 5) * 5);
  const busy = Boolean(state.voyage || state.encounter || state.gameOver);
  const available = !busy && state.crew.length > 0 && state.cash >= cost;
  return {
    available,
    cost,
    crewXp: spec.crewXp,
    detail: spec.detail,
    facilityId: facility.id,
    label: spec.label,
    morale: spec.morale,
    reason: drillReason({ available, busy, cash: state.cash, cost, crewCount: state.crew.length }),
    source: spec.source,
    strainRelief: spec.strainRelief,
  };
}

export function crewFacilityFor(state: object | null | undefined): CrewFacility {
  const equipment = equipmentIdsForFacility(state);
  if (equipment.includes("watch_bunks")) {
    return {
      id: "watch_bunks",
      label: "Watch Bunks",
      detail: "rotating watches reduce fatigue and keep backup hands ready",
      moraleRecoveryBonus: 4,
      moraleStrainRelief: 3,
      paydayMoraleBonus: 1,
      shoreLeaveDiscount: 0.1,
      xpMultiplier: 1.14,
      casualtyProtection: 0.025,
    };
  }
  if (equipment.includes("galley_mess")) {
    return {
      id: "galley_mess",
      label: "Galley Mess",
      detail: "cheaper shore leave, stronger morale recovery, steadier payday",
      moraleRecoveryBonus: 7,
      moraleStrainRelief: 1,
      paydayMoraleBonus: 2,
      shoreLeaveDiscount: 0.18,
      xpMultiplier: 1,
      casualtyProtection: 0.01,
    };
  }
  if (equipment.includes("officer_cabins")) {
    return {
      id: "officer_cabins",
      label: "Officer Cabins",
      detail: "senior watches train faster and absorb rough-water strain",
      moraleRecoveryBonus: 3,
      moraleStrainRelief: 1,
      paydayMoraleBonus: 1,
      shoreLeaveDiscount: 0.05,
      xpMultiplier: 1.25,
      casualtyProtection: 0.015,
    };
  }
  if (equipment.includes("crew_quarters")) {
    return {
      id: "crew_quarters",
      label: "Crew Quarters",
      detail: "safer watches and less hard-water morale strain",
      moraleRecoveryBonus: 2,
      moraleStrainRelief: 2,
      paydayMoraleBonus: 1,
      shoreLeaveDiscount: 0.08,
      xpMultiplier: 1.08,
      casualtyProtection: 0.03,
    };
  }
  return {
    id: "none",
    label: "No Facility",
    detail: "basic hammocks, standard watches",
    moraleRecoveryBonus: 0,
    moraleStrainRelief: 0,
    paydayMoraleBonus: 0,
    shoreLeaveDiscount: 0,
    xpMultiplier: 1,
    casualtyProtection: 0,
  };
}

export function crewFacilitySummary(state: object | null | undefined) {
  const facility = crewFacilityFor(state);
  if (facility.id === "none") return facility.detail;
  const parts = [
    facility.moraleRecoveryBonus ? `+${facility.moraleRecoveryBonus} leave morale` : "",
    facility.moraleStrainRelief ? `-${facility.moraleStrainRelief} strain` : "",
    facility.paydayMoraleBonus ? `+${facility.paydayMoraleBonus} payday morale` : "",
    facility.shoreLeaveDiscount ? `${Math.round(facility.shoreLeaveDiscount * 100)}% cheaper leave` : "",
    facility.xpMultiplier > 1 ? `${Math.round((facility.xpMultiplier - 1) * 100)}% faster crew XP` : "",
  ].filter(Boolean);
  return `${facility.detail}${parts.length ? ` | ${parts.join(" | ")}` : ""}`;
}

const crewFacilityDrillSpecs: Record<
  CrewFacility["id"],
  {
    baseCost: number;
    crewXp: number;
    detail: string;
    label: string;
    morale: number;
    source: string;
    strainRelief: number;
  }
> = {
  none: {
    baseCost: 48,
    crewXp: 6,
    detail: "basic deck practice keeps the watch awake",
    label: "Deck Drill",
    morale: 1,
    source: "Deck drill",
    strainRelief: 3,
  },
  crew_quarters: {
    baseCost: 68,
    crewXp: 10,
    detail: "safety watches use the extra space to settle rough-water nerves",
    label: "Safety Watch Drill",
    morale: 3,
    source: "Crew quarters drill",
    strainRelief: 8,
  },
  officer_cabins: {
    baseCost: 86,
    crewXp: 16,
    detail: "senior hands turn cabin charts into cleaner route calls",
    label: "Officer Table Drill",
    morale: 2,
    source: "Officer drill",
    strainRelief: 5,
  },
  galley_mess: {
    baseCost: 62,
    crewXp: 9,
    detail: "a meal and muster restore patience before the next run",
    label: "Galley Muster",
    morale: 8,
    source: "Galley muster",
    strainRelief: 12,
  },
  watch_bunks: {
    baseCost: 82,
    crewXp: 14,
    detail: "rotating watches rehearse hard-water relief and backup hands",
    label: "Rotating Watch Drill",
    morale: 4,
    source: "Hard water watch drill",
    strainRelief: 14,
  },
};

function drillReason({
  available,
  busy,
  cash,
  cost,
  crewCount,
}: {
  available: boolean;
  busy: boolean;
  cash: number;
  cost: number;
  crewCount: number;
}) {
  if (available) return "ready";
  if (busy) return "ship busy";
  if (crewCount <= 0) return "needs crew";
  if (cash < cost) return `$${cost - cash} short`;
  return "not ready";
}

function equipmentIdsForFacility(state: object | null | undefined) {
  if (!state || !("equipment" in state)) return [];
  const equipment = (state as { equipment?: unknown }).equipment;
  return Array.isArray(equipment) ? equipment.filter((id): id is string => typeof id === "string") : [];
}

function statLabel(key: string) {
  const labels: Record<string, string> = {
    cargoCap: "hold",
    cannons: "guns",
    speed: "speed",
    openWater: "water",
    crewCap: "crew",
    hullMax: "hull",
    navigation: "nav",
    negotiation: "trade",
  };
  return labels[key] ?? key;
}

function loyaltyTier(value: number) {
  if (value >= 78) return "bonded";
  if (value >= 62) return "loyal";
  if (value <= 28) return "restless";
  return "steady";
}

function strainTier(value: number) {
  if (value >= 78) return "breaking";
  if (value >= 56) return "high";
  if (value >= 28) return "watchful";
  return "low";
}
