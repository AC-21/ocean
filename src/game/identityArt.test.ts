import { describe, expect, it } from "vitest";
import { contractChainTemplates } from "./contracts";
import { crewCatalog, factions } from "./data";
import {
  allIdentityArtSpecs,
  captainIdentityFor,
  contractIdentityFor,
  crewIdentityArtFor,
  factionIdentityFor,
  giverIdentityArt,
} from "./identityArt";
import type { Contract } from "./types";

describe("identity art specs", () => {
  it("covers every faction, crew role, contract giver, and the player captain", () => {
    expect(captainIdentityFor().id).toBe("captain-harborline");

    for (const faction of factions) {
      expect(factionIdentityFor(faction.id).name).toBe(faction.name);
    }

    for (const crew of crewCatalog) {
      expect(crewIdentityArtFor(crew.id).name).toBe(crew.name);
    }

    for (const template of contractChainTemplates) {
      expect(giverIdentityArt[template.giver]?.name).toBe(template.giver);
    }
  });

  it("keeps token specs readable and asset-ready", () => {
    const specs = allIdentityArtSpecs();
    expect(specs.length).toBeGreaterThanOrEqual(1 + factions.length + crewCatalog.length + contractChainTemplates.length);
    expect(new Set(specs.map((spec) => spec.id)).size).toBe(specs.length);

    for (const spec of specs) {
      expect(spec.initials).toMatch(/^[A-Z?]{2,3}$/);
      expect(spec.name.length).toBeGreaterThan(2);
      expect(spec.role.length).toBeGreaterThan(5);
      expect(spec.cue.length).toBeGreaterThan(8);
      expect(spec.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(spec.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("resolves contract presentation to named givers before faction fallback", () => {
    const chainContract: Contract = {
      id: "chain",
      originPortId: "grayhaven",
      destinationPortId: "glassport",
      factionId: "charter",
      goodId: "tea",
      units: 2,
      deadline: 12,
      reward: 300,
      penalty: 80,
      status: "available",
      chain: {
        id: "charter_audit",
        giver: "Maribel Quill",
        title: "Ledger Audit",
        stage: 1,
        stages: 3,
        hook: "Audit packet.",
        successText: "Done.",
        failureText: "Late.",
      },
    };
    const ordinaryContract: Contract = {
      ...chainContract,
      id: "ordinary",
      chain: undefined,
    };

    expect(contractIdentityFor(chainContract).id).toBe("giver-maribel-quill");
    expect(contractIdentityFor(ordinaryContract).id).toBe("faction-charter");
  });
});
