import { ports, shipCatalog } from "./data";
import { clamp, cross, dot, normalizeVector, tau } from "./math";

export type OceanVector = {
  x: number;
  y: number;
  strength: number;
};

export type OceanWaveSample = {
  height: number;
  slopeX: number;
  slopeY: number;
};

export type OceanPointSample = {
  wind: OceanVector;
  current: OceanVector;
  surfaceDrift: OceanVector;
  roughness: number;
  stormIntensity: number;
  waveEnergy: number;
  foam: number;
  wave: OceanWaveSample;
};

export type RouteOceanSample = {
  route: { x: number; y: number; length: number };
  wind: OceanVector;
  current: OceanVector;
  surfaceDrift: OceanVector;
  windScore: number;
  currentScore: number;
  crosswind: number;
  roughness: number;
  stormIntensity: number;
  waveEnergy: number;
  seaState: RouteSeaState;
};

export type RouteSeaState = {
  beamSea: number;
  cargoSlam: number;
  followingSea: number;
  peakWaveHeight: number;
};

export type ShipMotionSample = {
  bob: number;
  roll: number;
  yaw: number;
  wakeAngle: number;
  driftX: number;
  driftY: number;
  foam: number;
  hullResponse: number;
  wakeLength: number;
  wakePersistence: number;
  wakeSpread: number;
  wakeTurbulence: number;
};

export const oceanSurfaceSignalKeys = ["swell", "current", "roughness", "storm", "foam", "route-risk", "depth"] as const;
export const shipResponseSignalKeys = [
  "bob",
  "roll",
  "yaw",
  "wake",
  "wake-length",
  "wake-spread",
  "hull-response",
  "drift",
  "foam",
  "route-curvature",
  "current-assist",
  "storm",
] as const;

export type OceanRgbColor = {
  r: number;
  g: number;
  b: number;
};

export const oceanWaterPalette = {
  shallow: { r: 64, g: 171, b: 168 },
  mid: { r: 15, g: 92, b: 110 },
  deep: { r: 5, g: 41, b: 61 },
  stormTint: { r: 20, g: 46, b: 56 },
  currentBand: { r: 10, g: 71, b: 82 },
  foam: { r: 173, g: 242, b: 230 },
} as const satisfies Record<string, OceanRgbColor>;

export type OceanSurfaceSignalKey = (typeof oceanSurfaceSignalKeys)[number];
export type ShipResponseSignalKey = (typeof shipResponseSignalKeys)[number];

export type OceanSurfaceVisualSummary = {
  averageCurrentStrength: number;
  averageFoam: number;
  averageRoughness: number;
  averageWaveEnergy: number;
  depthContrast: number;
  maxStormIntensity: number;
  signalKeys: OceanSurfaceSignalKey[];
};

export type OceanSurfaceRenderSummary = OceanSurfaceVisualSummary & {
  currentRibbonStrength: number;
  foamCoverage: number;
  normalVariance: number;
  rendererVersion: "production-ocean-surface-v2";
  stormCoverage: number;
  surfaceTileSamples: number;
};

export type OceanRouteDisplayPoint = {
  bend: number;
  crossDrift: number;
  normalX: number;
  normalY: number;
  sample: OceanRoutePointSample;
  x: number;
  y: number;
};

export type OceanRouteMotionSummary = {
  averageFoam: number;
  averageWaveEnergy: number;
  currentAssist: number;
  curvature: number;
  maxStormIntensity: number;
  signalKeys: ShipResponseSignalKey[];
};

export type OceanShipResponseSummary = {
  bob: number;
  driftStrength: number;
  foam: number;
  hullResponse: number;
  responseStrength: number;
  roll: number;
  roughness: number;
  signalKeys: ShipResponseSignalKey[];
  shipId: string;
  stormIntensity: number;
  wakeDeflection: number;
  wakeLength: number;
  wakePersistence: number;
  wakeSpread: number;
  wakeTurbulence: number;
  waveEnergy: number;
  yaw: number;
};

export type ShipPhysicsProfile = {
  shipId: string;
  role: string;
  mass: number;
  bobResponse: number;
  rollResponse: number;
  yawResponse: number;
  driftResponse: number;
  roughWaterDamping: number;
  wakeLength: number;
  wakePersistence: number;
  wakeSpread: number;
  wakeTurbulence: number;
};

