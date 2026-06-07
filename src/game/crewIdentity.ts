import { crewCatalog } from "./data";
import { crewDemandLabel, crewPreferenceLabel, crewProfileFor } from "./crew";
import { clamp } from "./math";
import { cargoUnits, routeConditions, routeDays, routePhysicsProfile, routeRisk, routeWearEstimate } from "./routing";
import { deriveShipStats } from "./stats";
import type { CrewProfile, GameState, SailPlanId, Voyage } from "./types";

export type CrewRouteReadEntry = {
  crewId: string;
  name: string;
  preference: CrewProfile["preference"];
  score: number;
  stance: "backs" | "neutral" | "objects";
  reason: string;
};

export type CrewRouteRead = {
  score: number;
  label: "Crew backs it" | "Crew split" | "Crew objects" | "No crew";
  compact: string;
  detail: string;
  entries: CrewRouteReadEntry[];
};

export type CrewRouteReadOptions = {
  cargoUnits?: number;
  expectedProfit?: number;
  sailPlan?: SailPlanId;
};

export function crewRouteReadFor(state: GameState, fromId: string, toId: string, options: CrewRouteReadOptions = {}): CrewRouteRead {
  if (!state.crew.length) {
    return {
      score: 0,
      label: "No crew",
      compact: "No crew read",
      detail: "Hire crew to add route preference pressure.",
      entries: [],
    };
  }

  const routeState = { ...state, sailPlan: options.sailPlan ?? state.sailPlan };
  const conditions = routeConditions(routeState, fromId, toId);
  const physics = routePhysicsProfile(routeState, fromId, toId);
  const wear = routeWearEstimate(routeState, fromId, toId);
  const risk = routeRisk(routeState, fromId, toId);
  const days = routeDays(routeState, fromId, toId);
  const ship = deriveShipStats(routeState);
  const carriedOrPlannedCargo = Math.max(0, options.cargoUnits ?? cargoUnits(routeState));
  const expectedProfit = options.expectedProfit ?? 0;

  const entries = state.crew.map((crewId) => {
    const crew = crewCatalog.find((entry) => entry.id === crewId);
    const profile = crewProfileFor(routeState, crewId);
    const score = crewPreferenceScore(profile, {
      cargoUnits: carriedOrPlannedCargo,
      days,
      expectedProfit,
      risk,
      sailPlan: routeState.sailPlan,
      speedDelta: conditions.speedDelta,
      crewStrain: physics.crewStrain,
      pressure: physics.pressure,
      wear: wear.hullWear,
      cannons: ship.cannons,
    });
    return {
      crewId,
      name: crew?.name ?? crewId,
      preference: profile.preference,
      score,
      stance: score >= 2 ? "backs" : score <= -2 ? "objects" : "neutral",
      reason: crewRouteReason(profile, score),
    } satisfies CrewRouteReadEntry;
  });

  const score = entries.reduce((sum, entry) => sum + entry.score, 0);
  const primary = [...entries].sort((left, right) => Math.abs(right.score) - Math.abs(left.score))[0];
  const label = score >= 2 ? "Crew backs it" : score <= -2 ? "Crew objects" : "Crew split";
  const compact = primary
    ? `${score >= 0 ? "+" : ""}${score} crew | ${primary.name} ${primary.stance === "objects" ? "objects" : primary.stance === "backs" ? "backs" : "weighs"}`
    : "No crew read";
  const detail = entries.map((entry) => `${entry.name}: ${crewPreferenceLabel(entry.preference)} ${entry.score >= 0 ? "+" : ""}${entry.score}`).join(" | ");

  return {
    score,
    label,
    compact,
    detail,
    entries,
  };
}

export function updateCrewProfilesForVoyage(
  state: GameState,
  voyage: Voyage,
  context: {
    expectedProfit: number;
    crewStrain: number;
    hullWear: number;
  }
) {
  if (!state.crew.length) return [];
  state.crewProfiles ??= {};
  const read = crewRouteReadFor(state, voyage.fromId, voyage.toId, {
    cargoUnits: cargoUnits(state),
    expectedProfit: context.expectedProfit,
    sailPlan: voyage.sailPlan ?? state.sailPlan,
  });
  const changed: string[] = [];

  for (const entry of read.entries) {
    const profile = crewProfileFor(state, entry.crewId);
    const strainDelta = Math.max(0, context.crewStrain + Math.floor(context.hullWear / 5) + (entry.score <= -2 ? 2 : 0) - (entry.score >= 2 ? 1 : 0));
    const recovery = entry.score >= 2 && context.hullWear <= 3 && context.crewStrain <= 1 ? 5 : entry.score >= 1 ? 2 : 0;
    const loyaltyDelta = entry.score >= 2 ? 2 : entry.score <= -2 ? -2 : context.hullWear <= 2 ? 1 : 0;
    const next = {
      ...profile,
      loyalty: clamp(profile.loyalty + loyaltyDelta, 0, 100),
      strain: clamp(profile.strain + strainDelta - recovery, 0, 100),
      lastRoute: `${voyage.fromId}->${voyage.toId}`,
    };
    const demand = demandForProfile(next, entry.score, context.expectedProfit, context.hullWear, context.crewStrain);
    if (demand && next.demand !== demand) {
      next.demand = demand;
      next.demandExpires = state.day + 8;
      changed.push(`${entry.name} wants ${crewDemandLabel(demand)}`);
    } else if (next.demand && next.strain < 28) {
      delete next.demand;
      delete next.demandExpires;
      changed.push(`${entry.name} settled down`);
    }
    state.crewProfiles[entry.crewId] = next;
  }

  if (Math.abs(read.score) >= 2) changed.unshift(read.compact);
  return changed;
}

