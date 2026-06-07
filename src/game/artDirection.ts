export type ArtDirectionFamily = "ships" | "ports" | "islands" | "ocean" | "identity_tokens" | "map" | "ui";

export type ApprovedStyleExample = {
  id: string;
  name: string;
  sourcePath: string;
  families: readonly ArtDirectionFamily[];
  approval: "approved_direction" | "current_contract";
  notes: string;
};

export type NegativeStyleRule = {
  id: string;
  reject: string;
  reason: string;
};

export type GenerationBrief = {
  family: ArtDirectionFamily;
  camera: string;
  background: string;
  style: string;
  subject: readonly string[];
  avoid: readonly string[];
};

export type QualityGate = {
  id: string;
  families: readonly ArtDirectionFamily[];
  criteria: readonly string[];
};

export type ArtDirectionProfile = {
  styleVersion: string;
  artBiblePath: string;
  requiredFamilies: readonly ArtDirectionFamily[];
  pillars: readonly string[];
  approvedExamples: readonly ApprovedStyleExample[];
  negativeRules: readonly NegativeStyleRule[];
  generationBriefs: Record<ArtDirectionFamily, GenerationBrief>;
  qualityGates: readonly QualityGate[];
};

export const requiredArtDirectionFamilies = ["ships", "ports", "islands", "ocean", "identity_tokens"] as const;

