import { shipCatalog } from "./data";
import { clamp } from "./math";
import { defaultOceanField, oceanShipResponseSummary, shipPhysicsProfileFor, type OceanShipResponseSummary, type ShipPhysicsProfile } from "./ocean";
import { createInitialState } from "./reducer";
import { cargoUnits, routeConditions, routeDays, routePhysicsProfile, routeRisk, routeWearEstimate } from "./routing";
import type { GameState } from "./types";

export type SailingPhysicsReportOptions = {
  day?: number;
  fromId?: string;
  generatedAt?: string;
  toId?: string;
};

export type SailingPhysicsShipCase = {
  shipId: string;
  shipName: string;
  cargoLoad: number;
  route: {
    fromId: string;
    toId: string;
    days: number;
    risk: number;
    hullWear: number;
    pressure: number;
    cargoRisk: number;
    crewStrain: number;
    seaStateLabel: string;
    tacticLabel: string;
    tacticDetail: string;
    explanation: string;
  };
  water: {
    roughness: number;
    stormIntensity: number;
    waveEnergy: number;
    beamSea: number;
    cargoSlam: number;
    followingSea: number;
    peakWaveHeight: number;
  };
  profile: ShipPhysicsProfile;
  motion: OceanShipResponseSummary;
};

export type SailingPhysicsReport = {
  schema: 1;
  generatedAt: string;
  oceanFieldId: string;
  route: {
    day: number;
    fromId: string;
    toId: string;
    headingDegrees: number;
    samples: number;
  };
  shipCases: SailingPhysicsShipCase[];
  ranges: {
    hullResponse: NumberRange;
    routeRisk: NumberRange;
    routeWear: NumberRange;
    wakeLength: NumberRange;
    wakeSpread: NumberRange;
    wakeTurbulence: NumberRange;
  };
  comparisons: {
    clipperWakeLengthAdvantage: number;
    heavyWakeSpreadAdvantage: number;
    roughHullDampingAdvantage: number;
    loadedCarrierWakeSpreadLift: number;
    loadedCarrierMotionDamping: number;
  };
  gates: {
    singleOceanModel: ReportGate;
    shipClassMotion: ReportGate;
    wakeDifferentiation: ReportGate;
    loadedWake: ReportGate;
    roughHullDamping: ReportGate;
    routeReadability: ReportGate;
    all: ReportGate;
  };
  decision: {
    recommendation: "integrated-oceanfield-sailing-v1" | "needs-sailing-physics-work";
    reason: string;
  };
  nextSteps: string[];
};

type NumberRange = {
  min: number;
  max: number;
};

type ReportGate = {
  pass: boolean;
  metric: number | string;
  threshold: string;
};

const defaultShipCases = [
  { shipId: "coastal_sloop", cargoLoad: 0.25 },
  { shipId: "clipper_kite", cargoLoad: 0.32 },
  { shipId: "harbor_cutter", cargoLoad: 0.3 },
  { shipId: "iron_barge", cargoLoad: 0.72 },
  { shipId: "league_carrier", cargoLoad: 0.86 },
] as const;

export function createSailingPhysicsReport(options: SailingPhysicsReportOptions = {}): SailingPhysicsReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const day = Math.max(1, Math.round(options.day ?? 22));
  const fromId = options.fromId ?? "grayhaven";
  const toId = options.toId ?? "stormhook";
  const route = defaultOceanField.sampleRoute({ day, fromId, toId, samples: 10 });
  const heading = Math.atan2(route.route.y, route.route.x);
  const shipCases = defaultShipCases.map((entry) => shipCaseFor(day, fromId, toId, heading, entry.shipId, entry.cargoLoad));
  const ranges = summarizeRanges(shipCases);
  const comparisons = summarizeComparisons(shipCases);
  const gates = summarizeGates(shipCases, ranges, comparisons);
  const allPass = Object.entries(gates)
    .filter(([key]) => key !== "all")
    .every(([, gateValue]) => gateValue.pass);
  gates.all = gate(allPass, allPass ? "all passed" : failedGateNames(gates), "route, ship motion, wake, cargo, damping, and readability gates pass");

  return {
    schema: 1,
    generatedAt,
    oceanFieldId: defaultOceanField.id,
    route: {
      day,
      fromId,
      toId,
      headingDegrees: round((heading * 180) / Math.PI, 1),
      samples: shipCases.length,
    },
    shipCases,
    ranges,
    comparisons,
    gates,
    decision: {
      recommendation: gates.all.pass ? "integrated-oceanfield-sailing-v1" : "needs-sailing-physics-work",
      reason: gates.all.pass
        ? "Route ETA, risk, hull wear, storm pressure, route explanations, ship motion, and wake behavior are all driven by the shared OceanField with distinct ship-class response."
        : `Sailing physics needs more work before M-038 can close; failed gates: ${failedGateNames(gates)}.`,
    },
    nextSteps: gates.all.pass
      ? [
          "Tune persistent wake ribbons in MapScene using wakeLength, wakeSpread, wakeTurbulence, and wakePersistence.",
          "Expose ship response in playtest evidence so upgrades can be judged by feel as well as economy.",
          "Rerun ocean benchmark after wake persistence gets more visual geometry.",
        ]
      : ["Fix the failed gates, then rerun npm run sailing:physics."],
  };
}

