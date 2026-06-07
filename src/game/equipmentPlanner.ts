import { equipmentCatalog, factions, ports } from "./data";
import { crewFacilityFor } from "./crew";
import { equipmentFitBonusFor, equipmentInSlot, installEquipmentIds } from "./outfitting";
import { cargoUnits, routeConditions, routeDays, routePhysicsProfile, routeRisk, routeWearEstimate } from "./routing";
import { buildFitDeltaForStats, topBuildFitsForStats, yardPriceFor, type BuildFit, type BuildFitDelta } from "./shipyard";
import { deriveShipStats } from "./stats";
import type { GameState, ShipStats, UpgradeSpec } from "./types";

export type EquipmentRouteDelta = {
  days: number;
  risk: number;
  speed: number;
  wear: number;
};

export type EquipmentRecommendation = {
  affordable: boolean;
  buildDelta: BuildFitDelta[];
  buildFits: BuildFit[];
  cargoFits: boolean;
  crewFits: boolean;
  delta: Partial<ShipStats>;
  fitLabel: string | null;
  gap: number;
  item: UpgradeSpec;
  price: number;
  reason: string;
  replacing: UpgradeSpec | null;
  routeDelta: EquipmentRouteDelta | null;
  score: number;
};

const statWeights: Record<keyof ShipStats, number> = {
  cargoCap: 1.5,
  cannons: 12,
  speed: 16,
  openWater: 15,
  crewCap: 12,
  hullMax: 0.55,
  navigation: 13,
  negotiation: 10,
};

export function equipmentRecommendationsFor(state: GameState, limit = 3): EquipmentRecommendation[] {
  return equipmentCatalog
    .filter((item) => !state.equipment.includes(item.id))
    .map((item) => equipmentRecommendationFor(state, item))
    .filter((recommendation) => recommendation.cargoFits && recommendation.crewFits)
    .sort((a, b) => b.score - a.score || a.price - b.price || a.item.name.localeCompare(b.item.name))
    .slice(0, limit);
}

export function equipmentRecommendationFor(state: GameState, item: UpgradeSpec): EquipmentRecommendation {
  const currentStats = deriveShipStats(state);
  const nextEquipment = installEquipmentIds(state.equipment, item);
  const nextStats = deriveShipStats({ ...state, equipment: nextEquipment });
  const replacing = equipmentInSlot(state, item.slot);
  const price = yardPriceFor(state, item);
  const delta = statDelta(currentStats, nextStats);
  const buildFits = topBuildFitsForStats(nextStats, state.currentShip, 2);
  const buildDelta = buildFitDeltaForStats(currentStats, nextStats, state.currentShip);
  const routeDelta = selectedRouteDelta(state, nextEquipment);
  const facilityScore = crewFacilityScore(state, nextEquipment);
  const cargoFits = cargoUnits(state) <= nextStats.cargoCap;
  const crewFits = state.crew.length <= nextStats.crewCap;
  const affordable = state.cash >= price;
  const gap = Math.max(0, price - state.cash);
  const fit = equipmentFitBonusFor(state.currentShip, item);
  const pressure = buildPressureScore(state, currentStats, delta);
  const contextualPressure = contextualRefitPressure(state, item, currentStats, delta, routeDelta);
  const routeScore = routeDelta ? routeDelta.days * 20 + routeDelta.risk * 160 + routeDelta.wear * 8 + routeDelta.speed * 0.7 : 0;
  const buildScore = buildDelta.reduce((sum, fit) => sum + Math.max(0, fit.delta) * (fit.id === "contract_runner" ? 0.8 : 0.62), 0);
  const statScore = Object.entries(delta).reduce((sum, [key, value]) => {
    return sum + (value ?? 0) * statWeights[key as keyof ShipStats];
  }, 0);
  const score =
    statScore +
    routeScore +
    buildScore +
    facilityScore +
    pressure +
    contextualPressure.score +
    (fit ? 8 : 0) +
    (affordable ? 6 : gap <= 650 ? -8 : -22) +
    (replacing ? -3 : 2) +
    (cargoFits && crewFits ? 0 : -1000);

  return {
    affordable,
    buildDelta,
    buildFits,
    cargoFits,
    crewFits,
    delta,
    fitLabel: fit?.label ?? null,
    gap,
    item,
    price,
    reason: recommendationReason({
      affordable,
      buildDelta,
      contextualReason: contextualPressure.reason,
      delta,
      facilityScore,
      fitLabel: fit?.label ?? null,
      gap,
      routeDelta,
      state,
    }),
    replacing: replacing?.id === item.id ? null : replacing,
    routeDelta,
    score: Math.round(score * 10) / 10,
  };
}

