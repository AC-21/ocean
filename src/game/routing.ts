import { goods, ports } from "./data";
import { hasCaptainSkillMastery } from "./captainSkills";
import { clamp } from "./math";
import { defaultOceanField } from "./ocean";
import { standingBenefits } from "./politics";
import { shipHandlingFor, shipHandlingLabel } from "./ships";
import { deriveShipStats } from "./stats";
import type { GameState, RouteConditions, RouteWearEstimate, SailPlanId } from "./types";

export const sailPlans: Record<
  SailPlanId,
  {
    id: SailPlanId;
    label: string;
    note: string;
    speedModifier: number;
    riskModifier: number;
    wearModifier: number;
    watchModifier: number;
    customsModifier: number;
  }
> = {
  cautious: {
    id: "cautious",
    label: "Reefed",
    note: "slower, safer, less pounding",
    speedModifier: 0.9,
    riskModifier: -0.045,
    wearModifier: 0.78,
    watchModifier: -0.12,
    customsModifier: -0.03,
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    note: "standard canvas and watch",
    speedModifier: 1,
    riskModifier: 0,
    wearModifier: 1,
    watchModifier: 0,
    customsModifier: 0,
  },
  hard: {
    id: "hard",
    label: "Hard Sail",
    note: "faster, riskier, harder on hull",
    speedModifier: 1.14,
    riskModifier: 0.055,
    wearModifier: 1.24,
    watchModifier: 0.12,
    customsModifier: 0.04,
  },
  quiet: {
    id: "quiet",
    label: "Quiet",
    note: "low profile, slower, fewer customs hails",
    speedModifier: 0.86,
    riskModifier: -0.022,
    wearModifier: 0.92,
    watchModifier: -0.08,
    customsModifier: -0.18,
  },
};

export {
  prevailingWind,
  sampleCurrentField,
  sampleOceanPoint,
  sampleShipMotion,
  sampleWave,
  seaRoughnessAt,
  stormFrontsForDay,
  stormIntensityAt,
} from "./ocean";
export type { OceanField, OceanFieldFrame, OceanPointSample, OceanRoutePointSample, RouteOceanSample, ShipMotionSample, StormFront } from "./ocean";

export type RoutePhysicsProfile = {
  pressure: number;
  assist: number;
  delayRisk: number;
  cargoRisk: number;
  crewStrain: number;
  label: string;
  detail: string;
  seaState: {
    beamSea: number;
    cargoSlam: number;
    followingSea: number;
    peakWaveHeight: number;
  };
};

export function portById(id: string) {
  return ports.find((port) => port.id === id) ?? ports[0];
}

export function distanceBetween(fromId: string, toId: string, width = 1000, height = 700) {
  const from = portById(fromId);
  const to = portById(toId);
  const dx = (from.x - to.x) * width;
  const dy = (from.y - to.y) * height;
  return Math.hypot(dx, dy);
}

export function sampleRouteEnvironment(day: number, fromId: string, toId: string) {
  const ocean = defaultOceanField.sampleRoute({ day, fromId, toId });

  return {
    ...ocean,
    windLabel: describeWind(ocean.windScore, ocean.crosswind),
    currentLabel: describeCurrent(ocean.currentScore),
    seaLabel: describeSea(ocean.roughness),
    stormLabel: describeStorm(ocean.stormIntensity),
  };
}

export function shippingLanePressure(day: number, fromId: string, toId: string) {
  const environment = sampleRouteEnvironment(day, fromId, toId);
  const headwind = Math.max(0, -environment.windScore);
  const contraryCurrent = Math.max(0, -environment.currentScore);
  const beamStress = Math.max(0, environment.crosswind - 0.72);
  const chop = Math.max(0, environment.roughness - 0.2);
  return clamp(
    chop * 1.35 +
      environment.stormIntensity * 0.64 +
      environment.seaState.beamSea * 0.16 +
      environment.seaState.cargoSlam * 0.2 +
      headwind * 0.42 +
      contraryCurrent * 0.58 +
      beamStress * 0.22,
    0,
    1
  );
}