function shipCaseFor(day: number, fromId: string, toId: string, heading: number, shipId: string, cargoLoad: number): SailingPhysicsShipCase {
  const state = stateForShip(shipId, cargoLoad, day, fromId, toId);
  const route = defaultOceanField.sampleRoute({ day, fromId, toId, samples: 10 });
  const point = defaultOceanField.sampleRoutePoint({ day, fromId, toId, progress: 0.52, time: 2.2, width: 1000, height: 700 });
  const conditions = routeConditions(state, fromId, toId);
  const physics = routePhysicsProfile(state, fromId, toId);
  const wear = routeWearEstimate(state, fromId, toId);
  const ship = shipCatalog.find((entry) => entry.id === shipId) ?? shipCatalog[0];

  return {
    shipId: ship.id,
    shipName: ship.name,
    cargoLoad: round(cargoUnits(state) / Math.max(1, ship.cargoCap), 3),
    route: {
      fromId,
      toId,
      days: routeDays(state, fromId, toId),
      risk: round(routeRisk(state, fromId, toId), 3),
      hullWear: wear.hullWear,
      pressure: physics.pressure,
      cargoRisk: physics.cargoRisk,
      crewStrain: physics.crewStrain,
      seaStateLabel: conditions.seaStateLabel,
      tacticLabel: conditions.tacticLabel,
      tacticDetail: conditions.tacticDetail,
      explanation: conditions.planAdvice,
    },
    water: {
      roughness: round(route.roughness, 3),
      stormIntensity: round(route.stormIntensity, 3),
      waveEnergy: round(route.waveEnergy, 3),
      beamSea: route.seaState.beamSea,
      cargoSlam: route.seaState.cargoSlam,
      followingSea: route.seaState.followingSea,
      peakWaveHeight: route.seaState.peakWaveHeight,
    },
    profile: shipPhysicsProfileFor(ship.id, cargoLoad),
    motion: oceanShipResponseSummary(point.normX, point.normY, day, 2.2, heading, ship.id, cargoLoad),
  };
}

function stateForShip(shipId: string, cargoLoad: number, day: number, fromId: string, toId: string): GameState {
  const state = createInitialState();
  const ship = shipCatalog.find((entry) => entry.id === shipId) ?? shipCatalog[0];
  state.day = day;
  state.currentPort = fromId;
  state.selectedPort = toId;
  state.currentShip = ship.id;
  state.ownedShips = Array.from(new Set([...state.ownedShips, ship.id]));
  state.sailPlan = "balanced";
  const targetUnits = Math.round(ship.cargoCap * clamp(cargoLoad, 0, 1));
  if (targetUnits > 0) {
    state.cargo.iron = Math.max(1, Math.floor(targetUnits / 2));
    state.cargoBasis.iron = 50;
    if (cargoUnits(state) < targetUnits) {
      state.cargo.tea = targetUnits - cargoUnits(state);
      state.cargoBasis.tea = 42;
    }
  }
  state.hull = ship.hullMax;
  return state;
}

function summarizeRanges(shipCases: SailingPhysicsShipCase[]): SailingPhysicsReport["ranges"] {
  return {
    hullResponse: range(shipCases.map((entry) => entry.motion.hullResponse)),
    routeRisk: range(shipCases.map((entry) => entry.route.risk)),
    routeWear: range(shipCases.map((entry) => entry.route.hullWear)),
    wakeLength: range(shipCases.map((entry) => entry.motion.wakeLength)),
    wakeSpread: range(shipCases.map((entry) => entry.motion.wakeSpread)),
    wakeTurbulence: range(shipCases.map((entry) => entry.motion.wakeTurbulence)),
  };
}

