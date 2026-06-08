import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "docs/FLUID_GRID_REMAP.md",
  "docs/TRACKING.md",
  "docs/GITHUB_SETUP.md",
  "docs/evidence/FG-01-fluid-capability-2026-06-07.json",
  "docs/evidence/FG-02-fluid-grid-benchmark-2026-06-07.json",
  "docs/evidence/FG-03-fluid-render-probe-2026-06-07.json",
  "docs/evidence/FG-04-fluid-coupling-2026-06-07.json",
  "docs/evidence/FG-05-fluid-splash-2026-06-07.json",
  "docs/evidence/FG-06-fluid-calibration-2026-06-07.json",
  "docs/evidence/FG-07-local-calibration-2026-06-08.json",
  "docs/evidence/FG-08-frame-loop-2026-06-08.json",
  "docs/evidence/FG-09-solver-architecture-2026-06-08.json",
  "docs/evidence/FG-10-reference-dataset-2026-06-08.json",
  "docs/evidence/FG-11-shallow-water-2026-06-08.json",
  "data/fluid-reference-cases.json",
  ".github/ISSUE_TEMPLATE/fluid_grid_task.yml",
  ".github/ISSUE_TEMPLATE/fluid_grid_gate.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "package.json",
  "src/fluid/fluidGridContract.ts",
  "src/fluid/fluidFrameLoop.ts",
  "src/fluid/fluidLocalCalibration.ts",
  "src/fluid/fluidSolverArchitecture.ts",
  "src/fluid/fluidReferenceDataset.ts",
  "src/fluid/fluidShallowWater.ts",
  "src/vite-env.d.ts",
];

const milestoneIds = ["FG-00", "FG-01", "FG-02", "FG-03", "FG-04", "FG-05", "FG-06", "FG-07", "FG-08", "FG-09", "FG-10", "FG-11"];
const gateIds = ["G-FG-00", "G-FG-01", "G-FG-02", "G-FG-03", "G-FG-04", "G-FG-05", "G-FG-06", "G-FG-07", "G-FG-08", "G-FG-09", "G-FG-10", "G-FG-11"];

