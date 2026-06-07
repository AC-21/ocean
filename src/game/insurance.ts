import { goods, ports } from "./data";
import { clamp, money } from "./math";
import { standingBenefits } from "./politics";
import { cargoUnits, portById, routeDays, routeRisk } from "./routing";
import { sellPriceFor } from "./economy";
import type { CargoInsurance, GameState } from "./types";

export type CargoInsuranceQuote = {
  policy: CargoInsurance;
  value: number;
  routeRisk: number;
  routeDays: number;
  label: string;
};

export type CargoLoss = {
  goodId: string;
  amount: number;
  value: number;
};

export function cargoInsurableValue(state: Pick<GameState, "cargo" | "cargoBasis" | "market" | "marketStock" | "trends" | "events" | "politicalEvents" | "factionStanding" | "currentPort" | "crew" | "crewXp" | "crewMorale" | "equipment" | "captainSkills" | "currentShip" | "ownedShips" | "hull">) {
  return goods.reduce((sum, good) => {
    const quantity = state.cargo[good.id] || 0;
    if (quantity <= 0) return sum;
    const basis = state.cargoBasis?.[good.id] ?? sellPriceFor(state as GameState, state.currentPort, good.id);
    return sum + quantity * Math.max(1, basis);
  }, 0);
}

export function insuranceQuoteFor(state: GameState): CargoInsuranceQuote | null {
  if (state.voyage || state.encounter || state.gameOver) return null;
  if (state.currentPort === state.selectedPort) return null;
  if (state.cargoInsurance) return null;

  const value = cargoInsurableValue(state);
  if (value <= 0) return null;

  const origin = portById(state.currentPort);
  const destination = portById(state.selectedPort);
  const risk = routeRisk(state, origin.id, destination.id);
  const days = routeDays(state, origin.id, destination.id);
  const standing = state.factionStanding[origin.faction] ?? 0;
  const politics = standingBenefits(standing);
  const cargoPressure = cargoUnits(state) / Math.max(1, value / 120);
  const standingModifier = clamp(1 - standing * 0.005, 0.82, 1.16);
  const routeRate = 0.044 + risk * 0.27 + Math.min(cargoPressure, 1.1) * 0.018;
  const premium = Math.max(24, Math.round(value * routeRate * standingModifier));
  const deductibleRate = clamp(0.18 - Math.max(0, politics.contractRewardModifier - 1) * 0.45 + Math.max(0, -standing) * 0.004, 0.1, 0.28);
  const policy: CargoInsurance = {
    providerFactionId: origin.faction,
    originPortId: origin.id,
    destinationPortId: destination.id,
    coveredValue: value,
    remainingCoverage: value,
    premium,
    deductibleRate: Number(deductibleRate.toFixed(2)),
    expiresDay: state.day + days + 1,
  };

  return {
    policy,
    value,
    routeRisk: risk,
    routeDays: days,
    label: `${origin.name} to ${destination.name}: ${money(premium)} for ${money(value)}`,
  };
}

export function insuranceStatusText(policy: CargoInsurance | null) {
  if (!policy) return "No cargo policy";
  return `${portName(policy.destinationPortId)} | ${money(policy.remainingCoverage)} cover`;
}

export function normalizeCargoInsurance(value: CargoInsurance | null | undefined, day: number): CargoInsurance | null {
  if (!value || typeof value !== "object") return null;
  if (!ports.some((port) => port.id === value.originPortId) || !ports.some((port) => port.id === value.destinationPortId)) return null;
  const premium = Math.round(Number(value.premium));
  const coveredValue = Math.round(Number(value.coveredValue));
  const remainingCoverage = Math.round(Number(value.remainingCoverage));
  const expiresDay = Math.round(Number(value.expiresDay));
  const deductibleRate = Number(value.deductibleRate);
  if (premium <= 0 || coveredValue <= 0 || remainingCoverage <= 0 || expiresDay < day) return null;
  if (!Number.isFinite(premium) || !Number.isFinite(coveredValue) || !Number.isFinite(remainingCoverage) || !Number.isFinite(expiresDay)) return null;
  return {
    providerFactionId: value.providerFactionId,
    originPortId: value.originPortId,
    destinationPortId: value.destinationPortId,
    coveredValue,
    remainingCoverage: clamp(remainingCoverage, 0, coveredValue),
    premium,
    deductibleRate: clamp(Number.isFinite(deductibleRate) ? deductibleRate : 0.18, 0.08, 0.32),
    expiresDay,
  };
}

function portName(portId: string) {
  return ports.find((port) => port.id === portId)?.name ?? portId;
}
