import { contractStops } from "./contracts";
import { hasCaptainSkillMastery } from "./captainSkills";
import { clamp } from "./math";
import { deriveShipStats } from "./stats";
import type { GameState } from "./types";

export type PirateTacticalRead = {
  battleRating: number;
  escapeChance: number;
  escortDuty: boolean;
  fightChance: number;
  parleyChance: number;
  parleyCost: number;
  parleyLabel: string;
  pirateRating: number;
  recommendation: "fight" | "warn" | "run" | "pay";
  recommendationLabel: string;
  riskLabel: string;
  runLabel: string;
  warnChance: number;
  warnLabel: string;
};

export function pirateTacticalReadFor(state: GameState): PirateTacticalRead | null {
  const encounter = state.encounter;
  if (!encounter || encounter.kind !== "pirate") return null;
  const stats = deriveShipStats(state);
  const hullRatio = clamp(state.hull / Math.max(1, stats.hullMax), 0, 1);
  const longNineSignal = state.equipment.includes("long_nines") ? 12 : 0;
  const escortDuty = hasEscortDuty(state);
  const escortSignal = escortDuty ? 10 : 0;
  const gunDrill = hasCaptainSkillMastery(state, "gunnery");
  const battleRating = stats.cannons * 34 + state.hull * 0.5 + stats.openWater * 4 + longNineSignal + escortSignal + (gunDrill ? 16 : 0);
  const pirateRating = encounter.strength + 17;
  const fightChance = clamp(0.5 + (battleRating - pirateRating) / 105, 0.1, 0.9);
  const escapeChance = clamp(0.34 + stats.speed * 0.14 + state.hull * 0.003 - encounter.strength * 0.002, 0.12, 0.84);
  const admiraltyStanding = state.factionStanding.admiralty ?? 0;
  const equipmentSignal =
    (state.equipment.includes("signal_cannon") ? 0.1 : 0) +
    (state.equipment.includes("gun_deck") ? 0.06 : 0) +
    (state.equipment.includes("long_nines") ? 0.09 : 0);
  const warnChance = clamp(
    0.16 +
      stats.cannons * 0.085 +
      (state.captainSkills.gunnery ?? 0) * 0.075 +
      (gunDrill ? 0.07 : 0) +
      stats.navigation * 0.018 +
      hullRatio * 0.08 +
      Math.max(-10, Math.min(15, admiraltyStanding)) * 0.01 +
      equipmentSignal +
      (escortDuty ? 0.08 : 0) -
      encounter.strength * 0.0015,
    0.08,
    0.82
  );
  const parleyChance = clamp(
    0.24 +
      stats.negotiation * 0.065 +
      (state.captainSkills.brokerage ?? 0) * 0.055 +
      Math.max(-8, Math.min(10, state.factionStanding.freeports ?? 0)) * 0.008 +
      (state.equipment.includes("customs_ledger") ? 0.04 : 0) -
      encounter.strength * 0.0012,
    0.1,
    0.78
  );
  const parleyDiscount = clamp(0.62 - stats.negotiation * 0.035 - (state.captainSkills.brokerage ?? 0) * 0.035, 0.32, 0.72);
  const parleyCost = Math.max(20, Math.round((encounter.bribe * parleyDiscount) / 10) * 10);
  const recommendation = strongestTactic({ fightChance, warnChance, escapeChance, cash: state.cash, bribe: encounter.bribe });
  return {
    battleRating: Math.round(battleRating),
    escapeChance,
    escortDuty,
    fightChance,
    parleyChance,
    parleyCost,
    parleyLabel: `${percent(parleyChance)} parley | ${money(parleyCost)} ask`,
    pirateRating: Math.round(pirateRating),
    recommendation,
    recommendationLabel: recommendationText(recommendation),
    riskLabel: `${percent(fightChance)} fight | ${percent(warnChance)} warn | ${percent(escapeChance)} run`,
    runLabel: `${percent(escapeChance)} escape`,
    warnChance,
    warnLabel: `${percent(warnChance)} warn-off`,
  };
}

function hasEscortDuty(state: GameState) {
  const destinationId = state.pendingArrival ?? state.voyage?.toId ?? state.selectedPort;
  return state.contracts.some((contract) => {
    if (contract.status !== "active" || contract.kind !== "escort") return false;
    return contract.destinationPortId === destinationId || contractStops(contract).some((stop) => stop.portId === destinationId && stop.delivered < stop.units);
  });
}

function strongestTactic(input: { fightChance: number; warnChance: number; escapeChance: number; cash: number; bribe: number }): PirateTacticalRead["recommendation"] {
  if (input.fightChance >= 0.62) return "fight";
  if (input.warnChance >= 0.54) return "warn";
  if (input.escapeChance >= 0.58) return "run";
  if (input.cash >= input.bribe) return "pay";
  return input.warnChance >= input.escapeChance ? "warn" : "run";
}

function recommendationText(recommendation: PirateTacticalRead["recommendation"]) {
  if (recommendation === "fight") return "Guns favor a fight";
  if (recommendation === "warn") return "Show guns first";
  if (recommendation === "run") return "Canvas gives the best exit";
  return "Payment is the clean exit";
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function money(value: number) {
  return `$${Math.round(value)}`;
}