export function routePhysicsProfile(state: GameState, fromId: string, toId: string): RoutePhysicsProfile {
  const ship = deriveShipStats(state);
  const environment = sampleRouteEnvironment(state.day, fromId, toId);
  const plan = sailPlanFor(state.sailPlan);
  const tradewindPlotter = hasCaptainSkillMastery(state, "navigation");
  const load = clamp(cargoUnits(state) / Math.max(1, ship.cargoCap), 0, 1);
  const headwind = Math.max(0, -environment.windScore);
  const contraryCurrent = Math.max(0, -environment.currentScore);
  const beamStress = Math.max(0, environment.crosswind - 0.7);
  const seaState = environment.seaState;
  const pressure = clamp(
    environment.roughness * 0.5 +
      environment.stormIntensity * 0.42 +
      environment.waveEnergy * 0.2 +
      seaState.beamSea * 0.12 +
      seaState.cargoSlam * (0.1 + load * 0.12) +
      headwind * 0.16 +
      contraryCurrent * 0.2 +
      beamStress * 0.1 +
      load * 0.12 -
      ship.openWater * 0.055 -
      ship.navigation * 0.028 +
      plan.watchModifier,
    0,
    1
  );
  const assist = clamp(
    environment.windScore * 0.42 +
      environment.currentScore * 0.56 +
      seaState.followingSea * 0.06 -
      seaState.beamSea * 0.04 -
      environment.roughness * 0.1 -
      environment.stormIntensity * 0.18 +
      ship.navigation * 0.02 +
      (tradewindPlotter ? 0.035 + Math.max(0, environment.currentScore) * 0.05 : 0),
    -1,
    1
  );
  const delayRisk = clamp((pressure - 0.46) * 0.72 + Math.max(0, -assist) * 0.12 - (tradewindPlotter ? 0.045 : 0), 0, 0.44);
  const cargoRisk = cargoUnits(state) > 0 ? clamp((pressure - 0.5) * 0.9 + load * 0.14 + seaState.cargoSlam * 0.18, 0, 0.52) : 0;
  const rawCrewStrain = Math.max(0, Math.round(pressure * 7 + environment.stormIntensity * 3 - ship.openWater * 0.45 - ship.navigation * 0.2));
  const hardEnoughForCrewStrain = pressure >= 0.48 || delayRisk >= 0.08 || cargoRisk >= 0.08;
  const crewStrain = hardEnoughForCrewStrain ? rawCrewStrain : 0;
  const currentAssist = clamp((assist - 0.16) * 0.7, 0, 0.36);
  const label =
    cargoRisk >= 0.28
      ? "Cargo water"
      : delayRisk >= 0.24
        ? "Delay risk"
        : currentAssist >= 0.16
          ? "Current push"
          : pressure >= 0.46
            ? "Hard water"
            : "Steady water";

  return {
    pressure: Number(pressure.toFixed(3)),
    assist: Number(assist.toFixed(3)),
    delayRisk: Number(delayRisk.toFixed(3)),
    cargoRisk: Number(cargoRisk.toFixed(3)),
    crewStrain,
    label,
    detail: `delay ${Math.round(delayRisk * 100)}% | cargo ${Math.round(cargoRisk * 100)}% | crew ${crewStrain} | swell ${Math.round(seaState.cargoSlam * 100)}%`,
    seaState,
  };
}

