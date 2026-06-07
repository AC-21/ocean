import { factions, goods } from "./data";
import { clamp } from "./math";
import { deriveShipStats } from "./stats";
import type { GameState } from "./types";

export type CustomsCargoCandidate = {
  goodId: string;
  goodName: string;
  quantity: number;
  units: number;
};

export type CustomsActionRead = {
  cargoBondAvailable: boolean;
  cargoBondFee: number;
  cargoCandidate: CustomsCargoCandidate | null;
  favorAvailable: boolean;
  favorFee: number;
  favorStandingCost: number;
  fine: number;
  hasLedger: boolean;
  manifestCost: number;
  manifestStandingGain: number;
};

export function customsActionReadFor(state: GameState): CustomsActionRead | null {
  const encounter = state.encounter;
  if (!encounter || encounter.kind !== "inspection" || !encounter.factionId) return null;
  const stats = deriveShipStats(state);
  const fine = Math.max(0, Math.round(encounter.fine ?? 0));
  const hasLedger = state.equipment.includes("customs_ledger");
  const standing = state.factionStanding[encounter.factionId] ?? 0;
  const cargoCandidate = customsCargoCandidateFor(state);
  const manifestCost = boundedCustomsCost(fine * (hasLedger ? 0.42 : 0.56) - stats.negotiation * 6, fine);
  const cargoBondFee = boundedCustomsCost(fine * 0.18 + encounter.strength * 0.08, fine);
  const favorStandingCost = Number(clamp(2.5 - standing * 0.025 - (hasLedger ? 0.35 : 0), 1.4, 3.2).toFixed(1));
  const favorFee = boundedCustomsCost(fine * (hasLedger ? 0.15 : 0.24) + encounter.strength * 0.04, fine);

  return {
    cargoBondAvailable: Boolean(cargoCandidate),
    cargoBondFee,
    cargoCandidate,
    favorAvailable: standing >= favorStandingCost,
    favorFee,
    favorStandingCost,
    fine,
    hasLedger,
    manifestCost,
    manifestStandingGain: hasLedger ? 1.65 : 1.2,
  };
}

export function customsCargoCandidateFor(state: GameState): CustomsCargoCandidate | null {
  const encounter = state.encounter;
  if (!encounter || encounter.kind !== "inspection" || !encounter.factionId) return null;
  const faction = factions.find((entry) => entry.id === encounter.factionId);
  const candidateIds = uniqueIds([
    encounter.suspectGoodId,
    ...(faction?.tariffGoods ?? []),
  ]);
  const sorted = candidateIds
    .filter((goodId) => (state.cargo[goodId] || 0) > 0)
    .sort((left, right) => {
      if (left === encounter.suspectGoodId) return -1;
      if (right === encounter.suspectGoodId) return 1;
      return (state.cargo[right] || 0) - (state.cargo[left] || 0);
    });
  const goodId = sorted[0];
  if (!goodId) return null;
  const quantity = state.cargo[goodId] || 0;
  const units = Math.min(quantity, Math.max(1, Math.round(encounter.seizedUnits ?? 1)));
  const good = goods.find((entry) => entry.id === goodId);
  return {
    goodId,
    goodName: good?.name ?? goodId,
    quantity,
    units,
  };
}

function boundedCustomsCost(value: number, fine: number) {
  if (fine <= 0) return 0;
  return Math.min(fine, Math.max(10, Math.round(value / 10) * 10));
}

function uniqueIds(ids: Array<string | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}
