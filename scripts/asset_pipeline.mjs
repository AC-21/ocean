import { access, copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import ts from "typescript";

const run = promisify(execFile);
const mode = process.argv[2] ?? "verify";
const root = process.cwd();
const generatedDir = path.resolve(root, "assets/generated");
const publicGeneratedDir = path.resolve(root, "public/assets/generated");
const catalogPath = path.resolve(generatedDir, "asset-catalog.json");
const productionMetadataPath = path.resolve(generatedDir, "asset-production.json");
const artDirectionProfilePath = path.resolve(root, "src/game/artDirection.ts");
const magick = "/opt/homebrew/bin/magick";

if (!["sync", "verify", "catalog"].includes(mode)) {
  throw new Error(`Unknown asset pipeline mode: ${mode}. Use sync, verify, or catalog.`);
}

const dataSource = await readFile(path.resolve(root, "src/game/data.ts"), "utf8");
const assetSource = await readFile(path.resolve(root, "src/game/assets.ts"), "utf8");
const spec = parseGameAssetSpec(dataSource, assetSource);
const artDirectionContract = await readArtDirectionContract(artDirectionProfilePath);
const productionMetadata = await readProductionMetadata(productionMetadataPath, artDirectionContract);

if (mode === "sync") {
  await ensureGeneratedPreviews(spec);
  await copyTree(generatedDir, publicGeneratedDir);
}

const catalog = await buildCatalog(spec, productionMetadata, artDirectionContract);
await validateCatalog(catalog, { requirePublicMirror: true, artDirectionContract });

if (mode === "sync" || mode === "catalog") {
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

if (mode === "sync") {
  await copyTree(generatedDir, publicGeneratedDir);
}

console.log(
  `Asset pipeline ${mode} passed: ${catalog.assets.filter((asset) => asset.kind === "ship").length} ships, ` +
    `${catalog.assets.filter((asset) => asset.kind === "port").length} ports, ${catalog.assets.length} total entries.`
);

function parseGameAssetSpec(data, assets) {
  const shipsBlock = blockBetween(data, "export const shipCatalog", "export const equipmentCatalog");
  const portsBlock = blockBetween(data, "export const ports", "export const goods");
  const assetShipsBlock = blockBetween(assets, "ships:", "ports:");
  const assetPortsBlock = blockBetween(assets, "ports:", "};");
  const shipAssetMap = parseAssetMap(assetShipsBlock);
  const portAssetMap = parseAssetMap(assetPortsBlock);

  const ships = parseDataEntries(shipsBlock, "ships");
  const ports = parseDataEntries(portsBlock, "ports");

  for (const ship of ships) {
    if (ship.assetKey !== ship.id) throw new Error(`Ship ${ship.id} must use assetUrls.ships.${ship.id}.`);
    if (!shipAssetMap.has(ship.id)) throw new Error(`assetUrls.ships is missing ${ship.id}.`);
  }

  for (const port of ports) {
    if (port.assetKey !== port.id) throw new Error(`Port ${port.id} must use assetUrls.ports.${port.id}.`);
    if (!portAssetMap.has(port.id)) throw new Error(`assetUrls.ports is missing ${port.id}.`);
  }

  return {
    backgrounds: [{ id: "ocean-map", name: "Ocean Map", slug: "ocean-map" }],
    fallback: [{ id: "merchant-boat", name: "Merchant Boat", slug: "merchant-boat" }],
    ships: ships.map((ship) => ({ ...ship, slug: `ship-${toKebab(ship.id)}` })),
    ports: ports.map((port) => ({ ...port, slug: `port-${toKebab(port.id)}` })),
  };
}

function blockBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  if (start === -1) throw new Error(`Could not find ${startToken}.`);
  const end = source.indexOf(endToken, start + startToken.length);
  if (end === -1) throw new Error(`Could not find ${endToken} after ${startToken}.`);
  return source.slice(start, end);
}

function parseAssetMap(block) {
  return new Map([...block.matchAll(/([A-Za-z0-9_]+):\s*asset\("([^"]+)"\)/g)].map((match) => [match[1], match[2]]));
}

function parseDataEntries(block, label) {
  const entries = [];
  const objectMatches = block.matchAll(/\{\s+id:\s*"([^"]+)",[\s\S]*?name:\s*"([^"]+)",[\s\S]*?\n\s+\}/g);
  for (const match of objectMatches) {
    const objectText = match[0];
    const id = match[1];
    const name = match[2];
    const assetMatch = objectText.match(/asset:\s*assetUrls\.(ships|ports)\.([A-Za-z0-9_]+)/);
    entries.push({
      id,
      name,
      assetKey: assetMatch?.[2] ?? null,
    });
  }
  if (!entries.length) throw new Error(`Could not parse ${label} from data.ts.`);
  return entries;
}

async function ensureGeneratedPreviews(spec) {
  await assertExecutable(magick, "ImageMagick is required for asset preview generation.");
  const previewJobs = [
    ...spec.fallback.map((asset) => previewJob(asset.slug)),
    ...spec.ships.map((asset) => previewJob(asset.slug)),
    ...spec.ports.map((asset) => previewJob(asset.slug)),
  ];

  for (const job of previewJobs) {
    await mkdir(path.dirname(job.previewPath), { recursive: true });
    if (!(await exists(job.cleanPath))) await createCleanSprite(job.slug);
    if (!(await exists(job.cleanPath))) throw new Error(`Cannot create preview; clean sprite is missing: ${relative(job.cleanPath)}`);
    await run(magick, [
      job.cleanPath,
      "-background",
      "#d7ebe7",
      "-alpha",
      "remove",
      "-alpha",
      "off",
      "-resize",
      "360x240",
      job.previewPath,
    ]);
  }
}

function previewJob(slug) {
  return {
    slug,
    rawPath: path.resolve(generatedDir, "raw", `${slug}.jpg`),
    spritePath: path.resolve(generatedDir, "sprites", `${slug}.png`),
    cleanPath: path.resolve(generatedDir, "sprites", `${slug}-clean.png`),
    previewPath: path.resolve(generatedDir, "previews", `${slug}-preview.png`),
  };
}

async function createCleanSprite(slug) {
  const job = previewJob(slug);
  if (!(await exists(job.rawPath))) throw new Error(`Cannot clean sprite; raw asset is missing: ${relative(job.rawPath)}`);
  await mkdir(path.dirname(job.spritePath), { recursive: true });
  await run(magick, [
    job.rawPath,
    "-alpha",
    "set",
    "-fuzz",
    "20%",
    "-transparent",
    "#ff00ff",
    "-trim",
    "+repage",
    job.spritePath,
  ]);
  await run(magick, [
    job.spritePath,
    "(",
    job.spritePath,
    "-alpha",
    "extract",
    "-morphology",
    "Erode",
    "Diamond:1",
    ")",
    "-compose",
    "CopyOpacity",
    "-composite",
    job.cleanPath,
  ]);
}

async function buildCatalog(spec, productionMetadata, artDirectionContract) {
  const assets = [];
  for (const background of spec.backgrounds) {
    assets.push(await catalogEntry("background", background, {
      raw: `raw/${background.slug}.jpg`,
      runtime: `backgrounds/${background.slug}.jpg`,
      publicRuntime: `public:backgrounds/${background.slug}.jpg`,
    }, productionMetadata, artDirectionContract));
  }

  for (const fallback of spec.fallback) {
    assets.push(await catalogEntry("fallback_ship", fallback, spriteFiles(fallback.slug), productionMetadata, artDirectionContract));
  }

  for (const ship of spec.ships) assets.push(await catalogEntry("ship", ship, spriteFiles(ship.slug), productionMetadata, artDirectionContract));
  for (const port of spec.ports) assets.push(await catalogEntry("port", port, spriteFiles(port.slug), productionMetadata, artDirectionContract));

  return {
    schemaVersion: 1,
    styleVersion: artDirectionContract.profile.styleVersion,
    source: {
      artDirection: "ART_DIRECTION.md",
      artDirectionProfile: artDirectionContract.profilePath,
      productionMetadata: "assets/generated/asset-production.json",
      runtimeManifest: "src/game/assets.ts",
      gameData: "src/game/data.ts",
    },
    styleContract: {
      profile: artDirectionContract.profilePath,
      artBible: artDirectionContract.profile.artBiblePath,
      negativeRuleIds: artDirectionContract.negativeRuleIds,
      requiredFamilies: artDirectionContract.profile.requiredFamilies,
    },
    counts: {
      backgrounds: spec.backgrounds.length,
      fallbackShips: spec.fallback.length,
      ships: spec.ships.length,
      ports: spec.ports.length,
      total: assets.length,
    },
    assets,
  };
}

function spriteFiles(slug) {
  return {
    raw: `raw/${slug}.jpg`,
    sprite: `sprites/${slug}.png`,
    clean: `sprites/${slug}-clean.png`,
    preview: `previews/${slug}-preview.png`,
    publicClean: `public:sprites/${slug}-clean.png`,
    publicPreview: `public:previews/${slug}-preview.png`,
  };
}

async function catalogEntry(kind, asset, files, productionMetadata, artDirectionContract) {
  const fileEntries = {};
  for (const [role, filePath] of Object.entries(files)) {
    const publicMirror = filePath.startsWith("public:");
    const relativePath = publicMirror ? filePath.slice("public:".length) : filePath;
    const absolutePath = path.resolve(publicMirror ? publicGeneratedDir : generatedDir, relativePath);
    fileEntries[role] = {
      path: relative(publicMirror ? path.relative(root, absolutePath) : path.join("assets/generated", relativePath)),
      exists: await exists(absolutePath),
      ...(await imageMetadataFor(absolutePath).catch(() => ({}))),
    };
  }

  return {
    kind,
    id: asset.id,
    name: asset.name,
    slug: asset.slug,
    production: productionMetadataFor(productionMetadata, kind, asset),
    style: styleCatalogFor(productionMetadataFor(productionMetadata, kind, asset), artDirectionContract),
    files: fileEntries,
  };
}

async function validateCatalog(catalog, { requirePublicMirror, artDirectionContract }) {
  const missing = [];
  const invalid = [];
  const cleanSpritesByHash = new Map();

  for (const asset of catalog.assets) {
    validateProductionMetadata(asset, invalid, artDirectionContract);

    for (const [role, file] of Object.entries(asset.files)) {
      if (!file.exists) missing.push(`${asset.kind}.${asset.id}:${role}:${file.path}`);
      if (file.exists && file.bytes <= 0) invalid.push(`${asset.kind}.${asset.id}:${role} is empty`);
      if ((role === "clean" || role === "sprite" || role === "publicClean") && file.format === "png" && !file.hasAlpha) {
        invalid.push(`${asset.kind}.${asset.id}:${role} must be a transparent PNG`);
      }
      if (role === "preview" && file.exists && (file.width > 360 || file.height > 240)) {
        invalid.push(`${asset.kind}.${asset.id}:preview must fit within 360x240`);
      }
      if (!requirePublicMirror && role.startsWith("public")) continue;
    }

    const clean = asset.files.clean;
    if (clean?.exists && clean.sha256) {
      const duplicate = cleanSpritesByHash.get(clean.sha256);
      if (duplicate) validateCleanSpriteDuplicate(duplicate, asset, invalid);
      cleanSpritesByHash.set(clean.sha256, asset);
    }
  }

  if (missing.length) throw new Error(`Missing generated assets:\n${missing.map((item) => `- ${item}`).join("\n")}`);
  if (invalid.length) throw new Error(`Invalid generated assets:\n${invalid.map((item) => `- ${item}`).join("\n")}`);
}

async function imageMetadataFor(filePath) {
  const buffer = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const base = { bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") };
  if (extension === ".png") return { ...base, format: "png", ...pngMetadata(buffer) };
  if (extension === ".jpg" || extension === ".jpeg") return { ...base, format: "jpeg", ...jpegMetadata(buffer) };
  return base;
}

async function readProductionMetadata(filePath, artDirectionContract) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read generated asset production metadata at ${relative(path.relative(root, filePath))}: ${error.message}`);
  }

  if (parsed.schemaVersion !== 1) {
    throw new Error("asset-production.json must use schemaVersion 1.");
  }
  if (!parsed.assets || typeof parsed.assets !== "object") {
    throw new Error("asset-production.json must contain an assets object.");
  }
  validateProductionStyleContract(parsed, artDirectionContract);
  return parsed;
}

async function readArtDirectionContract(filePath) {
  const source = await readFile(filePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  const artDirectionModule = await import(moduleUrl);
  const profile = artDirectionModule.artDirectionProfile;
  if (!profile?.styleVersion || !profile?.generationBriefs || !Array.isArray(profile.approvedExamples)) {
    throw new Error("src/game/artDirection.ts must export a complete artDirectionProfile.");
  }
  return {
    profile,
    profilePath: relative(path.relative(root, filePath)),
    families: new Set(Object.keys(profile.generationBriefs)),
    examplesById: new Map(profile.approvedExamples.map((example) => [example.id, example])),
    gatesById: new Map(profile.qualityGates.map((gate) => [gate.id, gate])),
    negativeRuleIds: profile.negativeRules.map((rule) => rule.id),
  };
}

function validateProductionStyleContract(productionMetadata, artDirectionContract) {
  const contract = productionMetadata.styleContract;
  if (!contract || typeof contract !== "object") {
    throw new Error("asset-production.json must include a styleContract object.");
  }
  if (productionMetadata.styleVersion !== artDirectionContract.profile.styleVersion) {
    throw new Error(
      `asset-production.json styleVersion ${productionMetadata.styleVersion} must match ${artDirectionContract.profile.styleVersion}.`
    );
  }
  if (contract.profile !== artDirectionContract.profilePath) {
    throw new Error(`asset-production.json styleContract.profile must be ${artDirectionContract.profilePath}.`);
  }
  if (contract.artBible !== artDirectionContract.profile.artBiblePath) {
    throw new Error(`asset-production.json styleContract.artBible must be ${artDirectionContract.profile.artBiblePath}.`);
  }
  assertSameSet(
    contract.negativeRuleIds,
    artDirectionContract.negativeRuleIds,
    "asset-production.json styleContract.negativeRuleIds must cover every art-direction rejection rule"
  );
}

function productionMetadataFor(productionMetadata, kind, asset) {
  const key = `${kind}:${asset.id}`;
  const metadata = productionMetadata.assets[key];
  if (!metadata) throw new Error(`asset-production.json is missing metadata for ${key}.`);
  return metadata;
}

function validateProductionMetadata(asset, invalid, artDirectionContract) {
  const metadata = asset.production;
  const allowedStatuses = new Set(["production_candidate", "provisional"]);
  const allowedSources = new Set(["gemini", "copied_placeholder", "handmade"]);
  const expectedFamily = expectedArtFamilyForKind(asset.kind);

  if (!allowedStatuses.has(metadata.status)) {
    invalid.push(`${asset.kind}.${asset.id}:production.status must be production_candidate or provisional`);
  }
  if (!allowedSources.has(metadata.source)) {
    invalid.push(`${asset.kind}.${asset.id}:production.source must be gemini, copied_placeholder, or handmade`);
  }
  if (!metadata.roleBrief || metadata.roleBrief.length < 20) {
    invalid.push(`${asset.kind}.${asset.id}:production.roleBrief must describe the gameplay or visual job`);
  }
  if (containsRejectedStyleCue(metadata.roleBrief)) {
    invalid.push(`${asset.kind}.${asset.id}:production.roleBrief contains an explicitly rejected style cue`);
  }
  if (!metadata.promptRef && metadata.source !== "handmade") {
    invalid.push(`${asset.kind}.${asset.id}:production.promptRef is required for generated assets`);
  }
  if (metadata.promptRef && !metadata.promptRef.includes(asset.slug)) {
    invalid.push(`${asset.kind}.${asset.id}:production.promptRef must include generated slug ${asset.slug}`);
  }
  if (metadata.artFamily !== expectedFamily) {
    invalid.push(`${asset.kind}.${asset.id}:production.artFamily must be ${expectedFamily}`);
  }
  validateApprovedExamples(asset, metadata, artDirectionContract, invalid);
  validateQualityGates(asset, metadata, artDirectionContract, invalid);
  validateProcessingMetadata(asset, metadata, invalid);
  if (asset.kind === "ship" && !metadata.gameplayRole) {
    invalid.push(`${asset.kind}.${asset.id}:production.gameplayRole is required for ships`);
  }
  if (asset.kind === "port" && !metadata.identity) {
    invalid.push(`${asset.kind}.${asset.id}:production.identity is required for ports`);
  }
  if (metadata.status === "provisional" && !metadata.replacementTask) {
    invalid.push(`${asset.kind}.${asset.id}:production.replacementTask is required for provisional assets`);
  }
  if (metadata.source === "copied_placeholder" && !metadata.copiedFrom) {
    invalid.push(`${asset.kind}.${asset.id}:production.copiedFrom is required for copied placeholders`);
  }
}

function styleCatalogFor(metadata, artDirectionContract) {
  const family = metadata.artFamily;
  const brief = artDirectionContract.profile.generationBriefs[family];
  return {
    family,
    briefRef: `generationBriefs.${family}`,
    camera: brief?.camera,
    approvedExamples: (metadata.approvedExampleIds ?? []).map((id) => {
      const example = artDirectionContract.examplesById.get(id);
      return { id, sourcePath: example?.sourcePath };
    }),
    qualityGates: (metadata.qaGateIds ?? []).map((id) => {
      const gate = artDirectionContract.gatesById.get(id);
      return { id, criteria: gate?.criteria ?? [] };
    }),
  };
}

function expectedArtFamilyForKind(kind) {
  if (kind === "background") return "ocean";
  if (kind === "fallback_ship" || kind === "ship") return "ships";
  if (kind === "port") return "ports";
  throw new Error(`No art-direction family mapped for asset kind ${kind}.`);
}

function validateApprovedExamples(asset, metadata, artDirectionContract, invalid) {
  if (!Array.isArray(metadata.approvedExampleIds) || !metadata.approvedExampleIds.length) {
    invalid.push(`${asset.kind}.${asset.id}:production.approvedExampleIds must reference approved art examples`);
    return;
  }
  for (const exampleId of metadata.approvedExampleIds) {
    const example = artDirectionContract.examplesById.get(exampleId);
    if (!example) {
      invalid.push(`${asset.kind}.${asset.id}:production.approvedExampleIds contains unknown example ${exampleId}`);
    } else if (!example.families.includes(metadata.artFamily)) {
      invalid.push(`${asset.kind}.${asset.id}:production.approvedExampleIds ${exampleId} does not cover ${metadata.artFamily}`);
    }
  }
}

function validateQualityGates(asset, metadata, artDirectionContract, invalid) {
  if (!Array.isArray(metadata.qaGateIds) || !metadata.qaGateIds.length) {
    invalid.push(`${asset.kind}.${asset.id}:production.qaGateIds must list art-direction QA gates`);
    return;
  }
  const requiredGateIds = artDirectionContract.profile.qualityGates
    .filter((gate) => gate.families.includes(metadata.artFamily))
    .map((gate) => gate.id);
  for (const gateId of requiredGateIds) {
    if (!metadata.qaGateIds.includes(gateId)) {
      invalid.push(`${asset.kind}.${asset.id}:production.qaGateIds must include ${gateId} for ${metadata.artFamily}`);
    }
  }
  for (const gateId of metadata.qaGateIds) {
    const gate = artDirectionContract.gatesById.get(gateId);
    if (!gate) {
      invalid.push(`${asset.kind}.${asset.id}:production.qaGateIds contains unknown gate ${gateId}`);
    } else if (!gate.families.includes(metadata.artFamily)) {
      invalid.push(`${asset.kind}.${asset.id}:production.qaGateIds ${gateId} does not apply to ${metadata.artFamily}`);
    }
  }
}

function validateProcessingMetadata(asset, metadata, invalid) {
  if (asset.kind === "background") {
    if (metadata.processing !== "background_jpeg_no_alpha") {
      invalid.push(`${asset.kind}.${asset.id}:production.processing must be background_jpeg_no_alpha`);
    }
    return;
  }
  if (metadata.processing !== "chroma_key_to_transparent_png") {
    invalid.push(`${asset.kind}.${asset.id}:production.processing must be chroma_key_to_transparent_png`);
  }
  if (!metadata.backgroundRemovalRef?.includes("scripts/asset_pipeline.mjs:createCleanSprite")) {
    invalid.push(`${asset.kind}.${asset.id}:production.backgroundRemovalRef must point to the clean-sprite background removal step`);
  }
}

function containsRejectedStyleCue(value) {
  return /\b(parchment|fantasy|toy|skull|watermark|text label|plastic|tavern)\b/i.test(value);
}

function assertSameSet(actual, expected, message) {
  if (!Array.isArray(actual)) throw new Error(message);
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  if (actualSet.size !== expectedSet.size || expected.some((item) => !actualSet.has(item))) {
    throw new Error(`${message}: expected ${expected.join(", ")}.`);
  }
}

function validateCleanSpriteDuplicate(firstAsset, secondAsset, invalid) {
  const firstKey = `${firstAsset.kind}:${firstAsset.id}`;
  const secondKey = `${secondAsset.kind}:${secondAsset.id}`;
  const firstAllowsDuplicate =
    firstAsset.production.status === "provisional" && firstAsset.production.copiedFrom === secondKey;
  const secondAllowsDuplicate =
    secondAsset.production.status === "provisional" && secondAsset.production.copiedFrom === firstKey;

  if (!firstAllowsDuplicate && !secondAllowsDuplicate) {
    invalid.push(`${secondKey}:clean sprite duplicates ${firstKey} without provisional copiedFrom metadata`);
  }
}

function pngMetadata(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error("Not a PNG.");
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer.readUInt8(25);
  return { width, height, hasAlpha: colorType === 4 || colorType === 6 };
}

function jpegMetadata(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) throw new Error("Invalid JPEG marker.");
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
        hasAlpha: false,
      };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG dimensions not found.");
}

async function copyTree(sourceDir, targetDir) {
  await mkdir(targetDir, { recursive: true });
  for (const item of await readdir(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, item.name);
    const targetPath = path.join(targetDir, item.name);
    if (item.isDirectory()) {
      await copyTree(sourcePath, targetPath);
    } else if (item.isFile()) {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath);
    }
  }
}

async function assertExecutable(filePath, message) {
  try {
    await access(filePath);
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error();
  } catch {
    throw new Error(message);
  }
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function toKebab(value) {
  return value.replaceAll("_", "-");
}

function relative(value) {
  return value.split(path.sep).join("/");
}