export function routeConditions(state: GameState, fromId: string, toId: string): RouteConditions {
  const ship = deriveShipStats(state);
  const handling = shipHandlingFor(state.currentShip);
  const environment = sampleRouteEnvironment(state.day, fromId, toId);
  const plan = sailPlanFor(state.sailPlan);
  const tradewindPlotter = hasCaptainSkillMastery(state, "navigation");
  const { windScore, crosswind, currentScore } = environment;
  const load = clamp(cargoUnits(state) / Math.max(1, ship.cargoCap), 0, 1);
  const seaState = environment.seaState;
  const roughness = Math.max(0.04, environment.roughness + seaState.beamSea * 0.04 + seaState.cargoSlam * 0.03 - ship.openWater * 0.035 - handling.roughWaterRelief);
  const windAssist = windScore * (0.15 + handling.windAffinity) + crosswind * (0.045 + Math.max(0, handling.windAffinity) * 0.28);
  const currentAssist = currentScore * (0.2 + handling.currentAffinity);
  const skillAssist = ship.navigation * 0.018 + ship.openWater * 0.012 + (tradewindPlotter ? 0.018 + Math.max(0, currentScore) * 0.025 : 0);
  const followingSeaAssist = seaState.followingSea > 0 ? seaState.followingSea * 0.028 : seaState.followingSea * 0.045;
  const beamSeaDrag = -seaState.beamSea * 0.03;
  const cargoSlamDrag = -seaState.cargoSlam * load * 0.042 * handling.cargoDragModifier;
  const seaDrag = -roughness * 0.07 + followingSeaAssist + beamSeaDrag + cargoSlamDrag;
  const stormDrag = -environment.stormIntensity * 0.12;
  const speedMultiplier = clamp(
    (1 + windAssist + currentAssist + skillAssist + seaDrag + stormDrag) * plan.speedModifier,
    0.58,
    1.52
  );
  const threatModifier =
    roughness * 0.08 +
    environment.stormIntensity * 0.1 +
    seaState.beamSea * 0.026 +
    seaState.cargoSlam * (0.018 + load * 0.04) +
    Math.max(0, -windScore) * 0.035 +
    Math.max(0, -currentScore) * 0.045 -
    ship.openWater * 0.012 +
    plan.riskModifier +
    handling.riskModifier;
  const speedFactors = {
    wind: percentDelta(windAssist),
    current: percentDelta(currentAssist),
    sea: percentDelta(seaDrag),
    storm: percentDelta(stormDrag),
    skill: percentDelta(skillAssist),
    plan: percentDelta(plan.speedModifier - 1),
    net: Math.round((speedMultiplier - 1) * 100),
    threat: Math.round(threatModifier * 100),
  };
  const tactic = describeRouteTactic({
    windScore,
    crosswind,
    currentScore,
    roughness,
    stormIntensity: environment.stormIntensity,
    seaState,
    speedMultiplier,
    speedFactors,
    plan: plan.id,
  });

  return {
    ...environment,
    roughness,
    speedMultiplier,
    threatModifier,
    seaLabel: describeSea(roughness),
    stormLabel: describeStorm(environment.stormIntensity),
    speedDelta: Math.round((speedMultiplier - 1) * 100),
    speedFactors,
    tacticLabel: tactic.label,
    tacticDetail: tactic.detail,
    planAdvice: tactic.advice,
    seaState,
    seaStateLabel: describeSeaState(seaState),
    sailPlan: plan.id,
    sailPlanLabel: plan.label,
    handlingLabel: shipHandlingLabel(state.currentShip),
  };
}

function percentDelta(value: number) {
  return Math.round(value * 100);
}