function selectedRouteDelta(state: GameState, nextEquipment: string[]): EquipmentRouteDelta | null {
  if (state.currentPort === state.selectedPort) return null;
  const nextState = { ...state, equipment: nextEquipment };
  const currentWear = routeWearEstimate(state, state.currentPort, state.selectedPort);
  const nextWear = routeWearEstimate(nextState, state.currentPort, state.selectedPort);
  const currentConditions = routeConditions(state, state.currentPort, state.selectedPort);
  const nextConditions = routeConditions(nextState, state.currentPort, state.selectedPort);
  return {
    days: routeDays(state, state.currentPort, state.selectedPort) - routeDays(nextState, state.currentPort, state.selectedPort),
    risk: routeRisk(state, state.currentPort, state.selectedPort) - routeRisk(nextState, state.currentPort, state.selectedPort),
    speed: nextConditions.speedDelta - currentConditions.speedDelta,
    wear: currentWear.hullWear - nextWear.hullWear,
  };
}

function statDelta(before: ShipStats, after: ShipStats): Partial<ShipStats> {
  const delta: Partial<ShipStats> = {};
  for (const key of Object.keys(before) as Array<keyof ShipStats>) {
    const value = after[key] - before[key];
    if (value !== 0) delta[key] = value;
  }
  return delta;
}

function buildPressureScore(state: GameState, stats: ShipStats, delta: Partial<ShipStats>) {
  let score = 0;
  const holdPressure = cargoUnits(state) / Math.max(1, stats.cargoCap);
  if (holdPressure >= 0.7 && (delta.cargoCap ?? 0) > 0) score += 16;
  if (state.crew.length >= stats.crewCap && (delta.crewCap ?? 0) > 0) score += 16;
  if (state.hull <= stats.hullMax * 0.58 && (delta.hullMax ?? 0) > 0) score += 10;
  if ((delta.cannons ?? 0) > 0 && stats.cannons <= 2) score += 8;
  if ((delta.openWater ?? 0) > 0 && stats.openWater <= 2) score += 8;
  return score;
}

function contextualRefitPressure(
  state: GameState,
  item: UpgradeSpec,
  stats: ShipStats,
  delta: Partial<ShipStats>,
  routeDelta: EquipmentRouteDelta | null
) {
  if (item.id === "drogue_anchor") return droguePressure(state, stats, routeDelta);
  if (item.id === "customs_ledger") return customsLedgerPressure(state, stats);
  if (item.id === "long_nines") return longNinesPressure(state, stats);
  if (item.id === "watch_bunks") return watchBunksPressure(state, stats, delta);
  return { score: 0, reason: null as string | null };
}

