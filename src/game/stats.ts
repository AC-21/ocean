import { captainSkillCatalog, crewCatalog, equipmentCatalog, shipCatalog } from "./data";
import { buildSynergyEffectsFor } from "./buildSynergies";
import { crewRankEffects, crewTraitEffects, crewTraitsFor, moraleStatEffects } from "./crew";
import { equipmentFitBonusFor } from "./outfitting";
import type { GameState, ShipStats } from "./types";

export function currentShip(state: GameState) {
  return shipCatalog.find((ship) => ship.id === state.currentShip) ?? shipCatalog[0];
}

export function deriveShipStats(state: GameState): ShipStats {
  const ship = currentShip(state);
  const stats: ShipStats = {
    cargoCap: ship.cargoCap,
    cannons: ship.cannons,
    speed: ship.speed,
    openWater: ship.openWater,
    crewCap: ship.crewCap,
    hullMax: ship.hullMax,
    navigation: 0,
    negotiation: 0,
  };

  for (const id of state.equipment) {
    const item = equipmentCatalog.find((entry) => entry.id === id);
    if (!item) continue;
    applyEffects(stats, item.effects);
    const fitBonus = equipmentFitBonusFor(ship.id, item);
    if (fitBonus) applyEffects(stats, fitBonus.effects);
  }

  for (const id of state.crew) {
    const crew = crewCatalog.find((entry) => entry.id === id);
    if (!crew) continue;
    applyEffects(stats, crew.effects);
    applyEffects(stats, crewRankEffects(crew.effects, state.crewXp?.[id] ?? 0));
    applyEffects(stats, crewTraitEffects(crewTraitsFor(state, id)));
  }

  for (const skill of captainSkillCatalog) {
    const level = state.captainSkills?.[skill.id] ?? 0;
    if (level <= 0) continue;
    applyEffects(stats, scaleEffects(skill.effects, level));
  }

  applyEffects(stats, moraleStatEffects(state));
  applyEffects(stats, buildSynergyEffectsFor(state));
  normalizeStats(stats);
  return stats;
}

function applyEffects(stats: ShipStats, effects: Partial<ShipStats>) {
  for (const [key, value] of Object.entries(effects) as Array<[keyof ShipStats, number]>) {
    stats[key] += value;
  }
}

function scaleEffects(effects: Partial<ShipStats>, level: number) {
  return Object.fromEntries(
    Object.entries(effects).map(([key, value]) => [key, (value ?? 0) * level])
  ) as Partial<ShipStats>;
}

function normalizeStats(stats: ShipStats) {
  stats.cargoCap = Math.max(1, stats.cargoCap);
  stats.crewCap = Math.max(0, stats.crewCap);
  stats.hullMax = Math.max(1, stats.hullMax);
  stats.cannons = Math.max(0, stats.cannons);
  stats.speed = Math.max(0, stats.speed);
  stats.openWater = Math.max(0, stats.openWater);
  stats.navigation = Math.max(0, stats.navigation);
  stats.negotiation = Math.max(0, stats.negotiation);
}