function describeRouteTactic({
  windScore,
  crosswind,
  currentScore,
  roughness,
  stormIntensity,
  seaState,
  speedMultiplier,
  speedFactors,
  plan,
}: {
  windScore: number;
  crosswind: number;
  currentScore: number;
  roughness: number;
  stormIntensity: number;
  seaState: RoutePhysicsProfile["seaState"];
  speedMultiplier: number;
  speedFactors: RouteConditions["speedFactors"];
  plan: SailPlanId;
}) {
  const waterPush = speedFactors.wind + speedFactors.current;
  const seaDrag = speedFactors.sea + speedFactors.storm;
  const roughWater = stormIntensity > 0.48 || roughness > 0.5;
  const label = roughWater
    ? plan === "quiet"
      ? "Quiet in heavy water"
      : plan === "hard"
      ? "Storm gamble"
      : plan === "cautious"
        ? "Reefed heavy water"
        : "Hard-water crossing"
    : plan === "quiet"
      ? "Low-profile run"
      : seaState.cargoSlam > 0.5
        ? "Slam water"
        : seaState.beamSea > 0.58
          ? "Beam-sea crossing"
          : seaState.followingSea > 0.22 && speedMultiplier > 1.06
            ? "Following swell"
            : windScore > 0.24 && currentScore > 0.1
              ? "Fast tradewind set"
              : windScore < -0.22 && currentScore < -0.08
                ? "Against the set"
                : crosswind > 0.74
                  ? "Beam reach"
                  : speedMultiplier > 1.12
                    ? "Fast water"
                    : speedMultiplier < 0.92
                      ? "Slow water"
                      : "Clean crossing";
  const detail = `${signedPercent(waterPush)} water | ${signedPercent(seaDrag)} sea | ${signedPercent(speedFactors.skill)} crew`;
  const advice = routePlanAdvice(plan, waterPush, seaDrag, stormIntensity, roughness, speedMultiplier);
  return { label, detail, advice };
}

function describeSeaState(seaState: RoutePhysicsProfile["seaState"]) {
  if (seaState.cargoSlam >= 0.58) return "cargo slam";
  if (seaState.beamSea >= 0.58) return "beam sea";
  if (seaState.followingSea >= 0.24) return "following swell";
  if (seaState.followingSea <= -0.18) return "against swell";
  if (seaState.peakWaveHeight >= 16) return "long swell";
  return "settled swell";
}

function routePlanAdvice(plan: SailPlanId, waterPush: number, seaDrag: number, stormIntensity: number, roughness: number, speedMultiplier: number) {
  const roughWater = stormIntensity > 0.34 || roughness > 0.42;
  if (plan === "quiet" && roughWater) return "Quiet, safer, slow";
  if (plan === "quiet") return "Low customs profile";
  if (plan === "hard" && roughWater) return "Fast, high wear";
  if (plan === "hard" && waterPush < -2) return "Pounding for little gain";
  if (plan === "cautious" && roughWater) return "Safer water read";
  if (plan === "cautious" && waterPush > 8 && seaDrag > -8) return "Leaving speed";
  if (plan === "balanced" && waterPush > 9 && stormIntensity < 0.22) return "Hard sail pays";
  if (plan === "balanced" && roughWater) return "Reef if hauling";
  if (speedMultiplier > 1.12) return "Good fast lane";
  if (speedMultiplier < 0.92) return "Delay or reef";
  return "Good fit";
}

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function describeWind(windScore: number, crosswind: number) {
  return windScore > 0.32 ? "tailwind" : windScore < -0.28 ? "headwind" : crosswind > 0.74 ? "beam wind" : "crosswind";
}

function describeCurrent(currentScore: number) {
  return currentScore > 0.18 ? "following current" : currentScore < -0.14 ? "contrary current" : "slack tide";
}

function describeSea(roughness: number) {
  return roughness > 0.56 ? "heavy swell" : roughness > 0.38 ? "rolling swell" : "soft water";
}

function describeStorm(intensity: number) {
  return intensity > 0.62 ? "storm front" : intensity > 0.34 ? "squall line" : intensity > 0.16 ? "rain bands" : "clear sky";
}

export function routeDays(state: GameState, fromId: string, toId: string) {
  const ship = deriveShipStats(state);
  const physics = routeConditions(state, fromId, toId);
  const rawDays = distanceBetween(fromId, toId) / (165 + ship.speed * 38);
  return clamp(Math.ceil(rawDays / physics.speedMultiplier), 2, 8);
}