function droguePressure(state: GameState, stats: ShipStats, routeDelta: EquipmentRouteDelta | null) {
  if (state.currentPort === state.selectedPort) return { score: stats.openWater <= 2 ? -5 : -12, reason: null };
  const conditions = routeConditions(state, state.currentPort, state.selectedPort);
  const physics = routePhysicsProfile(state, state.currentPort, state.selectedPort);
  const wear = routeWearEstimate(state, state.currentPort, state.selectedPort);
  const load = cargoUnits(state) / Math.max(1, stats.cargoCap);
  const hardWater =
    conditions.seaState.beamSea * 12 +
    conditions.seaState.cargoSlam * (10 + load * 8) +
    Math.max(0, conditions.stormIntensity - 0.22) * 14 +
    Math.max(0, conditions.roughness - 0.26) * 18 +
    Math.max(0, wear.hullWear - 4) * 1.6 +
    Math.max(0, physics.crewStrain - 1) * 1.2 +
    (routeDelta ? Math.max(0, routeDelta.risk) * 180 + Math.max(0, routeDelta.wear) * 5 : 0) -
    stats.openWater * 1.8;
  const score = hardWater >= 12 ? hardWater : hardWater - 10;
  return { score, reason: hardWater >= 12 ? "Hard-water control" : null };
}

function customsLedgerPressure(state: GameState, stats: ShipStats) {
  const politicalPressure = customsPressureForPort(state, state.currentPort) + (state.currentPort === state.selectedPort ? 0 : customsPressureForPort(state, state.selectedPort));
  const marketPressure =
    state.politicalEvents.filter((event) => event.expires >= state.day && (event.kind === "tariff" || event.kind === "strike")).length * 4 +
    (stats.negotiation <= 1 ? 5 : 0) +
    (state.captainSkills.brokerage > 0 ? 3 : 0);
  const pressure = politicalPressure + marketPressure;
  const score = pressure >= 12 ? pressure : pressure - 10;
  return { score, reason: pressure >= 12 ? "Customs edge" : null };
}

function longNinesPressure(state: GameState, stats: ShipStats) {
  const selectedRisk = state.currentPort === state.selectedPort ? 0 : routeRisk(state, state.currentPort, state.selectedPort);
  const selectedMemory = state.routeMemory[`${state.currentPort}->${state.selectedPort}`];
  const pirateHistory = selectedMemory ? selectedMemory.pirateTrouble * 6 + Math.max(0, selectedMemory.pirateTrouble / Math.max(1, selectedMemory.trips) - 0.24) * 22 : 0;
  const activePirate = state.encounter?.kind === "pirate" ? 18 : 0;
  const lowGunPressure = stats.cannons <= 2 ? 8 : stats.cannons <= 4 ? 3 : -8;
  const pressure = activePirate + pirateHistory + Math.max(0, selectedRisk - 0.26) * 72 + lowGunPressure;
  const score = pressure >= 11 ? pressure : pressure - 12;
  return { score, reason: pressure >= 11 ? "Pirate answer" : null };
}

function watchBunksPressure(state: GameState, stats: ShipStats, delta: Partial<ShipStats>) {
  const routeCrewStrain = state.currentPort === state.selectedPort ? 0 : routePhysicsProfile(state, state.currentPort, state.selectedPort).crewStrain;
  const profileStrain = state.crew.reduce((sum, crewId) => sum + Math.max(0, (state.crewProfiles[crewId]?.strain ?? 0) - 45) / 8, 0);
  const moralePressure = state.crew.length ? Math.max(0, 62 - state.crewMorale) * 0.42 : 0;
  const capPressure = state.crew.length >= stats.crewCap ? 12 : state.crew.length >= stats.crewCap - 1 && (delta.crewCap ?? 0) > 0 ? 5 : 0;
  const pressure = routeCrewStrain * 2.2 + profileStrain + moralePressure + capPressure + (state.crew.length >= 2 ? 4 : 0);
  const score = pressure >= 10 ? pressure : pressure - 8;
  return { score, reason: pressure >= 10 ? "Crew endurance" : null };
}

