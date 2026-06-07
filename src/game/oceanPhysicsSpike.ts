import { goods, ports } from "./data";
import { marketStockCapacity, portLogisticsPressure, priceFor, type PortLogisticsPressure } from "./economy";
import { clamp } from "./math";
import { defaultOceanField, oceanShipResponseSummary, sampleRouteOcean } from "./ocean";
import { createInitialState } from "./reducer";
import { cargoUnits, routeConditions, routeDays, routePhysicsProfile, routeRisk, routeWearEstimate, shippingLanePressure } from "./routing";
import type { GameState, Market, MarketStock, Trend } from "./types";

export type OceanPhysicsSpikeOptions = {
  days?: number;
  generatedAt?: string;
};

export type OceanPhysicsSpikeReport = {
  schema: 1;
  generatedAt: string;
  oceanFieldId: string;
  routeCount: number;
  dayCount: number;
  waveSampling: {
    samples: number;
    beamSeaRange: NumberRange;
    cargoSlamRange: NumberRange;
    followingSeaRange: NumberRange;
    peakWaveHeightRange: NumberRange;
    pass: boolean;
  };
  shipResponse: {
    calm: ShipResponsePoint;
    rough: ShipResponsePoint;
    responseLift: number;
    pass: boolean;
  };
  routeReadability: {
    seaStateLabels: string[];
    tacticLabels: string[];
    minSpeedMultiplier: number;
    maxSpeedMultiplier: number;
    maxRisk: number;
    pass: boolean;
  };
  cargoSlamEffect: {
    route: string;
    day: number;
    cargoSlam: number;
    emptyPressure: number;
    loadedPressure: number;
    emptyCargoRisk: number;
    loadedCargoRisk: number;
    emptyWear: number;
    loadedWear: number;
    loadedCargoUnits: number;
    pass: boolean;
  };
  currentAndFreight: {
    followingRouteCount: number;
    contraryRouteCount: number;
    lanePressureRange: NumberRange;
    importPriceComparisons: PriceComparison[];
    exportPriceComparisons: PriceComparison[];
    pass: boolean;
  };
  gpuCost: {
    source: string | null;
    status: "not-attached" | "missing" | "passed" | "failed";
    minAverageFps: number | null;
    lowPowerCheaper: boolean | null;
    cases: Array<{
      id: string;
      averageFps: number;
      minAverageFps: number;
      renderer: string;
    }>;
  };
  integration: {
    playerFacingSignals: string[];
    systemsFedByOcean: string[];
    openQuestions: string[];
  };
  decision: {
    recommendation: "continue-pixi-first" | "needs-engine-spike";
    reason: string;
  };
};

type NumberRange = {
  min: number;
  max: number;
};

type RouteMetric = {
  day: number;
  fromId: string;
  toId: string;
  beamSea: number;
  cargoSlam: number;
  followingSea: number;
  peakWaveHeight: number;
  currentScore: number;
  lanePressure: number;
  seaStateLabel: string;
  tacticLabel: string;
  speedMultiplier: number;
  risk: number;
};

type ShipResponsePoint = {
  normX: number;
  normY: number;
  responseStrength: number;
  waveEnergy: number;
  roughness: number;
  stormIntensity: number;
};

type PriceComparison = {
  portId: string;
  goodId: string;
  lowDay: number;
  highDay: number;
  lowPressure: number;
  highPressure: number;
  lowPrice: number;
  highPrice: number;
  expectedDirection: "higher-import" | "lower-export";
  passed: boolean;
};

const routeDaysToSampleDefault = 60;

