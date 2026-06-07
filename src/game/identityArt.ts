import { contractChainTemplates } from "./contracts";
import { crewCatalog, factions } from "./data";
import type { Contract, Encounter, Faction } from "./types";

export type IdentityArtKind = "captain" | "crew" | "faction" | "giver" | "encounter";
export type IdentityArtShape = "seal" | "bust" | "writ" | "watch";

export type IdentityArtSpec = {
  id: string;
  kind: IdentityArtKind;
  name: string;
  initials: string;
  role: string;
  cue: string;
  color: string;
  accent: string;
  shape: IdentityArtShape;
};

export const captainIdentityArt: IdentityArtSpec = {
  id: "captain-harborline",
  kind: "captain",
  name: "Harborline Captain",
  initials: "HC",
  role: "Command mark",
  cue: "route slate, brass pin, storm glass",
  color: "#2f6f7b",
  accent: "#93d4dc",
  shape: "seal",
};

export const factionIdentityArt: Record<string, IdentityArtSpec> = {
  charter: {
    id: "faction-charter",
    kind: "faction",
    name: "Charter Bank",
    initials: "CB",
    role: "Credit house",
    cue: "ledger seal and banker blue wax",
    color: "#367c9a",
    accent: "#93d4dc",
    shape: "seal",
  },
  freeports: {
    id: "faction-freeports",
    kind: "faction",
    name: "Freeport Compact",
    initials: "FC",
    role: "Open-dock compact",
    cue: "green gate mark and fast-water pass",
    color: "#4fa36c",
    accent: "#9fe2b2",
    shape: "seal",
  },
  admiralty: {
    id: "faction-admiralty",
    kind: "faction",
    name: "Admiralty Court",
    initials: "AC",
    role: "Patrol authority",
    cue: "red sash, convoy stamp, patrol law",
    color: "#c8503e",
    accent: "#ffb7a8",
    shape: "seal",
  },
  league: {
    id: "faction-league",
    kind: "faction",
    name: "Dockworkers League",
    initials: "DL",
    role: "Labor syndicate",
    cue: "ochre dock hook and cargo scale",
    color: "#d6a43a",
    accent: "#f2cf79",
    shape: "seal",
  },
};

export const crewIdentityArt: Record<string, IdentityArtSpec> = {
  navigator: {
    id: "crew-navigator",
    kind: "crew",
    name: "Navigator",
    initials: "NV",
    role: "Route reader",
    cue: "spyglass and folded chart",
    color: "#367c9a",
    accent: "#93d4dc",
    shape: "bust",
  },
  quartermaster: {
    id: "crew-quartermaster",
    kind: "crew",
    name: "Quartermaster",
    initials: "QM",
    role: "Cargo broker",
    cue: "tally slate and loading gloves",
    color: "#4f8f73",
    accent: "#9fe2b2",
    shape: "bust",
  },
  boatswain: {
    id: "crew-boatswain",
    kind: "crew",
    name: "Boatswain",
    initials: "BS",
    role: "Hull keeper",
    cue: "tarred rope and oilskin coat",
    color: "#b28a34",
    accent: "#f2cf79",
    shape: "bust",
  },
  gunner: {
    id: "crew-gunner",
    kind: "crew",
    name: "Gunner",
    initials: "GN",
    role: "Encounter hand",
    cue: "powder key and red collar",
    color: "#aa4c3d",
    accent: "#ffb7a8",
    shape: "bust",
  },
};

export const giverIdentityArt: Record<string, IdentityArtSpec> = {
  "Maribel Quill": {
    id: "giver-maribel-quill",
    kind: "giver",
    name: "Maribel Quill",
    initials: "MQ",
    role: "Charter auditor",
    cue: "ledger folio, blue gloves, precise stare",
    color: "#367c9a",
    accent: "#93d4dc",
    shape: "writ",
  },
  "Toma Vey": {
    id: "giver-toma-vey",
    kind: "giver",
    name: "Toma Vey",
    initials: "TV",
    role: "Freeport fixer",
    cue: "green dock pass and salt-stained scarf",
    color: "#4fa36c",
    accent: "#9fe2b2",
    shape: "writ",
  },
  "Commodore Rusk": {
    id: "giver-commodore-rusk",
    kind: "giver",
    name: "Commodore Rusk",
    initials: "CR",
    role: "Convoy officer",
    cue: "red patrol sash and sealed marks",
    color: "#c8503e",
    accent: "#ffb7a8",
    shape: "writ",
  },
};