function customsPressureForPort(state: GameState, portId: string) {
  const port = ports.find((entry) => entry.id === portId);
  if (!port) return 0;
  const faction = factions.find((entry) => entry.id === port.faction);
  if (!faction) return 0;
  const standing = state.factionStanding[port.faction] ?? 0;
  const hasPermit = state.politicalEvents.some((event) => event.factionId === port.faction && event.kind === "permit" && event.expires >= state.day);
  const tariffUnits = faction.tariffGoods.reduce((sum, goodId) => sum + (state.cargo[goodId] ?? 0), 0);
  const activePolicy = state.politicalEvents
    .filter((event) => event.expires >= state.day && event.factionId === port.faction)
    .reduce((sum, event) => {
      if (event.kind === "inspection") return sum + 9;
      if (event.kind === "tariff") return sum + 6;
      if (event.kind === "permit") return sum - 4;
      return sum;
    }, 0);
  const smuggling = state.contracts
    .filter((contract) => contract.status === "active" && contract.kind === "smuggling")
    .reduce((sum, contract) => sum + (contract.destinationPortId === port.id ? 9 : 4), 0);
  const standingPressure = standing <= -4 ? Math.min(14, Math.abs(standing) * 1.2) : standing < 4 ? 2 : 0;
  const tariffPressure = tariffUnits ? 6 + Math.min(14, tariffUnits * 2.2) : 0;
  return Math.max(0, activePolicy + smuggling + standingPressure + tariffPressure + (!hasPermit && (tariffUnits || standing <= -4) ? 5 : 0));
}

function crewFacilityScore(state: GameState, nextEquipment: string[]) {
  const current = crewFacilityFor(state);
  const next = crewFacilityFor({ equipment: nextEquipment });
  if (current.id === next.id) return 0;
  const facilityValue =
    next.moraleRecoveryBonus * 1.4 +
    next.moraleStrainRelief * 4 +
    next.paydayMoraleBonus * 3 +
    next.shoreLeaveDiscount * 44 +
    (next.xpMultiplier - 1) * 60 +
    next.casualtyProtection * 180;
  const currentValue =
    current.moraleRecoveryBonus * 1.4 +
    current.moraleStrainRelief * 4 +
    current.paydayMoraleBonus * 3 +
    current.shoreLeaveDiscount * 44 +
    (current.xpMultiplier - 1) * 60 +
    current.casualtyProtection * 180;
  const crewMultiplier = state.crew.length ? 1 : 0.45;
  const moralePressure = state.crew.length && state.crewMorale < 56 ? 7 : 0;
  return Math.max(0, facilityValue - currentValue) * crewMultiplier + moralePressure;
}

function recommendationReason(input: {
  affordable: boolean;
  buildDelta: BuildFitDelta[];
  contextualReason: string | null;
  delta: Partial<ShipStats>;
  facilityScore: number;
  fitLabel: string | null;
  gap: number;
  routeDelta: EquipmentRouteDelta | null;
  state: GameState;
}) {
  if (!input.affordable) return `${input.gap} short`;
  if (cargoUnits(input.state) > deriveShipStats(input.state).cargoCap * 0.7 && (input.delta.cargoCap ?? 0) > 0) return "Hold pressure";
  if (input.state.crew.length >= deriveShipStats(input.state).crewCap && (input.delta.crewCap ?? 0) > 0) return "Crew growth";
  if (input.contextualReason) return input.contextualReason;
  if (input.routeDelta && (input.routeDelta.days > 0 || input.routeDelta.risk > 0.015 || input.routeDelta.wear > 0)) return "Lane fit";
  if (input.facilityScore >= 12 && input.state.crew.length) return input.state.crewMorale < 56 ? "Crew comfort" : "Crew facility";
  const buildGain = input.buildDelta.find((fit) => fit.delta >= 8);
  if (buildGain) return `${buildGain.label} build`;
  if ((input.delta.cannons ?? 0) > 0) return "Encounter answer";
  if (input.fitLabel) return input.fitLabel;
  if ((input.delta.openWater ?? 0) > 0) return "Open-water safety";
  if ((input.delta.speed ?? 0) > 0) return "Faster turns";
  return "Build depth";
}