function readRequired(filePath) {
  const absolutePath = path.join(root, filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required fluid remap file: ${filePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

const files = new Map(requiredFiles.map((filePath) => [filePath, readRequired(filePath)]));
const tracking = files.get("docs/TRACKING.md") ?? "";
const remap = files.get("docs/FLUID_GRID_REMAP.md") ?? "";
const contract = files.get("src/fluid/fluidGridContract.ts") ?? "";
const packageJson = files.get("package.json") ?? "";
const frameLoop = files.get("src/fluid/fluidFrameLoop.ts") ?? "";
const localCalibration = files.get("src/fluid/fluidLocalCalibration.ts") ?? "";
const solverArchitecture = files.get("src/fluid/fluidSolverArchitecture.ts") ?? "";
const referenceDatasetCode = files.get("src/fluid/fluidReferenceDataset.ts") ?? "";
const referenceDataset = files.get("data/fluid-reference-cases.json") ?? "";
const shallowWater = files.get("src/fluid/fluidShallowWater.ts") ?? "";
const viteEnv = files.get("src/vite-env.d.ts") ?? "";
const fg01Evidence = files.get("docs/evidence/FG-01-fluid-capability-2026-06-07.json") ?? "";
const fg02Evidence = files.get("docs/evidence/FG-02-fluid-grid-benchmark-2026-06-07.json") ?? "";
const fg03Evidence = files.get("docs/evidence/FG-03-fluid-render-probe-2026-06-07.json") ?? "";
const fg04Evidence = files.get("docs/evidence/FG-04-fluid-coupling-2026-06-07.json") ?? "";
const fg05Evidence = files.get("docs/evidence/FG-05-fluid-splash-2026-06-07.json") ?? "";
const fg06Evidence = files.get("docs/evidence/FG-06-fluid-calibration-2026-06-07.json") ?? "";
const fg07Evidence = files.get("docs/evidence/FG-07-local-calibration-2026-06-08.json") ?? "";
const fg08Evidence = files.get("docs/evidence/FG-08-frame-loop-2026-06-08.json") ?? "";
const fg09Evidence = files.get("docs/evidence/FG-09-solver-architecture-2026-06-08.json") ?? "";
const fg10Evidence = files.get("docs/evidence/FG-10-reference-dataset-2026-06-08.json") ?? "";
const fg11Evidence = files.get("docs/evidence/FG-11-shallow-water-2026-06-08.json") ?? "";
const taskTemplate = files.get(".github/ISSUE_TEMPLATE/fluid_grid_task.yml") ?? "";
const gateTemplate = files.get(".github/ISSUE_TEMPLATE/fluid_grid_gate.yml") ?? "";

const errors = [];

for (const milestoneId of milestoneIds) {
  if (!tracking.includes(`| ${milestoneId} |`)) errors.push(`docs/TRACKING.md is missing milestone row ${milestoneId}`);
  if (!contract.includes(`"${milestoneId}"`)) errors.push(`src/fluid/fluidGridContract.ts is missing ${milestoneId}`);
  if (!taskTemplate.includes("FG-XX-TXX")) errors.push("fluid_grid_task.yml is missing the task title convention");
}

for (const gateId of gateIds) {
  if (!tracking.includes(`| ${gateId} |`)) errors.push(`docs/TRACKING.md is missing gate row ${gateId}`);
  if (!contract.includes(`"${gateId}"`)) errors.push(`src/fluid/fluidGridContract.ts is missing ${gateId}`);
}

const requiredRemapPhrases = [
  "WebGPU-first fluid grid",
  "Canvas 2D can remain only as a legacy diagnostic",
  "navigator.gpu",
  "full-grid GPU readback every frame",
  "two-way coupling",
];

const normalizedRemap = remap.toLowerCase();
for (const phrase of requiredRemapPhrases) {
  if (!normalizedRemap.includes(phrase.toLowerCase())) errors.push(`docs/FLUID_GRID_REMAP.md is missing required phrase: ${phrase}`);
}

if (!tracking.includes("FG-00-T04") || !tracking.includes("origin/main")) {
  errors.push("docs/TRACKING.md must record that the GitHub remote tracks origin/main");
}

if (!gateTemplate.includes("Production water path does not use Canvas 2D")) {
  errors.push("fluid_grid_gate.yml must preserve the no-primary-Canvas invariant");
}

if (!fg01Evidence.includes("\"status\": \"webgpu-ready\"") || !fg01Evidence.includes("\"selectedTier\": \"high\"")) {
  errors.push("FG-01 evidence must record a WebGPU-ready high-tier report");
}

if (!fg02Evidence.includes("\"gate\": \"G-FG-02\"") || !fg02Evidence.includes("\"pass\": true") || !fg02Evidence.includes("\"noFullGridReadbackPerFrame\": true")) {
  errors.push("FG-02 evidence must record a passing grid benchmark without per-frame full-grid readback");
}

if (!fg03Evidence.includes("\"gate\": \"G-FG-03\"") || !fg03Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") || !fg03Evidence.includes("\"waterContext\": \"webgpu\"")) {
  errors.push("FG-03 evidence must record WebGPU grid renderer telemetry");
}

if (
  !fg04Evidence.includes("\"gate\": \"G-FG-04\"") ||
  !fg04Evidence.includes("\"coupling\": \"object-grid-v1\"") ||
  !fg04Evidence.includes("\"boundedDiagnostics\": true") ||
  !fg04Evidence.includes("\"noFullGridReadbackPerFrame\": true")
) {
  errors.push("FG-04 evidence must record bounded WebGPU object-grid coupling telemetry without per-frame full-grid readback");
}

if (
  !fg05Evidence.includes("\"gate\": \"G-FG-05\"") ||
  !fg05Evidence.includes("\"splash\": \"grid-splash-v1\"") ||
  !fg05Evidence.includes("\"boundedDiagnostics\": true") ||
  !fg05Evidence.includes("\"noFullGridReadbackPerFrame\": true") ||
  !fg05Evidence.includes("\"accumulatedReentryEnergyJ\"")
) {
  errors.push("FG-05 evidence must record bounded WebGPU grid-splash telemetry with secondary reentry coupling");
}

if (
  !fg06Evidence.includes("\"gate\": \"G-FG-06\"") ||
  !fg06Evidence.includes("\"pass\": true") ||
  !fg06Evidence.includes("\"impact-speed-concrete-8m\"") ||
  !fg06Evidence.includes("\"foam-block-settling-draft\"") ||
  !fg06Evidence.includes("\"high-weber-splash-height-band\"") ||
  !fg06Evidence.includes("\"failedCases\": []") ||
  !fg06Evidence.includes("\"failedEvidence\": []")
) {
  errors.push("FG-06 evidence must record passing calibration cases and complete WebGPU evidence checks");
}

if (!packageJson.includes("\"fluid:local-calibrate\"") || !packageJson.includes("\"fluid:local-calibrate:packaged\"")) {
  errors.push("package.json must expose the FG-07 source and packaged local calibration commands");
}

if (!tracking.includes("FG-07-T03") || !tracking.includes("FG-07-local-calibration-2026-06-08.json") || !tracking.includes("fluid:local-calibrate:packaged")) {
  errors.push("docs/TRACKING.md must record FG-07 local GPU/frame-pacing evidence");
}

const normalizedFg07Remap = remap.toLowerCase();
if (
  !normalizedFg07Remap.includes("webgpu timestamp queries") ||
  !normalizedFg07Remap.includes("p95 frame time") ||
  !normalizedFg07Remap.includes("local desktop frame-pacing") ||
  !normalizedFg07Remap.includes("packaged-app")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must describe the FG-07 local GPU/frame-pacing calibration direction");
}

if (!localCalibration.includes("maxP95FrameMs") || !localCalibration.includes("duplicateWaterFrameRatio") || !localCalibration.includes("timestampQueryUsed")) {
  errors.push("fluidLocalCalibration.ts must define local smoothness and GPU timestamp evidence fields");
}

if (
  !fg07Evidence.includes("\"gate\": \"G-FG-07\"") ||
  !fg07Evidence.includes("\"pass\": true") ||
  !fg07Evidence.includes("\"launchMode\": \"packaged-app\"") ||
  !fg07Evidence.includes("\"timestampQueryUsed\": true") ||
  !fg07Evidence.includes("\"stability\": \"smooth\"")
) {
  errors.push("FG-07 evidence must record a passing packaged-app local GPU/frame-pacing calibration");
}

if (!packageJson.includes("\"fluid:frame-loop\"")) {
  errors.push("package.json must expose the FG-08 frame-loop command");
}

if (!tracking.includes("FG-08-T03") || !tracking.includes("FG-08-frame-loop-2026-06-08.json") || !tracking.includes("fluid:frame-loop")) {
  errors.push("docs/TRACKING.md must record FG-08 fixed-step frame-loop evidence");
}

if (!frameLoop.includes("fixedStepS: 1 / 120") || !frameLoop.includes("maxSubstepsPerFrame: 24") || !frameLoop.includes("planFluidFrameStep")) {
  errors.push("fluidFrameLoop.ts must define the bounded 120 Hz fixed-step planner");
}

if (contract.includes("FG-08") && (!contract.includes("planFluidFrameStep") || !contract.includes("window.__fluidFrameLoopStats"))) {
  errors.push("src/fluid/fluidGridContract.ts must describe the FG-08 frame-loop integration proof");
}

if (remap.includes("FG-08") && (!remap.includes("120 Hz") || !remap.includes("Dropped simulation debt"))) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize FG-08 fixed-step evidence");
}

if (
  !fg08Evidence.includes("\"gate\": \"G-FG-08\"") ||
  !fg08Evidence.includes("\"pass\": true") ||
  !fg08Evidence.includes("\"fixedStepS\": 0.008333333333333333") ||
  !fg08Evidence.includes("\"maxSubstepsPerFrame\": 24") ||
  !fg08Evidence.includes("\"droppedDebtS\": 0") ||
  !fg08Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"")
) {
  errors.push("FG-08 evidence must record a passing fixed-step WebGPU frame-loop report");
}