export type OceanFrameRequest = {
  day: number;
  time: number;
  width: number;
  height: number;
};

export type OceanPointRequest = {
  normX: number;
  normY: number;
  day: number;
  time?: number;
  width?: number;
  height?: number;
};

export type OceanRouteRequest = {
  day: number;
  fromId: string;
  toId: string;
  samples?: number;
};

export type OceanRoutePointRequest = {
  day: number;
  fromId: string;
  toId: string;
  progress: number;
  time?: number;
  width?: number;
  height?: number;
};

export type OceanRoutePointSample = OceanPointSample & {
  progress: number;
  normX: number;
  normY: number;
  routeDay: number;
  route: { x: number; y: number; length: number };
};

export type OceanShipMotionRequest = {
  normX: number;
  normY: number;
  day: number;
  time: number;
  heading: number;
  cargoLoad?: number;
  shipId?: string;
};

export const waveLayers = [
  { amp: 7.4, length: 280, speed: 0.78, dirX: 0.92, dirY: -0.38, phase: 0.1 },
  { amp: 4.8, length: 172, speed: -1.05, dirX: 0.47, dirY: 0.88, phase: 1.7 },
  { amp: 3.2, length: 94, speed: 1.56, dirX: -0.74, dirY: 0.67, phase: 2.9 },
  { amp: 1.7, length: 46, speed: -2.2, dirX: 0.98, dirY: 0.18, phase: 4.4 },
];

const currentZones = [
  { x: 0.18, y: 0.34, radius: 0.35, vx: 0.95, vy: -0.12 },
  { x: 0.53, y: 0.58, radius: 0.31, vx: 0.38, vy: 0.72 },
  { x: 0.8, y: 0.38, radius: 0.33, vx: -0.7, vy: 0.3 },
  { x: 0.42, y: 0.84, radius: 0.28, vx: 0.72, vy: -0.5 },
];

const stormSeeds = [
  { id: "northwall", name: "Northwall Front", x: 0.74, y: 0.18, radius: 0.25, intensity: 0.64, driftX: -0.006, driftY: 0.011, phase: 0.4 },
  { id: "saffron", name: "Saffron Squall", x: 0.24, y: 0.44, radius: 0.2, intensity: 0.52, driftX: 0.01, driftY: -0.004, phase: 2.1 },
  { id: "orchid", name: "Orchid Low", x: 0.62, y: 0.78, radius: 0.29, intensity: 0.58, driftX: 0.004, driftY: -0.009, phase: 4.2 },
];

export type StormFront = {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  intensity: number;
};

export type OceanFieldFrame = {
  day: number;
  time: number;
  width: number;
  height: number;
  wind: OceanVector;
  stormFronts: StormFront[];
  waveLayers: typeof waveLayers;
};

export type OceanField = {
  id: string;
  frame: (request: OceanFrameRequest) => OceanFieldFrame;
  samplePoint: (request: OceanPointRequest) => OceanPointSample;
  sampleRoute: (request: OceanRouteRequest) => RouteOceanSample;
  sampleRoutePoint: (request: OceanRoutePointRequest) => OceanRoutePointSample;
  sampleShipMotion: (request: OceanShipMotionRequest) => ShipMotionSample;
};

export function prevailingWind(day: number): OceanVector {
  const angle = -0.34 + Math.sin(day * 0.17) * 0.22 + Math.sin(day * 0.061) * 0.14;
  const strength = clamp(0.82 + Math.sin(day * 0.113) * 0.18 + Math.sin(day * 0.037 + 1.6) * 0.12, 0.52, 1.24);
  return { x: Math.cos(angle), y: Math.sin(angle), strength };
}