export function relieveCrewProfilesForShoreLeave(state: GameState) {
  if (!state.crew.length) return 0;
  state.crewProfiles ??= {};
  let relieved = 0;
  for (const crewId of state.crew) {
    const profile = crewProfileFor(state, crewId);
    const nextStrain = clamp(profile.strain - 36, 0, 100);
    const next = {
      ...profile,
      loyalty: clamp(profile.loyalty + 2, 0, 100),
      strain: nextStrain,
    };
    if (nextStrain <= 40 && (next.demand === "shore_leave" || next.demand === "safer_orders")) {
      delete next.demand;
      delete next.demandExpires;
    }
    if (nextStrain !== profile.strain || next.loyalty !== profile.loyalty || next.demand !== profile.demand) relieved += 1;
    state.crewProfiles[crewId] = next;
  }
  return relieved;
}

function crewPreferenceScore(
  profile: CrewProfile,
  metrics: {
    cargoUnits: number;
    cannons: number;
    crewStrain: number;
    days: number;
    expectedProfit: number;
    pressure: number;
    risk: number;
    sailPlan: SailPlanId;
    speedDelta: number;
    wear: number;
  }
) {
  let score = 0;
  if (profile.preference === "safe_water") {
    if (metrics.risk <= 0.25 && metrics.wear <= 4 && metrics.crewStrain <= 1) score += 2;
    if (metrics.sailPlan === "cautious" || metrics.sailPlan === "quiet") score += 1;
    if (metrics.risk >= 0.36 || metrics.wear >= 8 || metrics.crewStrain >= 4 || (metrics.sailPlan === "hard" && metrics.pressure >= 0.44)) score -= 3;
  }
  if (profile.preference === "fast_water") {
    if (metrics.speedDelta >= 9 || (metrics.sailPlan === "hard" && metrics.risk < 0.36)) score += 2;
    if (metrics.days <= 3) score += 1;
    if (metrics.speedDelta <= -5 || metrics.sailPlan === "quiet") score -= 2;
  }
  if (profile.preference === "profitable_cargo") {
    if (metrics.expectedProfit >= 420) score += 3;
    else if (metrics.expectedProfit >= 120) score += 2;
    else if (metrics.cargoUnits > 0 && metrics.expectedProfit > 0) score += 1;
    if (metrics.cargoUnits <= 0 || metrics.expectedProfit < 0) score -= 2;
  }
  if (profile.preference === "armed_routes") {
    if (metrics.risk >= 0.28 && metrics.cannons >= 2) score += 2;
    if (metrics.sailPlan === "hard" && metrics.risk >= 0.22) score += 1;
    if (metrics.risk >= 0.36 && metrics.cannons <= 1) score -= 3;
    if (metrics.risk <= 0.16 || metrics.sailPlan === "quiet") score -= 1;
  }

  if (profile.demand === "safer_orders") score += metrics.risk <= 0.26 && metrics.sailPlan !== "hard" ? 1 : -2;
  if (profile.demand === "shore_leave") score += metrics.crewStrain <= 1 && metrics.wear <= 4 ? 0 : -1;
  if (profile.demand === "profit_share") score += metrics.expectedProfit >= 280 ? 1 : -2;
  if (profile.demand === "action") score += metrics.risk >= 0.25 || metrics.sailPlan === "hard" ? 1 : -1;
  if (profile.strain >= 72 && (metrics.wear >= 6 || metrics.crewStrain >= 3 || metrics.sailPlan === "hard")) score -= 2;
  if (profile.loyalty >= 80 && score < 0) score += 1;
  return clamp(score, -5, 5);
}

function crewRouteReason(profile: CrewProfile, score: number) {
  if (profile.demand) return `wants ${crewDemandLabel(profile.demand)}`;
  if (score >= 2) return `likes ${crewPreferenceLabel(profile.preference).toLowerCase()}`;
  if (score <= -2) return `resists ${crewPreferenceLabel(profile.preference).toLowerCase()} mismatch`;
  return `weighs ${crewPreferenceLabel(profile.preference).toLowerCase()}`;
}

function demandForProfile(profile: CrewProfile, score: number, expectedProfit: number, hullWear: number, crewStrain: number) {
  if (profile.strain < 58 && score > -3) return profile.demand;
  if (profile.preference === "safe_water" && (hullWear >= 7 || crewStrain >= 4 || score <= -3)) return "safer_orders";
  if (profile.preference === "profitable_cargo" && expectedProfit < 160 && profile.strain >= 48) return "profit_share";
  if (profile.preference === "armed_routes" && score <= -2 && profile.strain >= 44) return "action";
  if (profile.strain >= 68) return "shore_leave";
  return profile.demand;
}