if (!packageJson.includes("\"fluid:architecture\"")) {
  errors.push("package.json must expose the FG-09 solver architecture command");
}

if (!tracking.includes("FG-09-T03") || !tracking.includes("FG-09-solver-architecture-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/12")) {
  errors.push("docs/TRACKING.md must record FG-09 solver architecture evidence and issue mapping");
}

if (
  !solverArchitecture.includes("hybrid-heightfield-particles") ||
  !solverArchitecture.includes("stam-1999-stable-fluids") ||
  !solverArchitecture.includes("chentanez-muller-2010-heightfield-particles") ||
  !solverArchitecture.includes("brodtkorb-saetra-altinakar-2012-gpu-shallow-water") ||
  !solverArchitecture.includes("macklin-muller-2013-position-based-fluids")
) {
  errors.push("fluidSolverArchitecture.ts must capture the primary-source hybrid solver decision");
}

if (
  !remap.includes("FG-09") ||
  !remap.includes("hybrid GPU heightfield/free-surface") ||
  !remap.includes("localized particle splash layer") ||
  !remap.includes("Position Based Fluids") ||
  !remap.includes("Efficient Shallow Water Simulations on GPUs")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-09 source-backed solver architecture decision");
}

if (
  !fg09Evidence.includes("\"gate\": \"G-FG-09\"") ||
  !fg09Evidence.includes("\"pass\": true") ||
  !fg09Evidence.includes("\"recommendedOptionId\": \"hybrid-heightfield-particles\"") ||
  !fg09Evidence.includes("\"primaryReferences\"") ||
  !fg09Evidence.includes("stam-1999-stable-fluids") ||
  !fg09Evidence.includes("bridson-fedkiw-muller-2006-course") ||
  !fg09Evidence.includes("chentanez-muller-2010-heightfield-particles") ||
  !fg09Evidence.includes("macklin-muller-2013-position-based-fluids") ||
  !fg09Evidence.includes("brodtkorb-saetra-altinakar-2012-gpu-shallow-water") ||
  !fg09Evidence.includes("\"full-3d-eulerian\"") ||
  !fg09Evidence.includes("\"particle-only-pbf-sph\"") ||
  !fg09Evidence.includes("\"stable-fluids-eulerian\"") ||
  !fg09Evidence.includes("\"G-FG-13\"")
) {
  errors.push("FG-09 evidence must record a passing primary-source hybrid solver decision with rejected alternatives and follow-on gates");
}