export function sampleCurrentField(normX: number, normY: number, moment: number): OceanVector {
  let vx = 0.14 * Math.cos(moment * 0.8 + normY * 6.1);
  let vy = 0.11 * Math.sin(moment * 0.7 + normX * 5.4);

  for (const zone of currentZones) {
    const dist = Math.hypot(normX - zone.x, normY - zone.y);
    const falloff = Math.max(0, 1 - dist / zone.radius) ** 2;
    const pulse = 0.86 + Math.sin(moment + zone.x * 9 + zone.y * 5) * 0.14;
    vx += zone.vx * falloff * pulse;
    vy += zone.vy * falloff * pulse;
  }

  return { x: vx, y: vy, strength: Math.hypot(vx, vy) };
}

export function seaRoughnessAt(normX: number, normY: number, day: number) {
  const northernShelf = Math.max(0, 1 - Math.hypot(normX - 0.78, normY - 0.24) / 0.38);
  const southernChop = Math.max(0, 1 - Math.hypot(normX - 0.47, normY - 0.78) / 0.42);
  const crossingNoise = Math.sin(normX * 9.7 + normY * 6.2 + day * 0.31) * 0.09;
  return clamp(0.18 + northernShelf * 0.34 + southernChop * 0.2 + crossingNoise, 0.08, 0.78);
}

export function oceanDepthToneAt(normX: number, normY: number) {
  const x = clamp(normX, 0, 1);
  const y = clamp(normY, 0, 1);
  const portShelf = ports.reduce((strongest, port) => {
    const distance = Math.hypot(x - port.x, y - port.y);
    return Math.max(strongest, Math.max(0, 1 - distance / 0.18) ** 2);
  }, 0);
  const northTrench = Math.max(0, 1 - Math.hypot(x - 0.78, y - 0.22) / 0.34);
  const orchidDrop = Math.max(0, 1 - Math.hypot(x - 0.73, y - 0.72) / 0.3);
  const laneShelf = Math.max(0, 1 - Math.abs(y - (0.56 + Math.sin(x * tau) * 0.08)) / 0.22);
  return clamp(0.18 + y * 0.52 - portShelf * 0.24 - laneShelf * 0.08 + northTrench * 0.22 + orchidDrop * 0.18, 0, 1);
}

export function stormFrontsForDay(day: number): StormFront[] {
  return stormSeeds.map((seed) => {
    const pulse = clamp(seed.intensity + Math.sin(day * 0.23 + seed.phase) * 0.18 + Math.sin(day * 0.071 + seed.phase) * 0.08, 0.24, 0.96);
    return {
      id: seed.id,
      name: seed.name,
      x: wrap01(seed.x + day * seed.driftX + Math.sin(day * 0.09 + seed.phase) * 0.035),
      y: clamp(seed.y + day * seed.driftY + Math.cos(day * 0.077 + seed.phase) * 0.06, 0.08, 0.92),
      radius: seed.radius * (0.86 + pulse * 0.28),
      intensity: Number(pulse.toFixed(2)),
    };
  });
}

export function oceanFieldFrame(day: number, time: number, width: number, height: number): OceanFieldFrame {
  return {
    day,
    time,
    width,
    height,
    wind: prevailingWind(day),
    stormFronts: stormFrontsForDay(day),
    waveLayers,
  };
}

export function stormIntensityAt(normX: number, normY: number, day: number) {
  let intensity = 0;
  for (const front of stormFrontsForDay(day)) {
    const dx = wrappedDistance(normX, front.x);
    const dy = normY - front.y;
    const distance = Math.hypot(dx, dy);
    const falloff = Math.max(0, 1 - distance / front.radius) ** 2;
    intensity += front.intensity * falloff;
  }
  const localPulse = Math.max(0, Math.sin(normX * 18.3 - normY * 9.4 + day * 0.41)) * 0.08;
  return clamp(intensity + localPulse, 0, 1);
}

export function sampleWave(x: number, y: number, time: number, roughness = 0.22, stormIntensity = 0): OceanWaveSample {
  let height = 0;
  let slopeX = 0;
  let slopeY = 0;
  const energy = 0.72 + roughness * 0.72 + stormIntensity * 0.5;
  const steepness = 0.9 + roughness * 0.48 + stormIntensity * 0.74;

  for (const layer of waveLayers) {
    const k = tau / layer.length;
    const phase = (x * layer.dirX + y * layer.dirY) * k + time * layer.speed + layer.phase;
    const wave = Math.sin(phase);
    const slope = Math.cos(phase) * layer.amp * k * steepness;
    height += wave * layer.amp * energy;
    slopeX += slope * layer.dirX;
    slopeY += slope * layer.dirY;
  }

  return { height, slopeX, slopeY };
}

