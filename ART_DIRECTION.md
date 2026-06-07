# Harborline Art Direction Bible

Date: 2026-06-05

## Core Look

Harborline should feel like a premium maritime strategy board brought to life:
minimalist isometric ships and port islands over a realistic, moving ocean.
The game should read as sophisticated, tactical, and tactile, not cute, noisy,
or fantasy-pirate.

The key contrast is deliberate:

- Water: realistic, dimensional, moving, teal-gray, physically believable.
- Assets: stylized, isometric, crisp, collectible, readable at small map scale.
- UI: dense, calm, operational, designed for repeated route and trade decisions.

## Camera

- Asset camera: isometric three-quarter top-down.
- Map camera: clean strategy-map angle, consistent with the current Pixi map.
- Ships should show deck, sails, cargo silhouette, and hull identity.
- Ports should show island footprint, dock orientation, and one dominant landmark.
- Avoid side-on profile ships, straight top-down icons, dramatic cinematic
  closeups, and perspective angles that cannot sit on the route map.

## Palette

Use a muted maritime palette with enough warmth for trade goods and sails.

- Ocean base: teal-gray, blue-green, dark cyan, soft foam white.
- Hulls: ink black, weathered charcoal, dark brown-black, oxidized metal.
- Sails: warm cream, aged canvas, pale flax.
- Accents: brass lanterns, banker blue, dockworker ochre, freeport green,
  admiralty red, orchid violet.
- Ports: each has one primary accent, but no island should become a one-color
  blob.

Avoid:

- Oversaturated turquoise water.
- Plastic toy highlights.
- Fantasy parchment map browns.
- Heavy purple-blue gradient mood lighting.
- Beige-only asset sheets.
- Neon colors except chroma-key backgrounds for processing.

## Sprite Scale

Current clean sprite dimensions are intentionally larger than map display size
so the renderer can scale down crisply:

- Ships: source sprites around 450-700 px wide and 590-650 px tall.
- Ports: source sprites around 600-980 px wide and 430-680 px tall.
- Ocean backgrounds and concept frames: 1376 x 768, 16:9.
- Ship previews: 360 x 240.

Map display targets:

- Ships should remain readable at 44-72 px tall on the route map.
- Ports should remain readable at 70-120 px wide on the route map.
- Important silhouettes must survive a 25% thumbnail test.
- Transparent PNG edges must be clean against both pale UI panels and dark water.

## Ship Language

Every ship needs a gameplay silhouette:

- Coastal Sloop: compact, nimble, narrow, starter craft, one cream sail, visible
  crates, brass stern lantern.
- Ledger Brig: balanced mid-game trader, two cream sails, reliable hull, banker
  blue pennant, strapped cargo deck.
- Clipper Kite: fast route hunter, long narrow hull, tall angled sails, sharp
  forward-motion silhouette, minimal visible cargo.
- Harbor Cutter: compact customs and patrol hull, two fore-and-aft cream sails,
  small boarding deck, tiny chase guns, admiralty red pennant, little cargo.
- Iron Barge: broad heavy cargo ship, reinforced hull, squat sails, visible
  cannon ports, sturdy rectangular mass.
- League Carrier: heavy cargo freighter, wide triple-hatch hold, high-sided
  hull, low cream lug sails, deck packed with tied bales, light defensive
  stern cannon, dockworker ochre and league green accents.

Rules:

- Hull shape should communicate stats before the player reads numbers.
- Cargo capacity should be visible through deck clutter and hull breadth.
- Speed should be visible through sail angle, hull length, and negative space.
- Cannons should be tiny but readable, not pirate cosplay.
- Do not add skulls, flags with text, huge weapons, or fantasy ornament.

## Port And Island Language

Each port must have a landmark, a trade identity, and a faction cue:

- Grayhaven: fog bank, counting house, lighthouse, pale docks, serious finance.
- Saffron Quay: spice awnings, terracotta roofs, baskets, warm market edge.
- Glassport: angular glass warehouses, cool blue crates, precise docks.
- Stormhook: rock fort, cannon battery, dark stone, compact storm motif.
- Orchid Roads: refined pavilion, orchid grove, subtle violet detail.
- Lowmarket: cargo scales, low warehouses, stacked crates, work lamps.

Rules:

- Island footprints should be distinct even as silhouettes.
- Docks must face water clearly so routes feel connected.
- Each port should have 2-4 readable elements, not a miniature city.
- Keep island edges clean; no large soft shadows baked into transparent sprites.

## Character Style

Characters should be used where they add personality: captains, crew, customs,
contract givers, faction representatives, and encounter portraits.

Direction:

- Cropped bust or token portrait, not full-body illustration.
- Stylized realism, restrained expression, maritime trade wardrobe.
- One strong silhouette cue per role: ledger, spyglass, oilskin coat, dock hook,
  admiralty sash, broker gloves.
- Backgrounds should be transparent or simple flat color for UI integration.

Avoid:

- Anime exaggeration.
- Cute mascot faces.
- Hyperreal photographs.
- Busy tavern scenes.
- Text labels inside the art.

## Calibration Lock

The executable art-direction contract lives in `src/game/artDirection.ts`.
Future generated assets, hand-made replacements, ocean work, and UI identity
tokens should use that profile as the source of truth, with this document as
the long-form rationale.

Approved reference set:

- `assets/concepts/02-boat-and-port-assets.jpg`: minimalist isometric ships,
  compact ports, and readable island silhouettes.
- `assets/concepts/03-realistic-ocean-with-minimal-islands.jpg`: realistic
  teal-gray water, soft wave realism, and restrained islands.
- `assets/concepts/01-isometric-ocean-map.jpg`: camera, open route space, and
  premium board-game map composition.
- `assets/concepts/04-identity-token-style.svg`: readable captain, faction,
  crew, contract giver, and encounter token direction for dense panels.

Generation prompts should start from `generationBriefFor(<family>)`, append the
asset-specific role brief, and append `negativePromptText()` as the rejection
clause. QA should use `artDirectionChecklistFor(<family>)` before any asset is
accepted into the production catalog.

## Ocean Integration

Production water should follow `OCEAN_ARCHITECTURE.md`:

- Pixi-first shader/mesh water.
- Shared `OceanField` data from `src/game/ocean.ts`.
- Shader water must visually communicate swell, current, roughness, storm
  intensity, foam, and route risk.
- Ship bob, roll, wake, and drift should be sampled from the same field.

Art assets over realistic water need:

- Slightly stronger silhouette outlines than concept art.
- No baked water, waves, or foam around ships unless it is a separate wake
  layer.
- No baked cast shadows on chroma-key sprites.
- A consistent downward contact anchor so ports and ships sit naturally on the
  map.

## Generated Asset Pipeline

Current scripts:

- `scripts/generate_gemini_concepts.mjs`: concept frames.
- `scripts/generate_gemini_assets.mjs`: ocean and port/boat raw assets.
- `scripts/generate_gemini_ship_assets.mjs`: raw ship generation, chroma-key
  removal, clean sprite output, and previews.
- `scripts/asset_pipeline.mjs`: local sync/verify/catalog gate for generated
  assets.

NPM commands:

- `npm run assets:generate:concepts`: generate concept frames.
- `npm run assets:generate:ports`: generate ocean/port/fallback raw assets and
  run the sync gate.
- `npm run assets:generate:ships`: generate ship raw assets, clean sprites,
  previews, and run the sync gate.
- `npm run assets:sync`: background-remove any raw chroma-key assets missing
  clean sprites, create previews, mirror generated assets into `public`, and
  write the catalog.
- `npm run assets:verify`: validate catalog coverage, dimensions, transparent
  PNG sprite outputs, preview bounds, public mirrors, production metadata,
  style-family mapping, approved style examples, QA gate coverage, rejection
  rules, prompt references, and background-removal processing refs.

Current path contract:

- Raw generations: `assets/generated/raw/<slug>.jpg`
- Transparent sprites: `assets/generated/sprites/<slug>-clean.png`
- Previews: `assets/generated/previews/<slug>-preview.png`
- Backgrounds: `assets/generated/backgrounds/ocean-map.jpg`
- Public mirrors: `public/assets/generated/...`
- Catalog: `assets/generated/asset-catalog.json`
- Runtime manifest: `src/game/assets.ts`

Chroma-key rules:

- Use flat `#ff00ff` only as the background.
- No shadows, gradients, water, floor plane, reflections, or texture in the
  chroma background.
- Do not allow magenta inside the subject.
- Keep generous padding and crisp edges.