if (!packageJson.includes("\"fluid:references\"")) {
  errors.push("package.json must expose the FG-10 reference dataset command");
}

if (!tracking.includes("FG-10-T03") || !tracking.includes("FG-10-reference-dataset-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/13")) {
  errors.push("docs/TRACKING.md must record FG-10 reference dataset evidence and issue mapping");
}

if (
  !referenceDataset.includes("\"category\": \"drop\"") ||
  !referenceDataset.includes("\"category\": \"splash\"") ||
  !referenceDataset.includes("\"category\": \"float\"") ||
  !referenceDataset.includes("\"category\": \"sink\"") ||
  !referenceDataset.includes("\"category\": \"damping\"") ||
  !referenceDataset.includes("nist-standard-gravity") ||
  !referenceDataset.includes("nasa-drag-equation") ||
  !referenceDataset.includes("openstax-archimedes") ||
  !referenceDataset.includes("uncertainty")
) {
  errors.push("data/fluid-reference-cases.json must cover drop/splash/float/sink/damping with source metadata and uncertainty");
}

if (
  !referenceDatasetCode.includes("createFluidReferenceDatasetReport") ||
  !referenceDatasetCode.includes("fluidReferenceDatasetSchema") ||
  !referenceDatasetCode.includes("impact-speed-vacuum-freefall-band") ||
  !referenceDatasetCode.includes("splash-ballistic-head-band") ||
  !referenceDatasetCode.includes("underwater-terminal-velocity-band")
) {
  errors.push("fluidReferenceDataset.ts must implement the FG-10 ingestion and replay harness");
}