export function sampleOceanPoint(normX: number, normY: number, day: number, time = 0, width = 1000, height = 700): OceanPointSample {
  const x = clamp(normX, 0, 1);
  const y = clamp(normY, 0, 1);
  const wind = prevailingWind(day);
  const current = sampleCurrentField(x, y, day * 0.19 + time * 0.045);
  const stormIntensity = stormIntensityAt(x, y, day);
  const roughness = clamp(seaRoughnessAt(x, y, day) + stormIntensity * 0.34, 0.06, 1);
  const waveEnergy = clamp(roughness * 0.76 + stormIntensity * 0.42 + current.strength * 0.1, 0, 1);
  const wave = sampleWave(x * width, y * height, time + day * 0.035, roughness, stormIntensity);
  const surfaceDrift = combineSurfaceDrift(wind, current, stormIntensity);
  const slope = Math.hypot(wave.slopeX, wave.slopeY);
  const foam = clamp(Math.max(0, roughness - 0.38) * 0.95 + stormIntensity * 0.28 + slope * 0.9, 0, 1);

  return { wind, current, surfaceDrift, roughness, stormIntensity, waveEnergy, foam, wave };
}

function sampleOceanPointForRequest(request: OceanPointRequest) {
  return sampleOceanPoint(request.normX, request.normY, request.day, request.time ?? 0, request.width ?? 1000, request.height ?? 700);
}

function sampleRoutePointOcean(request: OceanRoutePointRequest): OceanRoutePointSample {
  const from = portById(request.fromId);
  const to = portById(request.toId);
  const progress = clamp(request.progress, 0, 1);
  const route = normalizeVector(to.x - from.x, to.y - from.y);
  const normX = from.x + (to.x - from.x) * progress;
  const normY = from.y + (to.y - from.y) * progress;
  const point = sampleOceanPoint(
    normX,
    normY,
    request.day,
    request.time ?? progress * 3.2,
    request.width ?? 1000,
    request.height ?? 700
  );

  return {
    ...point,
    progress,
    normX,
    normY,
    routeDay: request.day,
    route,
  };
}

export function oceanRouteDisplayPoint(
  width: number,
  height: number,
  day: number,
  time: number,
  fromId: string,
  toId: string,
  progress: number,
  normalOffset = 0
): OceanRouteDisplayPoint {
  const ocean = sampleRoutePointOcean({ day, fromId, toId, progress, time: time + progress * 0.35, width, height });
  const normalX = -ocean.route.y;
  const normalY = ocean.route.x;
  const crossDrift = ocean.surfaceDrift.x * normalX + ocean.surfaceDrift.y * normalY;
  const stormBend = Math.sin((progress - 0.5) * tau * 0.86) * ocean.stormIntensity * 8;
  const bend = Math.sin(progress * Math.PI) * (crossDrift * 24 + stormBend + ocean.wave.height * 0.035) + normalOffset;
  return {
    bend,
    crossDrift,
    normalX,
    normalY,
    sample: ocean,
    x: ocean.normX * width + normalX * bend,
    y: ocean.normY * height + normalY * bend,
  };
}

export function oceanRouteMotionSummary(
  width: number,
  height: number,
  day: number,
  time: number,
  fromId: string,
  toId: string,
  samples = 8
): OceanRouteMotionSummary {
  const count = Math.max(3, samples);
  const scale = Math.max(1, Math.min(width, height));
  let maxBend = 0;
  let waveEnergy = 0;
  let foam = 0;
  let storm = 0;
  let currentAssist = 0;

  for (let index = 1; index <= count; index += 1) {
    const progress = index / (count + 1);
    const point = oceanRouteDisplayPoint(width, height, day, time, fromId, toId, progress);
    maxBend = Math.max(maxBend, Math.abs(point.bend));
    waveEnergy += point.sample.waveEnergy;
    foam += point.sample.foam;
    storm = Math.max(storm, point.sample.stormIntensity);
    currentAssist += dot(point.sample.route, point.sample.current);
  }

  return {
    averageFoam: Number((foam / count).toFixed(3)),
    averageWaveEnergy: Number((waveEnergy / count).toFixed(3)),
    currentAssist: Number((currentAssist / count).toFixed(3)),
    curvature: Number(clamp(maxBend / scale, 0, 1).toFixed(3)),
    maxStormIntensity: Number(storm.toFixed(3)),
    signalKeys: [...shipResponseSignalKeys],
  };
}