export const artDirectionProfile = {
  styleVersion: "harborline-art-v1",
  artBiblePath: "ART_DIRECTION.md",
  requiredFamilies: requiredArtDirectionFamilies,
  pillars: [
    "Realistic teal-gray ocean motion supplies the physical world.",
    "Minimalist isometric ships and ports read as collectible strategy pieces.",
    "Every asset communicates a gameplay job before the player reads numbers.",
    "Identity tokens stay restrained, maritime, and legible in dense UI.",
    "The interface stays operational and decision-forward, not decorative.",
  ],
  approvedExamples: [
    {
      id: "isometric-ship-port-sheet",
      name: "Minimal isometric boat and port asset sheet",
      sourcePath: "assets/concepts/02-boat-and-port-assets.jpg",
      families: ["ships", "ports", "islands"],
      approval: "approved_direction",
      notes: "Reference for crisp isometric silhouettes, compact ports, and muted maritime material hints.",
    },
    {
      id: "realistic-teal-ocean",
      name: "Realistic teal-gray ocean with minimal islands",
      sourcePath: "assets/concepts/03-realistic-ocean-with-minimal-islands.jpg",
      families: ["ocean", "islands", "map"],
      approval: "approved_direction",
      notes: "Reference for believable water color, soft wave texture, and restrained island presence.",
    },
    {
      id: "isometric-map-composition",
      name: "Playable isometric ocean map composition",
      sourcePath: "assets/concepts/01-isometric-ocean-map.jpg",
      families: ["map", "ocean", "ports", "islands"],
      approval: "approved_direction",
      notes: "Reference for open route space, camera angle, and the premium board-game map read.",
    },
    {
      id: "identity-token-style-sheet",
      name: "Readable maritime identity token sheet",
      sourcePath: "assets/concepts/04-identity-token-style.svg",
      families: ["identity_tokens", "ui"],
      approval: "current_contract",
      notes: "Reference for captain, faction, crew, giver, and encounter tokens that stay useful in panels.",
    },
  ],
  negativeRules: [
    {
      id: "no-fantasy-parchment",
      reject: "generic AI fantasy map looks, parchment UI, old-map browns, and tavern-poster treatment",
      reason: "Harborline should feel like a premium strategy surface, not a pirate theme package.",
    },
    {
      id: "no-toy-color",
      reject: "toy colors, plastic highlights, oversaturated turquoise water, neon accents except chroma key",
      reason: "The palette needs maritime restraint so risk, routes, and cargo decisions remain readable.",
    },
    {
      id: "no-pirate-cosplay",
      reject: "skull flags, huge weapons, fantasy ornament, mascot faces, and cartoon pirate clutter",
      reason: "Threats and factions should read as trade politics and practical danger.",
    },
    {
      id: "no-baked-integration",
      reject: "baked water, baked foam, cast shadow, contact shadow, floor plane, or reflection on isolated sprites",
      reason: "Ships and ports must sit on the live ocean shader and wake system without visual seams.",
    },
    {
      id: "no-text-artifacts",
      reject: "text labels, watermarks, logos, decorative callouts, unreadable micro-detail, and noisy clutter",
      reason: "Artwork should support fast decisions instead of competing with the UI.",
    },
    {
      id: "no-one-note-ui",
      reject: "decoration that slows decisions, heavy purple-blue gradients, beige-only sheets, and single-hue mood palettes",
      reason: "The desktop UI needs calm density, clear hierarchy, and enough color contrast to scan quickly.",
    },
  ],
  generationBriefs: {
    ships: {
      family: "ships",
      camera: "isometric three-quarter top-down with deck, sails, hull, cargo, and stern anchor visible",
      background: "perfectly flat #ff00ff chroma-key field or transparent PNG, no floor and no shadow",
      style: "unique minimalist isometric maritime strategy sprite with crisp silhouette and muted material hints",
      subject: [
        "cargo capacity shown through hull breadth and deck load",
        "speed shown through sail angle, hull length, and negative space",
        "cannons are tiny practical marks, never pirate cosplay",
        "readable at 44-72 px tall on the route map",
      ],
      avoid: ["skulls", "text flags", "baked water", "contact shadow", "plastic shine", "side-on profile"],
    },
    ports: {
      family: "ports",
      camera: "isometric three-quarter top-down with clear water-facing dock orientation",
      background: "perfectly flat #ff00ff chroma-key field or transparent PNG, no water or cast shadow",
      style: "compact minimalist isometric island port with one strong landmark and one faction color cue",
      subject: [
        "distinct island footprint and dock shape",
        "2-4 readable trade details instead of a miniature city",
        "one landmark tied to the port identity",
        "readable at 70-120 px wide on the route map",
      ],
      avoid: ["generic fantasy city", "parchment map trim", "noisy buildings", "large soft shadow", "text labels"],
    },
    islands: {
      family: "islands",
      camera: "same strategy-map isometric angle as ports and the ocean background",
      background: "transparent or cleanly removable edge with no baked water halo",
      style: "minimal island footprints with restrained geography and one memorable silhouette hook",
      subject: [
        "clear silhouette at thumbnail size",
        "shoreline shape that helps the player remember the port",
        "small landmark cue without clutter",
        "edge treatment that works over realistic teal-gray water",
      ],
      avoid: ["miniature city sprawl", "floating sticker shadows", "saturated sand", "fantasy ruins", "busy trees"],
    },
    ocean: {
      family: "ocean",
      camera: "clean strategy-map angle that leaves open center water for route lines and sprites",
      background: "16:9 realistic teal-gray ocean layer, later replaced by Pixi shader and OceanField physics",
      style: "physically believable water with subtle swell, current texture, soft foam, and route-risk readability",
      subject: [
        "teal-gray and blue-green water, not oversaturated turquoise",
        "dimensional wave motion that can drive ship bob, roll, wake, and drift",
        "roughness, storm intensity, foam, and current should share the OceanField simulation contract",
        "no islands, ships, labels, or UI baked into the base water layer",
      ],
      avoid: ["satellite photo", "painterly chaos", "storm drama everywhere", "blurred stock ocean", "fantasy map water"],
    },
    identity_tokens: {
      family: "identity_tokens",
      camera: "cropped bust, seal, writ, or watch-token composition designed for UI panels",
      background: "transparent or simple flat color with no tavern scene and no photographic backdrop",
      style: "stylized realism with restrained maritime wardrobe, strong role cue, and readable initials when needed",
      subject: [
        "captain token uses route slate, brass pin, and storm glass",
        "crew tokens show one tool or wardrobe cue such as spyglass, gloves, oilskin, or powder key",
        "faction tokens use seal geometry and the faction palette",
        "contract giver tokens use restrained bust or writ treatment",
        "encounter tokens use practical sea-watch or threat marks",
      ],
      avoid: ["anime exaggeration", "cute mascot face", "hyperreal photo", "busy tavern", "text labels beyond initials"],
    },
    map: {
      family: "map",
      camera: "consistent isometric board angle with ports, ships, routes, wind, and ocean all sharing one space",
      background: "realistic water foundation with unframed overlays and clear open route lanes",
      style: "premium desktop strategy map with calm density and strong scan hierarchy",
      subject: [
        "route lines remain legible over the water",
        "ship and port anchors feel physically connected",
        "weather and current marks support decisions without becoming decoration",
        "first read is trade opportunity, second read is route risk",
      ],
      avoid: ["decorative compass clutter", "fantasy-map border", "single-hue gradient", "tiny unreadable icons"],
    },
    ui: {
      family: "ui",
      camera: "flat desktop product surface around the map, not illustrative page furniture",
      background: "restrained panels and unframed work areas with the ocean as the main visual field",
      style: "dense, calm, operational interface for repeated trade, route, contract, and upgrade decisions",
      subject: [
        "controls and cards expose actionable state before flavor",
        "tokens add recognition without slowing scan speed",
        "color is used for faction, risk, value, and state",
        "decorative elements never compete with route choices",
      ],
      avoid: ["landing-page hero layout", "nested cards", "ornamental blobs", "parchment chrome", "oversized prose"],
    },
  },
  qualityGates: [
    {
      id: "thumbnail-read",
      families: ["ships", "ports", "islands", "identity_tokens"],
      criteria: [
        "Silhouette survives a 25% thumbnail test.",
        "Primary role is recognizable before labels or stat text.",
        "Edges stay clean against pale panels and dark ocean water.",
      ],
    },
    {
      id: "ocean-integration",
      families: ["ships", "ports", "islands", "ocean", "map"],
      criteria: [
        "No baked water, foam, floor plane, reflection, or contact shadow on isolated assets.",
        "Anchor point is consistent with the Pixi map and route/wake layer.",
        "Water roughness, current, foam, and storm cues can be traced to the OceanField contract.",
      ],
    },
    {
      id: "gameplay-silhouette",
      families: ["ships", "ports", "islands", "identity_tokens"],
      criteria: [
        "The asset has one dominant gameplay identity and at most a few secondary details.",
        "Faction and role cues are visible without noisy decorative clutter.",
        "The palette stays muted maritime with controlled warm accents.",
      ],
    },
    {
      id: "generation-hygiene",
      families: ["ships", "ports", "islands", "identity_tokens", "ocean"],
      criteria: [
        "Generated outputs avoid text, labels, logos, and watermarks.",
        "Chroma-key outputs use a flat #ff00ff background with no magenta inside the subject.",
        "Prompt references, source files, clean outputs, previews, and metadata stay cataloged.",
      ],
    },
    {
      id: "ui-speed",
      families: ["identity_tokens", "ui", "map"],
      criteria: [
        "Visual detail supports faster decisions rather than decorative reading.",
        "State, risk, value, and faction recognition stay clear at desktop and mobile-like widths.",
        "No parchment, fantasy frame, or single-hue mood treatment dominates the play surface.",
      ],
    },
  ],
} as const satisfies ArtDirectionProfile;

export function approvedExamplesFor(family: ArtDirectionFamily) {
  return artDirectionProfile.approvedExamples.filter((example) => hasFamily(example.families, family));
}

export function generationBriefFor(family: ArtDirectionFamily) {
  return artDirectionProfile.generationBriefs[family];
}

export function negativePromptText() {
  return artDirectionProfile.negativeRules.map((rule) => rule.reject).join("; ");
}

export function artDirectionChecklistFor(family: ArtDirectionFamily) {
  return artDirectionProfile.qualityGates
    .filter((gate) => hasFamily(gate.families, family))
    .flatMap((gate) => gate.criteria);
}

export function missingArtDirectionCoverage(families: readonly ArtDirectionFamily[] = artDirectionProfile.requiredFamilies) {
  return families.filter((family) => approvedExamplesFor(family).length === 0 || artDirectionChecklistFor(family).length === 0);
}

function hasFamily(families: readonly ArtDirectionFamily[], family: ArtDirectionFamily) {
  return families.includes(family);
}