if (
  !remap.includes("FG-10") ||
  !remap.includes("Reference dataset ingestion") ||
  !remap.includes("drop, splash, float, sink, and damping") ||
  !remap.includes("source metadata")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-10 reference dataset gate");
}

if (
  !fg10Evidence.includes("\"gate\": \"G-FG-10\"") ||
  !fg10Evidence.includes("\"pass\": true") ||
  !fg10Evidence.includes("\"datasetId\": \"ocean-impact-reference-v1\"") ||
  !fg10Evidence.includes("\"categories\"") ||
  !fg10Evidence.includes("\"drop\"") ||
  !fg10Evidence.includes("\"splash\"") ||
  !fg10Evidence.includes("\"float\"") ||
  !fg10Evidence.includes("\"sink\"") ||
  !fg10Evidence.includes("\"damping\"") ||
  !fg10Evidence.includes("\"water-entry-speed\"") ||
  !fg10Evidence.includes("\"splash-crown-height\"") ||
  !fg10Evidence.includes("\"underwater-terminal-speed\"") ||
  !fg10Evidence.includes("\"failedMeasurements\": []")
) {
  errors.push("FG-10 evidence must record a passing source-backed reference dataset replay with required behavior categories");
}

if (!packageJson.includes("\"fluid:shallow-water\"")) {
  errors.push("package.json must expose the FG-11 shallow-water command");
}

if (!tracking.includes("FG-11-T03") || !tracking.includes("FG-11-shallow-water-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/14")) {
  errors.push("docs/TRACKING.md must record FG-11 shallow-water evidence and issue mapping");
}

if (
  !shallowWater.includes("conservative-shallow-water-v1") ||
  !shallowWater.includes("momentumX") ||
  !shallowWater.includes("momentumY") ||
  !shallowWater.includes("dryMask") ||
  !shallowWater.includes("massRelativeDrift") ||
  !shallowWater.includes("momentumDampingRatio") ||
  !shallowWater.includes("timestamp-query")
) {
  errors.push("fluidShallowWater.ts must implement conservative shallow-water state, diagnostics, and GPU timing");
}

if (!viteEnv.includes("__runShallowWaterBenchmark") || !packageJson.includes("scripts/fluid_shallow_water_report.mjs")) {
  errors.push("FG-11 benchmark must be exposed to the Electron evidence runner");
}

if (
  !remap.includes("FG-11") ||
  !remap.includes("conservative shallow-water") ||
  !remap.includes("mass drift") ||
  !remap.includes("momentum damping") ||
  !remap.includes("pressure-gradient acceleration failed")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-11 conservative shallow-water gate and pressure-gradient caveat");
}

if (
  !fg11Evidence.includes("\"gate\": \"G-FG-11\"") ||
  !fg11Evidence.includes("\"pass\": true") ||
  !fg11Evidence.includes("\"solver\": \"conservative-shallow-water-v1\"") ||
  !fg11Evidence.includes("\"noFullGridReadbackPerFrame\": true") ||
  !fg11Evidence.includes("\"massRelativeDrift\"") ||
  !fg11Evidence.includes("\"momentumDampingRatio\"") ||
  !fg11Evidence.includes("\"negativeDepthCells\": 0") ||
  !fg11Evidence.includes("\"dryCellsWithWater\": 0") ||
  !fg11Evidence.includes("\"timestampQueryEnabled\": true") ||
  !fg11Evidence.includes("\"standard\"") ||
  !fg11Evidence.includes("\"high\"")
) {
  errors.push("FG-11 evidence must record a passing conservative shallow-water WebGPU report for standard and high tiers");
}

if (errors.length > 0) {
  console.error("Fluid remap tracking check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Fluid remap tracking check passed: ${milestoneIds.length} milestones, ${gateIds.length} gates, ${requiredFiles.length} files.`);