export function sampleRouteOcean(day: number, fromId: string, toId: string, samples = 8): RouteOceanSample {
  const from = portById(fromId);
  const to = portById(toId);
  const route = normalizeVector(to.x - from.x, to.y - from.y);
  const normal = { x: -route.y, y: route.x };
  const wind = prevailingWind(day);
  const windScore = dot(route, wind) * wind.strength;
  const crosswind = Math.abs(cross(route, wind)) * wind.strength;

  let vx = 0;
  let vy = 0;
  let driftX = 0;
  let driftY = 0;
  let roughness = 0;
  let stormMean = 0;
  let stormPeak = 0;
  let waveEnergy = 0;
  let beamSea = 0;
  let followingSea = 0;
  let cargoSlam = 0;
  let peakWaveHeight = 0;

  for (let index = 1; index <= samples; index += 1) {
    const progress = index / (samples + 1);
    const ocean = sampleRoutePointOcean({ day, fromId, toId, progress });
    const beamSlope = Math.abs(ocean.wave.slopeX * normal.x + ocean.wave.slopeY * normal.y);
    const crossDrift = Math.abs(cross(route, ocean.surfaceDrift));
    const followingDrift = dot(route, ocean.surfaceDrift);
    const followingScore = clamp(followingDrift * 0.75 + windScore * 0.18, -1, 1);
    vx += ocean.current.x;
    vy += ocean.current.y;
    driftX += ocean.surfaceDrift.x;
    driftY += ocean.surfaceDrift.y;
    roughness += ocean.roughness;
    stormMean += ocean.stormIntensity;
    stormPeak = Math.max(stormPeak, ocean.stormIntensity);
    waveEnergy += ocean.waveEnergy;
    beamSea += clamp(beamSlope * 7.2 + crossDrift * 0.26 + ocean.stormIntensity * 0.08, 0, 1);
    followingSea += followingScore;
    cargoSlam += clamp(
      ocean.waveEnergy * 0.2 +
        ocean.stormIntensity * 0.26 +
        beamSlope * 5.6 +
        Math.max(0, -followingScore) * 0.1 +
        ocean.foam * 0.06,
      0,
      1
    );
    peakWaveHeight = Math.max(peakWaveHeight, Math.abs(ocean.wave.height));
  }

  const current = { x: vx / samples, y: vy / samples, strength: Math.hypot(vx / samples, vy / samples) };
  const surfaceDrift = { x: driftX / samples, y: driftY / samples, strength: Math.hypot(driftX / samples, driftY / samples) };
  const stormIntensity = clamp(stormPeak * 0.72 + (stormMean / samples) * 0.28, 0, 1);
  const currentScore = dot(route, current);

  return {
    route,
    wind,
    current,
    surfaceDrift,
    windScore,
    currentScore,
    crosswind,
    roughness: roughness / samples,
    stormIntensity,
    waveEnergy: waveEnergy / samples,
    seaState: {
      beamSea: Number((beamSea / samples).toFixed(3)),
      cargoSlam: Number((cargoSlam / samples).toFixed(3)),
      followingSea: Number((followingSea / samples).toFixed(3)),
      peakWaveHeight: Number(peakWaveHeight.toFixed(2)),
    },
  };
}