export function createOceanPhysicsSpikeReport(options: OceanPhysicsSpikeOptions = {}): OceanPhysicsSpikeReport {
  const dayCount = Math.max(7, Math.round(options.days ?? routeDaysToSampleDefault));
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const metrics = collectRouteMetrics(dayCount);
  const waveSampling = summarizeWaveSampling(metrics);
  const shipResponse = summarizeShipResponse(dayCount);
  const routeReadability = summarizeRouteReadability(metrics);
  const cargoSlamEffect = summarizeCargoSlamEffect(metrics);
  const currentAndFreight = summarizeCurrentAndFreight(metrics, dayCount);
  const allSystemsPass = waveSampling.pass && shipResponse.pass && routeReadability.pass && cargoSlamEffect.pass && currentAndFreight.pass;

  return {
    schema: 1,
    generatedAt,
    oceanFieldId: defaultOceanField.id,
    routeCount: routePairs().length,
    dayCount,
    waveSampling,
    shipResponse,
    routeReadability,
    cargoSlamEffect,
    currentAndFreight,
    gpuCost: {
      source: null,
      status: "not-attached",
      minAverageFps: null,
      lowPowerCheaper: null,
      cases: [],
    },
    integration: {
      playerFacingSignals: ["Route Command Swell", "Route Board Swell", "Route tactic labels", "Physics Debug beam/slam/peak"],
      systemsFedByOcean: ["ETA", "route risk", "hull wear", "cargo risk", "crew strain", "freight pressure", "market import/export prices", "ship motion"],
      openQuestions: [
        "Whether final art direction needs perspective reflection/refraction beyond the current Pixi water surface.",
        "Whether route wakes should become persistent foam trails once final ship sprites are locked.",
        "Whether the packaged ocean benchmark still passes after final production assets replace provisional sprites.",
      ],
    },
    decision: {
      recommendation: allSystemsPass ? "continue-pixi-first" : "needs-engine-spike",
      reason: allSystemsPass
        ? "The shared Pixi-first ocean field now supplies measurable wave, sea-state, route, ship-response, freight, and price signals without adding a second renderer."
        : "At least one production physics signal failed the spike threshold; investigate before integrating deeper sailing physics.",
    },
  };
}

function collectRouteMetrics(dayCount: number): RouteMetric[] {
  const metrics: RouteMetric[] = [];
  for (let day = 1; day <= dayCount; day += 1) {
    for (const [fromId, toId] of routePairs()) {
      const ocean = sampleRouteOcean(day, fromId, toId);
      const state = baseRouteState(day, fromId, toId);
      const conditions = routeConditions(state, fromId, toId);
      metrics.push({
        day,
        fromId,
        toId,
        beamSea: ocean.seaState.beamSea,
        cargoSlam: ocean.seaState.cargoSlam,
        followingSea: ocean.seaState.followingSea,
        peakWaveHeight: ocean.seaState.peakWaveHeight,
        currentScore: ocean.currentScore,
        lanePressure: shippingLanePressure(day, fromId, toId),
        seaStateLabel: conditions.seaStateLabel,
        tacticLabel: conditions.tacticLabel,
        speedMultiplier: conditions.speedMultiplier,
        risk: routeRisk(state, fromId, toId),
      });
    }
  }
  return metrics;
}

function summarizeWaveSampling(metrics: RouteMetric[]): OceanPhysicsSpikeReport["waveSampling"] {
  const beamSeaRange = range(metrics.map((metric) => metric.beamSea));
  const cargoSlamRange = range(metrics.map((metric) => metric.cargoSlam));
  const followingSeaRange = range(metrics.map((metric) => metric.followingSea));
  const peakWaveHeightRange = range(metrics.map((metric) => metric.peakWaveHeight));
  return {
    samples: metrics.length,
    beamSeaRange,
    cargoSlamRange,
    followingSeaRange,
    peakWaveHeightRange,
    pass:
      metrics.length > 0 &&
      beamSeaRange.max - beamSeaRange.min >= 0.18 &&
      cargoSlamRange.max - cargoSlamRange.min >= 0.18 &&
      followingSeaRange.max - followingSeaRange.min >= 0.18 &&
      peakWaveHeightRange.max >= 4,
  };
}

