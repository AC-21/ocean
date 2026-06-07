import { factions, ports, shipCatalog } from "./data";
import { clamp } from "./math";
import { cargoUnits, routeConditions, routeDays, routeRisk, routeWearEstimate } from "./routing";
import { shipHandlingFor, shipHandlingLabel, shipIdentitySummary, shipResaleProfile, shipUpgradePath } from "./ships";
import { deriveShipStats } from "./stats";
import type { GameState, RouteWearEstimate, ShipSpec, ShipStats, UpgradeSpec } from "./types";

export type YardItemSpec = Pick<ShipSpec, "id" | "factionId" | "price"> | Pick<UpgradeSpec, "factionId" | "cost">;

export type ShipRoutePreview = {
  days: number;
  risk: number;
  speedDelta: number;
  wear: RouteWearEstimate;
  handlingLabel: string;
};

export type RouteFitDelta = {
  days: number;
  risk: number;
  speed: number;
  wear: number;
};

export type BuildArchetypeId =
  | "fast_courier"
  | "heavy_cargo"
  | "armored_hauler"
  | "patrol_cutter"
  | "smuggler"
  | "contract_runner"
  | "storm_sailor"
  | "market_manipulator";

export type BuildFit = {
  id: BuildArchetypeId;
  label: string;
  score: number;
  summary: string;
};

export type BuildFitDelta = BuildFit & {
  delta: number;
};

export type ShipyardPreview = {
  shipId: string;
  owned: boolean;
  active: boolean;
  affordable: boolean;
  buildDelta: BuildFitDelta[];
  buildFits: BuildFit[];
  cargoFits: boolean;
  stats: ShipStats;
  route: ShipRoutePreview | null;
  routeDelta: RouteFitDelta | null;
  identity: string;
  upgradePath: string;
  resaleProfile: string;
  handlingLabel: string;
};

export function stateWithShip(state: GameState, shipId: string): GameState {
  const ship = shipCatalog.find((entry) => entry.id === shipId);
  if (!ship) return state;
  const owned = state.ownedShips.includes(ship.id);
  const next = { ...state, currentShip: ship.id };
  const stats = deriveShipStats(next);
  return {
    ...next,
    hull: owned ? clamp(state.hull, 0, stats.hullMax) : stats.hullMax,
  };
}

export function previewShip(state: GameState, shipId: string): ShipyardPreview | null {
  const ship = shipCatalog.find((entry) => entry.id === shipId);
  if (!ship) return null;
  const previewState = stateWithShip(state, shipId);
  const currentStats = deriveShipStats(state);
  const stats = deriveShipStats(previewState);
  const cargoUsed = cargoUnits(state);
  const hasRoute = state.currentPort !== state.selectedPort;
  const routeDelta = hasRoute ? selectedRouteDelta(state, previewState) : null;
  const buildFits = topBuildFitsForStats(stats, ship.id, 2);

  return {
    shipId,
    owned: state.ownedShips.includes(ship.id),
    active: state.currentShip === ship.id,
    affordable: state.cash >= yardPriceFor(state, ship) || state.ownedShips.includes(ship.id),
    cargoFits: cargoUsed <= stats.cargoCap,
    buildDelta: buildFitDeltaForStats(currentStats, stats, ship.id).slice(0, 3),
    buildFits,
    stats,
    identity: shipIdentitySummary(ship),
    upgradePath: shipUpgradePath(ship),
    resaleProfile: shipResaleProfile(ship),
    handlingLabel: shipHandlingLabel(ship.id),
    route: hasRoute
      ? {
          days: routeDays(previewState, state.currentPort, state.selectedPort),
          risk: routeRisk(previewState, state.currentPort, state.selectedPort),
          speedDelta: routeConditions(previewState, state.currentPort, state.selectedPort).speedDelta,
          wear: routeWearEstimate(previewState, state.currentPort, state.selectedPort),
          handlingLabel: shipHandlingLabel(ship.id),
        }
      : null,
    routeDelta,
  };
}

export function topBuildFitsForStats(stats: ShipStats, shipId: string, limit = 2): BuildFit[] {
  const handling = shipHandlingFor(shipId);
  return buildArchetypes
    .map((archetype) => ({
      id: archetype.id,
      label: archetype.label,
      score: Math.round(archetype.score(stats, handling)),
      summary: archetype.summary,
    }))
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, limit);
}

export function buildFitDeltaForStats(before: ShipStats, after: ShipStats, shipId: string): BuildFitDelta[] {
  const beforeScores = new Map(topBuildFitsForStats(before, shipId, buildArchetypes.length).map((fit) => [fit.id, fit.score]));
  return topBuildFitsForStats(after, shipId, buildArchetypes.length)
    .map((fit) => ({ ...fit, delta: fit.score - (beforeScores.get(fit.id) ?? 0) }))
    .filter((fit) => fit.delta !== 0)
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta) || right.score - left.score);
}