export function shipPhysicsProfileFor(shipId = "coastal_sloop", cargoLoad = 0): ShipPhysicsProfile {
  const ship = shipCatalog.find((entry) => entry.id === shipId) ?? shipCatalog[0];
  const load = clamp(cargoLoad, 0, 1);
  const handling = ship.handling;
  const cargoMass = ship.cargoCap / 62;
  const hullMass = ship.hullMax / 125;
  const armamentMass = ship.cannons / 3;
  const speedBias = ship.speed / 4;
  const openWaterControl = ship.openWater / 3;
  const roughControl = clamp(openWaterControl * 0.24 + handling.roughWaterRelief * 3.2 + (1 - handling.wearModifier) * 0.36, 0, 0.5);
  const mass = clamp(0.62 + cargoMass * 0.32 + hullMass * 0.28 + armamentMass * 0.08 + load * 0.26 - speedBias * 0.08, 0.72, 1.48);
  const loadedDamping = load * (0.12 + Math.max(0, 1 - handling.cargoDragModifier) * 0.16);

  return {
    shipId: ship.id,
    role: ship.role,
    mass: roundNumber(mass, 3),
    bobResponse: roundNumber(clamp(1.16 - mass * 0.18 - roughControl * 0.38 - loadedDamping * 0.55 + speedBias * 0.08, 0.58, 1.18), 3),
    rollResponse: roundNumber(clamp(1.24 - mass * 0.2 - roughControl * 0.58 - loadedDamping * 0.62 + speedBias * 0.14, 0.5, 1.28), 3),
    yawResponse: roundNumber(
      clamp(1.08 + speedBias * 0.28 + handling.windAffinity * 1.4 + handling.currentAffinity * 0.9 - mass * 0.16 - roughControl * 0.52 - load * 0.18, 0.5, 1.38),
      3
    ),
    driftResponse: roundNumber(clamp(1.06 + handling.currentAffinity * 2.4 + speedBias * 0.1 - mass * 0.13 - roughControl * 0.12, 0.72, 1.24), 3),
    roughWaterDamping: roundNumber(roughControl, 3),
    wakeLength: roundNumber(clamp(0.82 + speedBias * 0.36 + handling.windAffinity * 1.8 + handling.currentAffinity * 1.1 + load * 0.12 - mass * 0.08, 0.68, 1.52), 3),
    wakePersistence: roundNumber(clamp(0.68 + mass * 0.28 + load * 0.22 + roughControl * 0.36, 0.72, 1.38), 3),
    wakeSpread: roundNumber(clamp(0.74 + mass * 0.3 + cargoMass * 0.15 + load * 0.22 - speedBias * 0.1, 0.72, 1.44), 3),
    wakeTurbulence: roundNumber(clamp(0.42 + speedBias * 0.18 + Math.max(0, handling.cargoDragModifier - 0.84) * 0.34 + load * 0.2 - roughControl * 0.12, 0.34, 1.12), 3),
  };
}

export function sampleShipMotion(
  normX: number,
  normY: number,
  day: number,
  time: number,
  heading: number,
  shipId = "coastal_sloop",
  cargoLoad = 0
): ShipMotionSample {
  const ocean = sampleOceanPoint(normX, normY, day, time);
  const profile = shipPhysicsProfileFor(shipId, cargoLoad);
  const forward = { x: Math.cos(heading), y: Math.sin(heading) };
  const normal = { x: -Math.sin(heading), y: Math.cos(heading) };
  const crossSlope = ocean.wave.slopeX * normal.x + ocean.wave.slopeY * normal.y;
  const quarteringSlope = ocean.wave.slopeX * forward.y - ocean.wave.slopeY * forward.x;
  const crossDrift = ocean.surfaceDrift.x * normal.x + ocean.surfaceDrift.y * normal.y;
  const roughLift = clamp(1 + ocean.waveEnergy * 0.18 + ocean.stormIntensity * 0.22 - profile.roughWaterDamping * 0.28, 0.72, 1.32);
  const roll = clamp(crossSlope * 8.5 * profile.rollResponse * roughLift, -0.22, 0.22);
  const yaw = clamp(
    (crossDrift * (0.11 + ocean.waveEnergy * 0.1) + quarteringSlope * (2.1 + ocean.stormIntensity * 1.2)) * profile.yawResponse * roughLift,
    -0.16,
    0.16
  );
  const bob = ocean.wave.height * (0.18 + ocean.waveEnergy * 0.26) * profile.bobResponse * roughLift;
  const driftScale = (0.9 + ocean.waveEnergy * 1.8) * profile.driftResponse;
  const driftX = ocean.surfaceDrift.x * driftScale;
  const driftY = ocean.surfaceDrift.y * driftScale;
  const wakeAngle = Math.atan2(Math.sin(heading) - driftY * 0.14 * profile.driftResponse, Math.cos(heading) - driftX * 0.14 * profile.driftResponse);
  const hullResponse = clamp(
    Math.abs(bob) / 14 + Math.abs(roll) * 1.6 + Math.abs(yaw) * 1.6 + Math.hypot(driftX, driftY) * 0.12 + ocean.waveEnergy * 0.12,
    0,
    1
  );
  const wakeTurbulence = clamp(profile.wakeTurbulence + ocean.foam * 0.24 + ocean.stormIntensity * 0.16 + Math.abs(yaw) * 0.58, 0, 1.5);

  return {
    bob,
    roll,
    yaw,
    wakeAngle,
    driftX,
    driftY,
    foam: ocean.foam,
    hullResponse,
    wakeLength: profile.wakeLength * (1 + ocean.waveEnergy * 0.18 + Math.max(0, cargoLoad) * 0.08),
    wakePersistence: profile.wakePersistence * (1 + ocean.foam * 0.08 + ocean.stormIntensity * 0.08),
    wakeSpread: profile.wakeSpread * (1 + ocean.foam * 0.08 + ocean.stormIntensity * 0.08),
    wakeTurbulence,
  };
}

