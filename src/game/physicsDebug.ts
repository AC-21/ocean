import { defaultOceanField } from "./ocean";
import { cargoUnits, routeConditions, routeDays, routePhysicsProfile, routeRisk, routeWearEstimate } from "./routing";
import { deriveShipStats } from "./stats";
import type { GameState } from "./types";

export type RoutePhysicsDebugSample = {
  progress: number;
  normX: number;
  normY: number;
  roughness: number;
  stormIntensity: number;
  waveEnergy: number;
  foam: number;
  currentStrength: number;
  driftStrength: number;
  bob: number;
  roll: number;
  yaw: number;
  wakeAngle: number;
  hullResponse: number;
  wakeLength: number;
  wakeSpread: number;
  wakeTurbulence: number;
};

export type RoutePhysicsDebug = {
  fromId: string;
  toId: string;
  day: number;
  sailPlan: string;
  headingDegrees: number;
  routeLength: number;
  days: number;
  risk: number;
  wear: number;
  speedMultiplier: number;
  speedDelta: number;
  speedFactors: {
    wind: number;
    current: number;
    sea: number;
    storm: number;
    skill: number;
    plan: number;
    net: number;
    threat: number;
  };
  wind: {
    x: number;
    y: number;
    strength: number;
    score: number;
    crosswind: number;
  };
  current: {
    x: number;
    y: number;
    strength: number;
    score: number;
  };
  surfaceDrift: {
    x: number;
    y: number;
    strength: number;
  };
  water: {
    roughness: number;
    stormIntensity: number;
    waveEnergy: number;
    seaState: ReturnType<typeof routePhysicsProfile>["seaState"];
  };
  profile: ReturnType<typeof routePhysicsProfile>;
  samples: RoutePhysicsDebugSample[];
};

const routeSamplePoints = [0.25, 0.5, 0.75] as const;

export function routePhysicsDebugFor(state: GameState, fromId: string, toId: string): RoutePhysicsDebug {
  const route = defaultOceanField.sampleRoute({ day: state.day, fromId, toId, samples: 8 });
  const conditions = routeConditions(state, fromId, toId);
  const profile = routePhysicsProfile(state, fromId, toId);
  const wear = routeWearEstimate(state, fromId, toId);
  const heading = Math.atan2(route.route.y, route.route.x);
  const stats = deriveShipStats(state);
  const cargoLoad = cargoUnits(state) / Math.max(1, stats.cargoCap);

  return {
    fromId,
    toId,
    day: state.day,
    sailPlan: conditions.sailPlan,
    headingDegrees: roundNumber((heading * 180) / Math.PI, 1),
    routeLength: roundNumber(route.route.length, 3),
    days: routeDays(state, fromId, toId),
    risk: roundNumber(routeRisk(state, fromId, toId), 3),
    wear: wear.hullWear,
    speedMultiplier: roundNumber(conditions.speedMultiplier, 3),
    speedDelta: conditions.speedDelta,
    speedFactors: conditions.speedFactors,
    wind: {
      x: roundNumber(route.wind.x, 3),
      y: roundNumber(route.wind.y, 3),
      strength: roundNumber(route.wind.strength, 3),
      score: roundNumber(route.windScore, 3),
      crosswind: roundNumber(route.crosswind, 3),
    },
    current: {
      x: roundNumber(route.current.x, 3),
      y: roundNumber(route.current.y, 3),
      strength: roundNumber(route.current.strength, 3),
      score: roundNumber(route.currentScore, 3),
    },
    surfaceDrift: {
      x: roundNumber(route.surfaceDrift.x, 3),
      y: roundNumber(route.surfaceDrift.y, 3),
      strength: roundNumber(route.surfaceDrift.strength, 3),
    },
    water: {
      roughness: roundNumber(route.roughness, 3),
      stormIntensity: roundNumber(route.stormIntensity, 3),
      waveEnergy: roundNumber(route.waveEnergy, 3),
      seaState: route.seaState,
    },
    profile,
    samples: routeSamplePoints.map((progress) => {
      const point = defaultOceanField.sampleRoutePoint({
        day: state.day,
        fromId,
        toId,
        progress,
        time: progress * 3.2,
        width: 1000,
        height: 700,
      });
      const motion = defaultOceanField.sampleShipMotion({
        normX: point.normX,
        normY: point.normY,
        day: state.day,
        time: progress * 3.2,
        heading,
        shipId: state.currentShip,
        cargoLoad,
      });
      return {
        progress,
        normX: roundNumber(point.normX, 3),
        normY: roundNumber(point.normY, 3),
        roughness: roundNumber(point.roughness, 3),
        stormIntensity: roundNumber(point.stormIntensity, 3),
        waveEnergy: roundNumber(point.waveEnergy, 3),
        foam: roundNumber(point.foam, 3),
        currentStrength: roundNumber(point.current.strength, 3),
        driftStrength: roundNumber(point.surfaceDrift.strength, 3),
        bob: roundNumber(motion.bob, 2),
        roll: roundNumber(motion.roll, 3),
        yaw: roundNumber(motion.yaw, 3),
        wakeAngle: roundNumber(motion.wakeAngle, 3),
        hullResponse: roundNumber(motion.hullResponse, 3),
        wakeLength: roundNumber(motion.wakeLength, 3),
        wakeSpread: roundNumber(motion.wakeSpread, 3),
        wakeTurbulence: roundNumber(motion.wakeTurbulence, 3),
      };
    }),
  };
}

function roundNumber(value: number, digits: number) {
  return Number(value.toFixed(digits));
}
