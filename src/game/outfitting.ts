import { equipmentCatalog, shipCatalog } from "./data";
import type { EquipmentSlot, GameState, ShipRoleId, ShipStats, UpgradeSpec } from "./types";

export const equipmentSlotLabels: Record<EquipmentSlot, string> = {
  deck: "Deck",
  instrument: "Instrument",
  hardpoint: "Hardpoint",
  quarters: "Quarters",
};

export function equipmentById(id: string) {
  return equipmentCatalog.find((item) => item.id === id) ?? null;
}

export function equipmentInSlot(state: Pick<GameState, "equipment">, slot: EquipmentSlot) {
  return state.equipment.map(equipmentById).find((item): item is UpgradeSpec => Boolean(item && item.slot === slot)) ?? null;
}

export function installEquipmentIds(equipmentIds: string[], item: UpgradeSpec) {
  return [...equipmentIds.filter((id) => equipmentById(id)?.slot !== item.slot), item.id];
}

export type EquipmentFitBonus = {
  effects: Partial<ShipStats>;
  label: string;
};

const equipmentFitBonuses: Record<string, Partial<Record<ShipRoleId, EquipmentFitBonus>>> = {
  deep_rigging: {
    starter: { effects: { openWater: 1 }, label: "Cutter safety fit" },
    clipper: { effects: { speed: 1 }, label: "Route hunter trim" },
  },
  cargo_hoist: {
    balanced: { effects: { cargoCap: 4 }, label: "Trader hold balance" },
    barge: { effects: { cargoCap: 8 }, label: "Barge freight tackle" },
    freighter: { effects: { cargoCap: 12 }, label: "Carrier hatch tackle" },
  },
  storm_sails: {
    starter: { effects: { openWater: 1 }, label: "Short-handed reef points" },
    clipper: { effects: { speed: 1 }, label: "Knife-edge canvas" },
  },
  drogue_anchor: {
    starter: { effects: { openWater: 1 }, label: "Cutter drogue plan" },
    patrol: { effects: { navigation: 1 }, label: "Boarding bridle drill" },
    barge: { effects: { hullMax: 8 }, label: "Heavy-weather bridle" },
    freighter: { effects: { openWater: 1, cargoCap: 4 }, label: "Loaded sea bridle" },
  },
  weather_glass: {
    starter: { effects: { navigation: 1 }, label: "Coastal bearings" },
    balanced: { effects: { navigation: 1 }, label: "Ledger route charts" },
  },
  chart_table: {
    balanced: { effects: { negotiation: 1 }, label: "Charter dispatch desk" },
    clipper: { effects: { navigation: 1 }, label: "Fast-route plotting" },
  },
  customs_ledger: {
    balanced: { effects: { negotiation: 1 }, label: "Charter permit desk" },
    patrol: { effects: { navigation: 1 }, label: "Inspection papers desk" },
    freighter: { effects: { negotiation: 1 }, label: "Carrier manifest office" },
  },
  reinforced_ribs: {
    starter: { effects: { hullMax: 6 }, label: "Cutter knees" },
    barge: { effects: { hullMax: 12 }, label: "Barge plating" },
    freighter: { effects: { hullMax: 8 }, label: "Loaded-frame bracing" },
  },
  gun_deck: {
    balanced: { effects: { cannons: 1 }, label: "Brig gunports" },
    patrol: { effects: { navigation: 1 }, label: "Boarding party lockers" },
    barge: { effects: { cannons: 1 }, label: "Broadside mounts" },
  },
  long_nines: {
    balanced: { effects: { cannons: 1 }, label: "Brig chase battery" },
    patrol: { effects: { cannons: 1 }, label: "Cutter chase guns" },
    barge: { effects: { cannons: 1, hullMax: 4 }, label: "Fortress gun crew" },
  },
  ballast_keel: {
    starter: { effects: { hullMax: 4 }, label: "Stiffer little hull" },
    barge: { effects: { openWater: 1, hullMax: 6 }, label: "Freight ballast plan" },
    freighter: { effects: { openWater: 1, cargoCap: 4 }, label: "Loaded ballast plan" },
  },
  signal_cannon: {
    balanced: { effects: { navigation: 1 }, label: "Convoy signal book" },
    clipper: { effects: { speed: 1 }, label: "Chaser signals" },
    patrol: { effects: { negotiation: 1 }, label: "Authority signal flags" },
  },
  smuggler_locker: {
    starter: { effects: { cargoCap: 2 }, label: "Clever stowage" },
    clipper: { effects: { negotiation: 1 }, label: "Fast-hide compartments" },
  },
  crew_quarters: {
    balanced: { effects: { crewCap: 1 }, label: "Brig bunks" },
    barge: { effects: { hullMax: 8 }, label: "Workgang frames" },
    freighter: { effects: { crewCap: 1, cargoCap: 4 }, label: "Hold crew rotation" },
  },
  watch_bunks: {
    balanced: { effects: { navigation: 1 }, label: "Brig watch bill" },
    clipper: { effects: { openWater: 1 }, label: "Rotating fast watches" },
    patrol: { effects: { crewCap: 1 }, label: "Boarding watch bunks" },
    freighter: { effects: { crewCap: 1 }, label: "Carrier shift bunks" },
  },
  officer_cabins: {
    balanced: { effects: { navigation: 1 }, label: "Officer watch rotation" },
    clipper: { effects: { openWater: 1 }, label: "Long-run watch relief" },
  },
  galley_mess: {
    starter: { effects: { negotiation: 1 }, label: "Small-crew table" },
    barge: { effects: { crewCap: 1 }, label: "Freight crew galley" },
    freighter: { effects: { negotiation: 1, crewCap: 1 }, label: "Carrier workgang mess" },
  },
};

export function equipmentFitBonusFor(shipId: string, itemOrId: UpgradeSpec | string): EquipmentFitBonus | null {
  const item = typeof itemOrId === "string" ? equipmentById(itemOrId) : itemOrId;
  if (!item) return null;
  const ship = shipCatalog.find((entry) => entry.id === shipId) ?? shipCatalog[0];
  return equipmentFitBonuses[item.id]?.[ship.role] ?? null;
}

export function normalizeEquipmentIds(equipmentIds: string[]) {
  const seen = new Set<EquipmentSlot>();
  const normalized: string[] = [];
  for (const id of equipmentIds) {
    const item = equipmentById(id);
    if (!item || seen.has(item.slot)) continue;
    seen.add(item.slot);
    normalized.push(item.id);
  }
  return normalized;
}