## Prompt Template - Ship Sprite

```text
Create a single isolated game sprite on a perfectly flat solid #ff00ff
chroma-key background. The background must be one uniform color with no shadows,
gradients, texture, floor plane, reflections, horizon, or lighting variation.
Keep the subject fully separated from the background with crisp edges and
generous padding. Do not use #ff00ff anywhere in the subject. No cast shadow,
no contact shadow, no watermark, no text, no labels.

Camera: isometric three-quarter top-down, consistent with a premium tabletop
strategy game.

Style: unique minimalist isometric asset, refined geometry, muted maritime
palette, crisp silhouette, readable at small game-map scale, realistic material
hints, not cartoonish, not plastic.

Subject: [SHIP NAME], [gameplay role]. Include [2-4 silhouette details tied to
stats]. It should read as [speed/cargo/open-water/cannons identity].
```

## Prompt Template - Port Sprite

```text
Create a single isolated game sprite on a perfectly flat solid #ff00ff
chroma-key background. The background must be one uniform color with no shadows,
gradients, texture, floor plane, reflections, horizon, or lighting variation.
Keep the subject fully separated from the background with crisp edges and
generous padding. Do not use #ff00ff anywhere in the subject. No cast shadow,
no contact shadow, no watermark, no text, no labels.

Camera: isometric three-quarter top-down.

Style: minimalist isometric island port asset over realistic future water,
refined geometry, readable silhouette, muted maritime palette, premium strategy
game look.

Subject: [PORT NAME], [trade/faction identity]. Include [landmark], [dock
shape], [trade goods cue], and [faction/weather cue]. Keep it compact and
readable, not a miniature city.
```

## Prompt Template - Ocean Background

```text
Create a 16:9 empty ocean background for Harborline, a premium desktop merchant
trading game.

Scene: realistic teal-gray ocean seen from a clean isometric strategy-map
camera angle, soft daylight, subtle wave texture, natural ripples, tiny foam
traces, and gentle shallow-water hints around future island positions.

Composition: clear open water across the center for route lines, sprites, and
UI overlays. No ships, no islands, no labels, no text, no watermark.

Avoid: fantasy parchment map, satellite photo, stormy drama, heavy blur,
painterly chaos, oversaturated turquoise.
```

## Asset QA Checklist

Before importing any generated asset:

- Is the camera angle consistent with existing ships and ports?
- Does the silhouette read at 25% preview size?
- Does the asset have transparent or cleanly removable background edges?
- Does it avoid baked water and contact shadows?
- Does it communicate a gameplay identity?
- Does it fit the muted maritime palette?
- Does it avoid text, labels, watermarks, skulls, and fantasy clutter?
- Does the file path match `src/game/assets.ts`?
- Does the map still render with no fresh console errors after import?
- Does `npm run assets:verify` pass?

## Current Style References

- Ocean/map blend: `assets/concepts/01-isometric-ocean-map.jpg` and
  `assets/concepts/03-realistic-ocean-with-minimal-islands.jpg`.
- Ship and port/island assets: `assets/concepts/02-boat-and-port-assets.jpg`
  plus the generated ship and port previews in `assets/generated/previews`.
- Runtime background reference: `assets/generated/backgrounds/ocean-map.jpg`.
- Ship production candidates: `ship-coastal-sloop`, `ship-ledger-brig`,
  `ship-clipper-kite`, `ship-harbor-cutter`, `ship-iron-barge`, and
  `ship-league-carrier` clean sprites.
- Port production candidates: `port-grayhaven`, `port-saffron`,
  `port-glassport`, `port-stormhook`, `port-orchid`, and `port-lowmarket`
  clean sprites.
- Character/faction presentation: `src/game/identityArt.ts` defines compact
  token identities for the captain, crew, factions, contract givers, customs,
  sea watch, and pirate encounters until generated portraits are worth adding.

## Current Gaps

- Production water is still pending; current visual water is temporary.
- Generated assets now have a local catalog/verify gate and public mirror sync.
- Generated bitmap character portraits are not generated yet; current
  vertical-slice presentation uses compact identity tokens.
- Equipment icons are not generated yet.
- Dedicated storm and UI ornament references are not generated yet.
- Future ship classes should be generated only after their gameplay role is
  defined in the ship catalog.
