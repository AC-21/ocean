import { crewCatalog, equipmentCatalog, shipCatalog } from "./data";
import type { GameState, ShipRoleId, ShipStats } from "./types";

export type BuildSynergyId = "charter_house" | "freeport_windknife" | "admiralty_gunline" | "league_freightline";

export type BuildSynergyRequirement = {
  id: string;
  label: string;
  met: (state: Pick<GameState, "crew" | "currentShip" | "equipment">) => boolean;
};

export type BuildSynergySpec = {
  detail: string;
  effects: Partial<ShipStats>;
  id: BuildSynergyId;
  label: string;
  requirements: BuildSynergyRequirement[];
  summary: string;
};

export type ActiveBuildSynergy = Omit<BuildSynergySpec, "requirements"> & {
  requirementLabels: string[];
};

export type BuildSynergyProgress = {
  active: boolean;
  detail: string;
  effects: Partial<ShipStats>;
  id: BuildSynergyId;
  label: string;
  missing: string[];
  progress: number;
  requirementCount: number;
  summary: string;
};

export const buildSynergySpecs: BuildSynergySpec[] = [
  {
    detail: "Paperwork, market reads, and a senior desk turn faction friction into better deals.",
    effects: { navigation: 1, negotiation: 1 },
    id: "charter_house",
    label: "Charter House Rig",
    requirements: [
      shipRole("balanced", "Ledger Brig"),
      anyEquipment(["customs_ledger", "chart_table", "weather_glass"], "charter instrument"),
      anyCrew(["quartermaster", "navigator"], "quartermaster or navigator"),
    ],
    summary: "+1 navigation, +1 negotiation",
  },
  {
    detail: "Fast hull, sharp canvas, and a specialist make wind windows worth chasing.",
    effects: { navigation: 1, speed: 1 },
    id: "freeport_windknife",
    label: "Freeport Windknife",
    requirements: [
      shipRole("clipper", "Clipper Kite"),
      anyEquipment(["deep_rigging", "storm_sails"], "fast canvas"),
      anyCrew(["navigator", "quartermaster"], "route specialist"),
    ],
    summary: "+1 speed, +1 navigation",
  },
  {
    detail: "A patrol hull with trained guns can turn pressure lanes into controlled work.",
    effects: { cannons: 1, openWater: 1 },
    id: "admiralty_gunline",
    label: "Admiralty Gunline",
    requirements: [
      shipRole(["patrol", "barge"], "patrol or armored hull"),
      anyEquipment(["gun_deck", "long_nines", "signal_cannon"], "gun or signal hardpoint"),
      anyCrew(["gunner", "boatswain"], "gunner or boatswain"),
    ],
    summary: "+1 cannons, +1 open water",
  },
  {
    detail: "Heavy holds, dock labor, and crew rotation make loaded routes less sluggish.",
    effects: { cargoCap: 8, negotiation: 1 },
    id: "league_freightline",
    label: "League Freightline",
    requirements: [
      shipRole("freighter", "League Carrier"),
      anyEquipment(["cargo_hoist", "galley_mess", "watch_bunks"], "labor refit"),
      anyCrew(["quartermaster", "boatswain"], "dock or deck crew"),
    ],
    summary: "+8 cargo, +1 negotiation",
  },
];

export function activeBuildSynergiesFor(state: Pick<GameState, "crew" | "currentShip" | "equipment">): ActiveBuildSynergy[] {
  return buildSynergySpecs
    .filter((spec) => spec.requirements.every((requirement) => requirement.met(state)))
    .map((spec) => ({
      detail: spec.detail,
      effects: spec.effects,
      id: spec.id,
      label: spec.label,
      requirementLabels: spec.requirements.map((requirement) => requirement.label),
      summary: spec.summary,
    }));
}

export function buildSynergyEffectsFor(state: Pick<GameState, "crew" | "currentShip" | "equipment">): Partial<ShipStats> {
  return activeBuildSynergiesFor(state).reduce<Partial<ShipStats>>((effects, synergy) => {
    for (const [key, value] of Object.entries(synergy.effects) as Array<[keyof ShipStats, number]>) {
      effects[key] = (effects[key] ?? 0) + value;
    }
    return effects;
  }, {});
}

export function buildSynergyProgressFor(state: Pick<GameState, "crew" | "currentShip" | "equipment">): BuildSynergyProgress[] {
  return buildSynergySpecs
    .map((spec) => {
      const missing = spec.requirements.filter((requirement) => !requirement.met(state)).map((requirement) => requirement.label);
      return {
        active: missing.length === 0,
        detail: spec.detail,
        effects: spec.effects,
        id: spec.id,
        label: spec.label,
        missing,
        progress: spec.requirements.length - missing.length,
        requirementCount: spec.requirements.length,
        summary: spec.summary,
      };
    })
    .sort((left, right) => Number(right.active) - Number(left.active) || right.progress - left.progress || left.label.localeCompare(right.label));
}

export function topBuildSynergyProgressFor(state: Pick<GameState, "crew" | "currentShip" | "equipment">, limit = 3) {
  return buildSynergyProgressFor(state).slice(0, limit);
}

export function buildSynergyLabelForEffects(effects: Partial<ShipStats>) {
  return (Object.entries(effects) as Array<[keyof ShipStats, number]>)
    .filter(([, value]) => value)
    .map(([key, value]) => `${value > 0 ? "+" : ""}${value} ${statLabel(key)}`)
    .join(", ");
}

function shipRole(roleOrRoles: ShipRoleId | ShipRoleId[], label: string): BuildSynergyRequirement {
  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  return {
    id: `ship:${roles.join("|")}`,
    label,
    met: (state) => {
      const ship = shipCatalog.find((entry) => entry.id === state.currentShip);
      return Boolean(ship && roles.includes(ship.role));
    },
  };
}

function anyEquipment(ids: string[], label: string): BuildSynergyRequirement {
  return {
    id: `equipment:${ids.join("|")}`,
    label,
    met: (state) => ids.some((id) => state.equipment.includes(id)),
  };
}

function anyCrew(ids: string[], label: string): BuildSynergyRequirement {
  return {
    id: `crew:${ids.join("|")}`,
    label,
    met: (state) => ids.some((id) => state.crew.includes(id)),
  };
}

function statLabel(stat: keyof ShipStats) {
  if (stat === "cargoCap") return "cargo";
  if (stat === "crewCap") return "crew";
  if (stat === "hullMax") return "hull";
  if (stat === "openWater") return "water";
  return stat;
}

export function validateBuildSynergyCatalog() {
  const equipmentIds = new Set(equipmentCatalog.map((item) => item.id));
  const crewIds = new Set(crewCatalog.map((crew) => crew.id));
  const roles = new Set(shipCatalog.map((ship) => ship.role));
  return buildSynergySpecs.every((spec) => {
    return spec.requirements.every((requirement) => {
      if (requirement.id.startsWith("equipment:")) {
        return requirement.id.replace("equipment:", "").split("|").every((id) => equipmentIds.has(id));
      }
      if (requirement.id.startsWith("crew:")) {
        return requirement.id.replace("crew:", "").split("|").every((id) => crewIds.has(id));
      }
      if (requirement.id.startsWith("ship:")) {
        return requirement.id.replace("ship:", "").split("|").every((role) => roles.has(role as ShipRoleId));
      }
      return false;
    });
  });
}