function summarizeComparisons(shipCases: SailingPhysicsShipCase[]): SailingPhysicsReport["comparisons"] {
  const clipper = caseById(shipCases, "clipper_kite");
  const iron = caseById(shipCases, "iron_barge");
  const harbor = caseById(shipCases, "harbor_cutter");
  const sloop = caseById(shipCases, "coastal_sloop");
  const loadedCarrier = caseById(shipCases, "league_carrier");
  const emptyCarrier = {
    profile: shipPhysicsProfileFor("league_carrier", 0),
    motion: oceanShipResponseSummary(0.5, 0.5, 22, 2.2, -0.72, "league_carrier", 0),
  };

  return {
    clipperWakeLengthAdvantage: round(clipper.motion.wakeLength - iron.motion.wakeLength, 3),
    heavyWakeSpreadAdvantage: round(iron.motion.wakeSpread - clipper.motion.wakeSpread, 3),
    roughHullDampingAdvantage: round(Math.min(iron.profile.roughWaterDamping, harbor.profile.roughWaterDamping) - sloop.profile.roughWaterDamping, 3),
    loadedCarrierWakeSpreadLift: round(loadedCarrier.profile.wakeSpread - emptyCarrier.profile.wakeSpread, 3),
    loadedCarrierMotionDamping: round(emptyCarrier.profile.rollResponse - loadedCarrier.profile.rollResponse, 3),
  };
}

function summarizeGates(
  shipCases: SailingPhysicsShipCase[],
  ranges: SailingPhysicsReport["ranges"],
  comparisons: SailingPhysicsReport["comparisons"]
): SailingPhysicsReport["gates"] {
  const readable = shipCases.every((entry) => entry.route.tacticLabel.length > 0 && entry.route.explanation.length > 0 && entry.route.seaStateLabel.length > 0);
  const routeDriven = shipCases.every(
    (entry) =>
      entry.route.days >= 2 &&
      entry.route.risk > 0 &&
      entry.route.hullWear >= 0 &&
      entry.route.pressure >= 0 &&
      entry.water.peakWaveHeight >= 4 &&
      entry.motion.signalKeys.includes("wake-length")
  );
  return {
    singleOceanModel: gate(routeDriven, `${shipCases.length} ship cases`, "route ETA, risk, wear, pressure, water, and motion share OceanField samples"),
    shipClassMotion: gate(ranges.hullResponse.max - ranges.hullResponse.min >= 0.035, rangeText(ranges.hullResponse), "ship-class hull response spread >= 0.035"),
    wakeDifferentiation: gate(
      ranges.wakeLength.max - ranges.wakeLength.min >= 0.2 && ranges.wakeSpread.max - ranges.wakeSpread.min >= 0.1,
      `length ${rangeText(ranges.wakeLength)}, spread ${rangeText(ranges.wakeSpread)}`,
      "wake length spread >= 0.2 and wake spread >= 0.1"
    ),
    loadedWake: gate(
      comparisons.loadedCarrierWakeSpreadLift >= 0.12 && comparisons.loadedCarrierMotionDamping >= 0.05,
      `spread +${comparisons.loadedCarrierWakeSpreadLift}, damping ${comparisons.loadedCarrierMotionDamping}`,
      "loaded freighter wake spreads and motion damps"
    ),
    roughHullDamping: gate(
      comparisons.roughHullDampingAdvantage >= 0.05,
      comparisons.roughHullDampingAdvantage,
      "rough-water hulls damp response more than starter hull"
    ),
    routeReadability: gate(readable, shipCases.map((entry) => entry.route.tacticLabel).join(", "), "every case keeps tactic and explanation labels"),
    all: gate(false, "pending", "all gates pass"),
  };
}

function caseById(shipCases: SailingPhysicsShipCase[], shipId: string) {
  return shipCases.find((entry) => entry.shipId === shipId) ?? shipCases[0];
}

function failedGateNames(gates: SailingPhysicsReport["gates"]) {
  return Object.entries(gates)
    .filter(([key, value]) => key !== "all" && !value.pass)
    .map(([key]) => key)
    .join(", ");
}

function gate(pass: boolean, metric: number | string, threshold: string): ReportGate {
  return { pass, metric, threshold };
}

function range(values: number[]): NumberRange {
  return {
    min: round(Math.min(...values), 3),
    max: round(Math.max(...values), 3),
  };
}

function rangeText(value: NumberRange) {
  return `${value.min}..${value.max}`;
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