export function oceanShipResponseSummary(
  normX: number,
  normY: number,
  day: number,
  time: number,
  heading: number,
  shipId = "coastal_sloop",
  cargoLoad = 0
): OceanShipResponseSummary {
  const ocean = sampleOceanPoint(normX, normY, day, time);
  const motion = sampleShipMotion(normX, normY, day, time, heading, shipId, cargoLoad);
  const driftStrength = Math.hypot(motion.driftX, motion.driftY);
  const wakeDeflection = angularDistance(motion.wakeAngle, heading);
  const responseStrength = clamp(
    Math.abs(motion.bob) / 12 + Math.abs(motion.roll) * 1.8 + Math.abs(motion.yaw) * 1.8 + driftStrength * 0.18 + ocean.foam * 0.16,
    0,
    1
  );
  return {
    bob: Number(motion.bob.toFixed(2)),
    driftStrength: Number(driftStrength.toFixed(3)),
    foam: Number(ocean.foam.toFixed(3)),
    hullResponse: Number(motion.hullResponse.toFixed(3)),
    responseStrength: Number(responseStrength.toFixed(3)),
    roll: Number(motion.roll.toFixed(3)),
    roughness: Number(ocean.roughness.toFixed(3)),
    signalKeys: [...shipResponseSignalKeys],
    shipId: shipPhysicsProfileFor(shipId).shipId,
    stormIntensity: Number(ocean.stormIntensity.toFixed(3)),
    wakeDeflection: Number(wakeDeflection.toFixed(3)),
    wakeLength: Number(motion.wakeLength.toFixed(3)),
    wakePersistence: Number(motion.wakePersistence.toFixed(3)),
    wakeSpread: Number(motion.wakeSpread.toFixed(3)),
    wakeTurbulence: Number(motion.wakeTurbulence.toFixed(3)),
    waveEnergy: Number(ocean.waveEnergy.toFixed(3)),
    yaw: Number(motion.yaw.toFixed(3)),
  };
}

export function oceanSurfaceVisualSummary(day: number, time = 0, samples = 6): OceanSurfaceVisualSummary {
  let currentStrength = 0;
  let foam = 0;
  let roughness = 0;
  let waveEnergy = 0;
  let storm = 0;
  let minDepth = Infinity;
  let maxDepth = -Infinity;
  let count = 0;

  for (let yIndex = 0; yIndex < samples; yIndex += 1) {
    for (let xIndex = 0; xIndex < samples; xIndex += 1) {
      const normX = (xIndex + 0.5) / samples;
      const normY = (yIndex + 0.5) / samples;
      const point = sampleOceanPoint(normX, normY, day, time);
      const depth = oceanDepthToneAt(normX, normY);
      currentStrength += point.current.strength;
      foam += point.foam;
      roughness += point.roughness;
      waveEnergy += point.waveEnergy;
      storm = Math.max(storm, point.stormIntensity);
      minDepth = Math.min(minDepth, depth);
      maxDepth = Math.max(maxDepth, depth);
      count += 1;
    }
  }

  return {
    averageCurrentStrength: currentStrength / count,
    averageFoam: foam / count,
    averageRoughness: roughness / count,
    averageWaveEnergy: waveEnergy / count,
    depthContrast: maxDepth - minDepth,
    maxStormIntensity: storm,
    signalKeys: [...oceanSurfaceSignalKeys],
  };
}