function selectedRouteDelta(state: GameState, nextState: GameState): RouteFitDelta {
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

const buildArchetypes: Array<{
  id: BuildArchetypeId;
  label: string;
  score: (stats: ShipStats, handling: ReturnType<typeof shipHandlingFor>) => number;
  summary: string;
}> = [
  {
    id: "fast_courier",
    label: "Fast Courier",
    score: (stats, handling) => stats.speed * 24 + stats.navigation * 13 + stats.openWater * 7 + handling.windAffinity * 210 + handling.currentAffinity * 120,
    summary: "short deadlines, wind windows, quick resale runs",
  },
  {
    id: "heavy_cargo",
    label: "Heavy Cargo",
    score: (stats, handling) =>
      stats.cargoCap * 1.8 +
      stats.crewCap * 7 +
      stats.negotiation * 6 +
      (1 - handling.cargoDragModifier) * 95 +
      (1 - handling.cargoRiskModifier) * 70,
    summary: "loaded routes, bulk margins, hold-first upgrade timing",
  },
  {
    id: "armored_hauler",
    label: "Armored Hauler",
    score: (stats, handling) =>
      stats.cargoCap * 1.4 + stats.hullMax * 0.36 + stats.cannons * 15 + stats.openWater * 8 - handling.riskModifier * 220 + (1 - handling.wearModifier) * 90,
    summary: "big freight, safer crossings, fewer pirate concessions",
  },
  {
    id: "patrol_cutter",
    label: "Patrol Cutter",
    score: (stats, handling) =>
      stats.cannons * 20 +
      stats.navigation * 17 +
      stats.negotiation * 15 +
      stats.speed * 13 +
      stats.openWater * 11 -
      Math.max(0, stats.cargoCap - 32) * 0.8 -
      handling.riskModifier * 260 +
      Math.max(0, 34 - stats.cargoCap) * 1.2 +
      (1 - handling.wearModifier) * 85,
    summary: "customs pressure, pirate hails, escort lanes, compact cargo",
  },
  {
    id: "smuggler",
    label: "Smuggler",
    score: (stats, handling) => stats.speed * 17 + stats.negotiation * 20 + stats.navigation * 8 + stats.openWater * 8 + stats.cargoCap * 0.55 + handling.windAffinity * 140,
    summary: "tariffs, inspections, small high-value cargo",
  },
  {
    id: "contract_runner",
    label: "Contract Runner",
    score: (stats, handling) => stats.navigation * 18 + stats.speed * 14 + stats.cargoCap * 0.9 + stats.crewCap * 9 + stats.negotiation * 8 + handling.riskModifier * -130,
    summary: "deadlines, multi-stop work, loaded route discipline",
  },
  {
    id: "storm_sailor",
    label: "Storm Sailor",
    score: (stats, handling) => stats.openWater * 25 + stats.hullMax * 0.28 + stats.navigation * 14 + stats.speed * 7 + handling.roughWaterRelief * 360 + (1 - handling.wearModifier) * 150,
    summary: "hard water, storm fronts, open-sea gambles",
  },
  {
    id: "market_manipulator",
    label: "Market Manipulator",
    score: (stats) => stats.negotiation * 25 + stats.cargoCap * 0.78 + stats.navigation * 8 + stats.crewCap * 7 + stats.speed * 5,
    summary: "permits, price edges, stock pressure, deal timing",
  },
];

export function yardPriceFor(state: Pick<GameState, "currentPort" | "factionStanding">, item: YardItemSpec) {
  const base = "price" in item ? item.price : item.cost;
  if (base <= 0) return 0;
  const currentPort = ports.find((port) => port.id === state.currentPort) ?? ports[0];
  const factionId = item.factionId ?? currentPort.faction;
  const standing = state.factionStanding[factionId] ?? 0;
  const local = currentPort.faction === factionId;
  const standingModifier = clamp(1 - standing * 0.004, 0.86, 1.1);
  const remoteModifier = local ? 1 : 1.12;
  return Math.max(1, Math.round(base * standingModifier * remoteModifier));
}

export function yardResaleValueFor(state: Pick<GameState, "currentPort" | "factionStanding">, item: YardItemSpec) {
  const base = "price" in item ? item.price : item.cost;
  if (base <= 0) return 0;
  const currentPort = ports.find((port) => port.id === state.currentPort) ?? ports[0];
  const factionId = item.factionId ?? currentPort.faction;
  const standing = state.factionStanding[factionId] ?? 0;
  const local = currentPort.faction === factionId;
  const standingModifier = clamp(1 + standing * 0.0025, 0.9, 1.08);
  const yardModifier = local ? 0.58 : 0.5;
  const resaleModifier = "price" in item ? shipHandlingFor(item.id).resaleModifier : 1;
  return Math.max(1, Math.round(base * yardModifier * standingModifier * resaleModifier));
}

export function yardSourceLabel(state: Pick<GameState, "currentPort" | "factionStanding">, item: YardItemSpec) {
  const currentPort = ports.find((port) => port.id === state.currentPort) ?? ports[0];
  const factionId = item.factionId ?? currentPort.faction;
  const faction = factions.find((entry) => entry.id === factionId);
  const local = currentPort.faction === factionId;
  const standing = state.factionStanding[factionId] ?? 0;
  const standingText = standing >= 8 ? "favored" : standing <= -6 ? "strained" : "neutral";
  return `${faction?.name ?? "Open"} ${local ? "yard" : "order"} | ${standingText}`;
}