function summarizeShipResponse(dayCount: number): OceanPhysicsSpikeReport["shipResponse"] {
  let calm = responsePoint(0.18, 0.63, 1);
  let rough = responsePoint(0.78, 0.22, 1);
  for (let day = 1; day <= dayCount; day += 1) {
    for (const point of [
      responsePoint(0.18, 0.63, day),
      responsePoint(0.53, 0.58, day),
      responsePoint(0.78, 0.22, day),
      responsePoint(0.62, 0.78, day),
    ]) {
      if (point.responseStrength < calm.responseStrength) calm = point;
      if (point.responseStrength > rough.responseStrength) rough = point;
    }
  }
  const responseLift = round(rough.responseStrength - calm.responseStrength, 3);
  return {
    calm,
    rough,
    responseLift,
    pass: responseLift >= 0.08 && rough.responseStrength > calm.responseStrength,
  };
}

function summarizeRouteReadability(metrics: RouteMetric[]): OceanPhysicsSpikeReport["routeReadability"] {
  const seaStateLabels = sortedUnique(metrics.map((metric) => metric.seaStateLabel));
  const tacticLabels = sortedUnique(metrics.map((metric) => metric.tacticLabel));
  const speedRange = range(metrics.map((metric) => metric.speedMultiplier));
  const riskRange = range(metrics.map((metric) => metric.risk));
  return {
    seaStateLabels,
    tacticLabels,
    minSpeedMultiplier: speedRange.min,
    maxSpeedMultiplier: speedRange.max,
    maxRisk: riskRange.max,
    pass: seaStateLabels.length >= 4 && tacticLabels.length >= 5 && speedRange.max - speedRange.min >= 0.18 && riskRange.max > 0.24,
  };
}

function summarizeCargoSlamEffect(metrics: RouteMetric[]): OceanPhysicsSpikeReport["cargoSlamEffect"] {
  const hardest = [...metrics].sort((left, right) => right.cargoSlam - left.cargoSlam || right.lanePressure - left.lanePressure)[0];
  const empty = baseRouteState(hardest.day, hardest.fromId, hardest.toId);
  const loaded = baseRouteState(hardest.day, hardest.fromId, hardest.toId);
  loaded.cargo.tools = 8;
  loaded.cargoBasis.tools = 60;
  const emptyProfile = routePhysicsProfile(empty, hardest.fromId, hardest.toId);
  const loadedProfile = routePhysicsProfile(loaded, hardest.fromId, hardest.toId);
  const emptyWear = routeWearEstimate(empty, hardest.fromId, hardest.toId).hullWear;
  const loadedWear = routeWearEstimate(loaded, hardest.fromId, hardest.toId).hullWear;

  return {
    route: `${hardest.fromId}->${hardest.toId}`,
    day: hardest.day,
    cargoSlam: hardest.cargoSlam,
    emptyPressure: emptyProfile.pressure,
    loadedPressure: loadedProfile.pressure,
    emptyCargoRisk: emptyProfile.cargoRisk,
    loadedCargoRisk: loadedProfile.cargoRisk,
    emptyWear,
    loadedWear,
    loadedCargoUnits: cargoUnits(loaded),
    pass: loadedProfile.pressure >= emptyProfile.pressure && loadedProfile.cargoRisk > emptyProfile.cargoRisk && loadedWear >= emptyWear,
  };
}

function summarizeCurrentAndFreight(metrics: RouteMetric[], dayCount: number): OceanPhysicsSpikeReport["currentAndFreight"] {
  const lanePressureRange = range(metrics.map((metric) => metric.lanePressure));
  const importPriceComparisons = priceComparisonsFor("import", dayCount);
  const exportPriceComparisons = priceComparisonsFor("export", dayCount);
  return {
    followingRouteCount: metrics.filter((metric) => metric.currentScore > 0.08).length,
    contraryRouteCount: metrics.filter((metric) => metric.currentScore < -0.08).length,
    lanePressureRange,
    importPriceComparisons,
    exportPriceComparisons,
    pass:
      lanePressureRange.max - lanePressureRange.min >= 0.28 &&
      metrics.some((metric) => metric.currentScore > 0.08) &&
      metrics.some((metric) => metric.currentScore < -0.08) &&
      importPriceComparisons.some((comparison) => comparison.passed) &&
      exportPriceComparisons.some((comparison) => comparison.passed),
  };
}