const fallbackFaction: IdentityArtSpec = {
  id: "faction-unknown",
  kind: "faction",
  name: "Unknown Authority",
  initials: "??",
  role: "Unmarked harbor",
  cue: "blank seal",
  color: "#60706f",
  accent: "#d7e4df",
  shape: "seal",
};

export function captainIdentityFor(): IdentityArtSpec {
  return captainIdentityArt;
}

export function factionIdentityFor(factionId: string): IdentityArtSpec {
  return factionIdentityArt[factionId] ?? {
    ...fallbackFaction,
    id: `faction-${factionId || "unknown"}`,
    name: factionId || fallbackFaction.name,
  };
}

export function factionIdentityForPortFaction(faction: Faction): IdentityArtSpec {
  return factionIdentityFor(faction.id);
}

export function crewIdentityArtFor(crewId: string): IdentityArtSpec {
  return crewIdentityArt[crewId] ?? {
    id: `crew-${crewId || "unknown"}`,
    kind: "crew",
    name: crewId || "Unknown Crew",
    initials: initialsFor(crewId || "Crew"),
    role: "Crew hand",
    cue: "plain work coat",
    color: "#60706f",
    accent: "#d7e4df",
    shape: "bust",
  };
}

export function contractIdentityFor(contract: Contract): IdentityArtSpec {
  if (contract.chain?.giver) return giverIdentityArt[contract.chain.giver] ?? giverFallback(contract.chain.giver, contract.factionId);
  return factionIdentityFor(contract.factionId);
}

export function encounterIdentityFor(encounter: Encounter): IdentityArtSpec {
  if (encounter.kind === "inspection" && encounter.factionId) return factionIdentityFor(encounter.factionId);
  if (encounter.kind === "sea") {
    return {
      id: `encounter-${encounter.seaKind ?? "watch"}`,
      kind: "encounter",
      name: encounter.seaKind === "storm" ? "Storm Watch" : "Sea Watch",
      initials: encounter.seaKind === "storm" ? "SW" : "HW",
      role: encounter.seaKind === "storm" ? "Storm line" : "Hard-water watch",
      cue: encounter.seaKind === "storm" ? "storm glass and reefed canvas" : "wet rail and watch bell",
      color: encounter.seaKind === "storm" ? "#58767d" : "#367c9a",
      accent: "#93d4dc",
      shape: "watch",
    } satisfies IdentityArtSpec;
  }
  return {
    id: "encounter-pirate",
    kind: "encounter",
    name: "Pirate Sloop",
    initials: "PS",
    role: "Approach threat",
    cue: "dark sail and paid-off brass",
    color: "#8e4b43",
    accent: "#ffb7a8",
    shape: "watch",
  };
}

export function allIdentityArtSpecs(): IdentityArtSpec[] {
  return [
    captainIdentityArt,
    ...factions.map((faction) => factionIdentityFor(faction.id)),
    ...crewCatalog.map((crew) => crewIdentityArtFor(crew.id)),
    ...contractChainTemplates.map((template) => giverIdentityArt[template.giver] ?? giverFallback(template.giver, template.stages[0]?.factionId ?? "")),
  ];
}

function giverFallback(giver: string, factionId: string): IdentityArtSpec {
  const faction = factionIdentityFor(factionId);
  return {
    id: `giver-${giver.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown"}`,
    kind: "giver",
    name: giver,
    initials: initialsFor(giver),
    role: "Contract giver",
    cue: faction.cue,
    color: faction.color,
    accent: faction.accent,
    shape: "writ",
  };
}

function initialsFor(name: string) {
  const letters = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase();
  return letters || "ID";
}
