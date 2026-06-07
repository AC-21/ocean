import { ports } from "./data";
import { cargoUnits } from "./routing";
import { portIdentityFor } from "./portIdentity";
import { clamp } from "./math";
import { deriveShipStats } from "./stats";
import type { GameState } from "./types";

export type SeaRescueRead = {
  cargoRiskLabel: string;
  cargoLossChance: number;
  crewRiskLabel: string;
  delayDays: number;
  destinationFactionId: string;
  destinationId: string;
  destinationName: string;
  hullCost: number;
  label: string;
  moraleCost: number;
  portIdentityLabel: string;
  pressure: number;
  standingGain: number;
};

export function seaRescueReadFor(state: GameState): SeaRescueRead | null {
  const encounter = state.encounter;
  const voyage = state.voyage;
  if (!encounter || encounter.kind !== "sea" || !voyage) return null;
  const destination = ports.find((port) => port.id === voyage.toId) ?? ports[0];
  const identity = portIdentityFor(destination.id);
  const stats = deriveShipStats(state);
  const pressure = clamp(
    Math.max(encounter.strength / 100, encounter.roughness ?? 0, encounter.stormIntensity ?? 0, encounter.waveEnergy ?? 0),
    0,
    1
  );
  const storm = encounter.seaKind === "storm";
  const hullThreat = Math.max(1, encounter.hullThreat ?? Math.round(encounter.strength * 0.08));
  const moraleThreat = Math.max(1, encounter.moraleThreat ?? Math.round(encounter.strength * 0.06));
  const crewFatigue = clamp((70 - state.crewMorale) / 70, 0, 0.6);
  const cargoPressure = encounter.cargoThreat && cargoUnits(state) > 0 ? 0.22 : cargoUnits(state) > 0 ? 0.07 : 0;
  const cargoLossChance = clamp(cargoPressure + pressure * 0.16 + crewFatigue * 0.12 - stats.openWater * 0.018, 0, 0.52);

  return {
    cargoRiskLabel: cargoLossChance >= 0.32 ? "cargo exposed" : cargoLossChance >= 0.14 ? "cargo watch" : "cargo steady",
    cargoLossChance: Number(cargoLossChance.toFixed(3)),
    crewRiskLabel: state.crewMorale <= 42 ? "crew frayed" : state.crew.length ? "crew strained" : "short-handed",
    delayDays: storm || pressure >= 0.62 ? 1 : 0,
    destinationFactionId: destination.faction,
    destinationId: destination.id,
    destinationName: destination.name,
    hullCost: Math.max(1, Math.round(hullThreat * (storm ? 0.34 : 0.24))),
    label: `${identity.label} rescue`,
    moraleCost: Math.max(1, Math.round(moraleThreat * (state.crewMorale <= 45 ? 0.5 : 0.34))),
    portIdentityLabel: identity.label,
    pressure: Number(pressure.toFixed(3)),
    standingGain: Number((storm ? 1.5 : 1.0 + pressure * 0.6).toFixed(1)),
  };
}