function priceComparisonsFor(kind: "import" | "export", dayCount: number): PriceComparison[] {
  return ports.flatMap((port) => {
    const goodIds = kind === "import" ? port.imports : port.exports;
    const pressureDays = Array.from({ length: dayCount }, (_, index) => {
      const day = index + 1;
      return { day, pressure: portLogisticsPressure(neutralMarketState(day), port.id) };
    });
    const low = [...pressureDays].sort((left, right) => left.pressure.pressure - right.pressure.pressure)[0];
    const high = [...pressureDays].sort((left, right) => right.pressure.pressure - left.pressure.pressure)[0];
    return goodIds.map((goodId) => {
      const lowPrice = priceFor(neutralMarketState(low.day), port.id, goodId);
      const highPrice = priceFor(neutralMarketState(high.day), port.id, goodId);
      const passed = kind === "import" ? highPrice > lowPrice : highPrice < lowPrice;
      return {
        portId: port.id,
        goodId,
        lowDay: low.day,
        highDay: high.day,
        lowPressure: low.pressure.pressure,
        highPressure: high.pressure.pressure,
        lowPrice,
        highPrice,
        expectedDirection: kind === "import" ? "higher-import" : "lower-export",
        passed,
      };
    });
  });
}

function responsePoint(normX: number, normY: number, day: number): ShipResponsePoint {
  const response = oceanShipResponseSummary(normX, normY, day, 1.6, -0.72);
  return {
    normX,
    normY,
    responseStrength: response.responseStrength,
    waveEnergy: response.waveEnergy,
    roughness: response.roughness,
    stormIntensity: response.stormIntensity,
  };
}

function baseRouteState(day: number, fromId: string, toId: string): GameState {
  const state = createInitialState();
  state.day = day;
  state.currentPort = fromId;
  state.selectedPort = toId;
  state.sailPlan = "balanced";
  return state;
}

function neutralMarketState(day: number): GameState {
  const state = createInitialState();
  state.day = day;
  state.events = [];
  state.politicalEvents = [];
  state.contracts = [];
  state.market = neutralMarket();
  state.marketStock = neutralStock();
  state.trends = neutralTrends(day);
  state.factionStanding = Object.fromEntries(ports.map((port) => [port.faction, 0]));
  return state;
}

function neutralMarket(): Market {
  return Object.fromEntries(
    ports.map((port) => [port.id, Object.fromEntries(goods.map((good) => [good.id, good.base]))])
  );
}

function neutralStock(): MarketStock {
  return Object.fromEntries(
    ports.map((port) => [
      port.id,
      Object.fromEntries(goods.map((good) => [good.id, Math.max(1, Math.round(marketStockCapacity(port.id, good.id) * 0.55))])),
    ])
  );
}

function neutralTrends(day: number): Record<string, Trend> {
  return Object.fromEntries(
    goods.map((good) => [
      good.id,
      {
        direction: 1,
        momentum: 0,
        label: "flat ledger",
        expires: day + 99,
      },
    ])
  );
}

function routePairs() {
  return ports.flatMap((from) => ports.filter((to) => to.id !== from.id).map((to) => [from.id, to.id] as const));
}

function range(values: number[]): NumberRange {
  if (!values.length) return { min: 0, max: 0 };
  return {
    min: round(Math.min(...values), 3),
    max: round(Math.max(...values), 3),
  };
}

function sortedUnique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(clamp(value, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY) * factor) / factor;
}