export function oceanSurfaceRenderSummary(day: number, time = 0, samples = 7): OceanSurfaceRenderSummary {
  const countPerAxis = Math.max(3, Math.floor(samples));
  const visual = oceanSurfaceVisualSummary(day, time, countPerAxis);
  let currentRibbonStrength = 0;
  let foamCoverage = 0;
  let normalVariance = 0;
  let stormCoverage = 0;
  let count = 0;

  for (let yIndex = 0; yIndex < countPerAxis; yIndex += 1) {
    for (let xIndex = 0; xIndex < countPerAxis; xIndex += 1) {
      const normX = (xIndex + 0.5) / countPerAxis;
      const normY = (yIndex + 0.5) / countPerAxis;
      const point = sampleOceanPoint(normX, normY, day, time + (xIndex + yIndex) * 0.035);
      const slope = Math.hypot(point.wave.slopeX, point.wave.slopeY);
      currentRibbonStrength += clamp(point.current.strength * (0.55 + point.waveEnergy * 0.35), 0, 1);
      foamCoverage += point.foam >= 0.22 ? 1 : clamp(point.foam * 2.2, 0, 1);
      normalVariance += clamp(slope * 9.5 + point.waveEnergy * 0.2 + point.roughness * 0.18, 0, 1);
      stormCoverage += point.stormIntensity >= 0.16 ? 1 : point.stormIntensity * 2.4;
      count += 1;
    }
  }

  return {
    ...visual,
    currentRibbonStrength: Number((currentRibbonStrength / count).toFixed(3)),
    foamCoverage: Number((foamCoverage / count).toFixed(3)),
    normalVariance: Number((normalVariance / count).toFixed(3)),
    rendererVersion: "production-ocean-surface-v2",
    stormCoverage: Number((stormCoverage / count).toFixed(3)),
    surfaceTileSamples: count,
  };
}

function oceanFieldFrameForRequest(request: OceanFrameRequest) {
  return oceanFieldFrame(request.day, request.time, request.width, request.height);
}

function sampleRouteOceanForRequest(request: OceanRouteRequest) {
  return sampleRouteOcean(request.day, request.fromId, request.toId, request.samples ?? 8);
}

function sampleShipMotionForRequest(request: OceanShipMotionRequest) {
  return sampleShipMotion(request.normX, request.normY, request.day, request.time, request.heading, request.shipId, request.cargoLoad);
}

function angularDistance(left: number, right: number) {
  return Math.abs(Math.atan2(Math.sin(left - right), Math.cos(left - right)));
}

function roundNumber(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function combineSurfaceDrift(wind: OceanVector, current: OceanVector, stormIntensity: number): OceanVector {
  const gust = 0.06 + stormIntensity * 0.05;
  const x = current.x + wind.x * wind.strength * gust;
  const y = current.y + wind.y * wind.strength * gust;
  return { x, y, strength: Math.hypot(x, y) };
}

function portById(id: string) {
  return ports.find((port) => port.id === id) ?? ports[0];
}

function wrap01(value: number) {
  return ((value % 1) + 1) % 1;
}

function wrappedDistance(a: number, b: number) {
  const direct = a - b;
  if (direct > 0.5) return direct - 1;
  if (direct < -0.5) return direct + 1;
  return direct;
}

export const defaultOceanField: OceanField = {
  id: "analytic-tradewinds-v1",
  frame: oceanFieldFrameForRequest,
  samplePoint: sampleOceanPointForRequest,
  sampleRoute: sampleRouteOceanForRequest,
  sampleRoutePoint: sampleRoutePointOcean,
  sampleShipMotion: sampleShipMotionForRequest,
};
