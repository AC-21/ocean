import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import productionMetadata from "../../assets/generated/asset-production.json";
import {
  type ArtDirectionFamily,
  approvedExamplesFor,
  artDirectionChecklistFor,
  artDirectionProfile,
  generationBriefFor,
  missingArtDirectionCoverage,
  negativePromptText,
  requiredArtDirectionFamilies,
} from "./artDirection";
import { allIdentityArtSpecs } from "./identityArt";

type ProductionAssetMetadata = {
  artFamily: string;
  approvedExampleIds: string[];
  qaGateIds: string[];
  promptRef: string;
  processing: string;
  backgroundRemovalRef?: string;
};

describe("art direction profile", () => {
  it("stays locked to the generated asset catalog style version", () => {
    expect(artDirectionProfile.styleVersion).toBe(productionMetadata.styleVersion);
    expect(artDirectionProfile.artBiblePath).toBe("ART_DIRECTION.md");
  });

  it("has approved examples, prompt briefs, and checklists for every required visual family", () => {
    expect(missingArtDirectionCoverage()).toEqual([]);

    for (const family of requiredArtDirectionFamilies) {
      expect(approvedExamplesFor(family).length, family).toBeGreaterThan(0);
      expect(generationBriefFor(family).subject.length, family).toBeGreaterThanOrEqual(3);
      expect(artDirectionChecklistFor(family).length, family).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps approved reference files available in the workspace", () => {
    for (const example of artDirectionProfile.approvedExamples) {
      expect(existsSync(resolve(process.cwd(), example.sourcePath)), example.sourcePath).toBe(true);
    }
  });

  it("rejects the visual directions that would make Harborline feel generic", () => {
    const rejectionText = `${negativePromptText()} ${artDirectionProfile.negativeRules
      .map((rule) => rule.reason)
      .join(" ")}`.toLowerCase();

    for (const term of ["parchment", "fantasy", "toy", "turquoise", "skull", "shadow", "text", "clutter", "purple-blue"]) {
      expect(rejectionText).toContain(term);
    }
  });

  it("turns the preferred style into generation-ready prompt constraints", () => {
    const ships = generationBriefFor("ships");
    const ports = generationBriefFor("ports");
    const ocean = generationBriefFor("ocean");
    const tokens = generationBriefFor("identity_tokens");

    expect(`${ships.camera} ${ships.background} ${ships.style}`.toLowerCase()).toContain("isometric");
    expect(ships.background).toContain("#ff00ff");
    expect(ports.subject.join(" ").toLowerCase()).toContain("landmark");
    expect(ocean.background.toLowerCase()).toContain("teal-gray");
    expect(ocean.subject.join(" ").toLowerCase()).toContain("oceanfield");
    expect(tokens.style.toLowerCase()).toContain("maritime");
  });

  it("covers the existing identity-token kinds before character art production", () => {
    const tokenText = generationBriefFor("identity_tokens").subject.join(" ").toLowerCase();
    const implementedKinds = new Set(allIdentityArtSpecs().map((spec) => spec.kind));

    for (const kind of implementedKinds) {
      expect(tokenText).toContain(kind);
    }
    expect(tokenText).toContain("encounter");
  });

  it("keeps production asset metadata attached to the approved style contract", () => {
    expect(productionMetadata.styleContract.profile).toBe("src/game/artDirection.ts");
    expect(productionMetadata.styleContract.artBible).toBe(artDirectionProfile.artBiblePath);
    expect(productionMetadata.styleContract.negativeRuleIds).toEqual(artDirectionProfile.negativeRules.map((rule) => rule.id));

    for (const [assetKey, rawMetadata] of Object.entries(productionMetadata.assets)) {
      const metadata = rawMetadata as ProductionAssetMetadata;
      const [kind, id] = assetKey.split(":");
      const family = metadata.artFamily as ArtDirectionFamily;
      expect(family, assetKey).toBe(expectedFamilyForKind(kind));

      const approvedExampleIds = approvedExamplesFor(family).map((example) => example.id);
      expect(metadata.approvedExampleIds.length, assetKey).toBeGreaterThan(0);
      for (const exampleId of metadata.approvedExampleIds) {
        expect(approvedExampleIds, assetKey).toContain(exampleId);
      }

      const requiredGateIds = artDirectionProfile.qualityGates.filter((gate) => hasFamily(gate.families, family)).map((gate) => gate.id);
      for (const gateId of requiredGateIds) {
        expect(metadata.qaGateIds, assetKey).toContain(gateId);
      }

      expect(metadata.promptRef, assetKey).toContain(slugFor(kind, id));
      if (kind === "background") {
        expect(metadata.processing).toBe("background_jpeg_no_alpha");
      } else {
        expect(metadata.processing).toBe("chroma_key_to_transparent_png");
        expect(metadata.backgroundRemovalRef).toBe("scripts/asset_pipeline.mjs:createCleanSprite");
      }
    }
  });
});

function expectedFamilyForKind(kind: string): ArtDirectionFamily {
  if (kind === "background") return "ocean";
  if (kind === "fallback_ship" || kind === "ship") return "ships";
  if (kind === "port") return "ports";
  throw new Error(`Unexpected asset kind ${kind}`);
}

function slugFor(kind: string, id: string) {
  if (kind === "ship") return `ship-${id.replaceAll("_", "-")}`;
  if (kind === "port") return `port-${id.replaceAll("_", "-")}`;
  return id;
}

function hasFamily(families: readonly ArtDirectionFamily[], family: ArtDirectionFamily) {
  return families.includes(family);
}