export function routeWearEstimate(state: GameState, fromId: string, toId: string): RouteWearEstimate {
  const ship = deriveShipStats(state);
  const handling = shipHandlingFor(state.currentShip);
  const physics = routeConditions(state, fromId, toId);
  const days = routeDays(state, fromId, toId);
  const load = clamp(cargoUnits(state) / ship.cargoCap, 0, 1);
  const headwind = Math.max(0, -physics.windScore);
  const contraryCurrent = Math.max(0, -physics.currentScore);
  const beamStress = Math.max(0, physics.crosswind - 0.68);
  const hullPenalty = state.hull < ship.hullMax * 0.45 ? 1.6 : state.hull < ship.hullMax * 0.7 ? 0.7 : 0;

  const seaStress =
    Math.max(0, physics.roughness - 0.16) * 12.6 +
    physics.stormIntensity * 6.8 +
    physics.seaState.beamSea * 2.8 +
    physics.seaState.cargoSlam * 4.6 +
    Math.max(0, physics.seaState.peakWaveHeight - 10) * 0.12;
  const weatherStress = headwind * 3.2 + contraryCurrent * 4.2 + beamStress * 1.6;
  const voyageStress = Math.max(0, days - 1) * 0.82 + load * 1.85 * handling.cargoDragModifier + hullPenalty;
  const seamanshipRelief = ship.openWater * 0.66 + ship.navigation * 0.24;
  const stress = Math.max(0, (seaStress + weatherStress + voyageStress - seamanshipRelief) * sailPlanFor(state.sailPlan).wearModifier * handling.wearModifier);
  const hullWear = Math.round(clamp(stress * (0.54 + days * 0.12), 0, Math.min(24, ship.hullMax * 0.22)));

  return {
    hullWear,
    stress: Number(stress.toFixed(2)),
    label:
      hullWear >= 13
        ? "dangerous pounding"
        : hullWear >= 8
          ? "heavy wear"
          : hullWear >= 4
            ? "spray wear"
            : hullWear > 0
              ? "light wear"
              : "clean crossing",
  };
}

export function sailPlanFor(planId?: SailPlanId) {
  return sailPlans[planId ?? "balanced"] ?? sailPlans.balanced;
}

export function routeRisk(state: GameState, fromId: string, toId: string) {
  const from = portById(fromId);
  const to = portById(toId);
  const ship = deriveShipStats(state);
  const handling = shipHandlingFor(state.currentShip);
  const physics = routeConditions(state, fromId, toId);
  const cargoPressure = (cargoUnits(state) / ship.cargoCap) * handling.cargoRiskModifier;
  const hullPenalty = state.hull < ship.hullMax * 0.45 ? 0.1 : 0;
  const cannonRelief = ship.cannons * 0.025;
  const politicalRisk = state.politicalEvents
    .filter((event) => event.expires >= state.day && (event.factionId === from.faction || event.factionId === to.faction))
    .reduce((sum, event) => sum + event.riskModifier, 0);
  const standingRisk = Array.from(new Set([from.faction, to.faction])).reduce((sum, factionId) => {
    return sum + standingBenefits(state.factionStanding[factionId] ?? 0).routeRiskModifier;
  }, 0);
  const contractRisk = state.contracts
    .filter((contract) => contract.status === "active")
    .filter((contract) => {
      return contract.destinationPortId === toId || contract.stops?.some((stop) => stop.portId === toId && stop.delivered < stop.units);
    })
    .reduce((sum, contract) => {
      if (contract.kind === "escort") return sum + (contract.routeRiskModifier ?? -0.08);
      if (contract.kind === "smuggling") return sum + (contract.inspectionRisk ?? 0.12) * 0.35;
      return sum;
    }, 0);
  return clamp(
    (from.risk + to.risk) / 2 +
      cargoPressure * 0.12 +
      hullPenalty +
      physics.threatModifier +
      politicalRisk +
      standingRisk +
      contractRisk -
      cannonRelief -
      (hasCaptainSkillMastery(state, "navigation") ? 0.018 : 0),
    0.04,
    0.72
  );
}

export function cargoUnits(state: GameState) {
  return Object.entries(state.cargo).reduce((sum, [goodId, qty]) => {
    const good = goods.find((entry) => entry.id === goodId);
    return sum + qty * (good?.cargo ?? 1);
  }, 0);
}
