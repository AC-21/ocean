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
  "docs/evidence/FG-12-particle-splash-2026-06-08.json",
  "docs/evidence/FG-13-coupled-calibration-2026-06-08.json",
  "docs/evidence/FG-14-live-particles-2026-06-08.json",
  "docs/evidence/FG-15-pressure-gradient-2026-06-08.json",
  "docs/evidence/FG-16-live-pressure-2026-06-08.json",
  "docs/evidence/FG-17-pressure-feedback-2026-06-08.json",
  "docs/evidence/FG-18-live-reference-outcomes-2026-06-08.json",
  "docs/evidence/FG-19-display-pacing-2026-06-08.json",
  "docs/evidence/FG-20-resolution-scaling-2026-06-08.json",
  "docs/evidence/FG-21-ultra-renderer-2026-06-08.json",
  "docs/evidence/FG-22-ultra-reference-outcomes-2026-06-08.json",
  "docs/evidence/FG-23-adaptive-tier-2026-06-08.json",
  "docs/evidence/FG-24-persisted-calibration-2026-06-08.json",
  "docs/evidence/FG-25-installed-calibration-2026-06-08.json",
  "docs/evidence/FG-26-installed-display-pacing-2026-06-08.json",
  "docs/evidence/FG-27-calibration-freshness-2026-06-08.json",
  "data/fluid-reference-cases.json",
  ".github/ISSUE_TEMPLATE/fluid_grid_task.yml",
  ".github/ISSUE_TEMPLATE/fluid_grid_gate.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "electron/main.cjs",
  "electron/storage.cjs",
  "electron/storage.test.mjs",
  "package.json",
  "scripts/desktop_storage_smoke.mjs",
  "scripts/fluid_live_reference_outcomes_report.mjs",
  "src/OceanPhysicsApp.tsx",
  "src/OceanPhysicsApp.test.tsx",
  "src/physicsOcean.ts",
  "src/fluid/fluidDisplayPacing.ts",
  "src/fluid/fluidDisplayPacing.report.ts",
  "src/fluid/fluidDisplayPacing.test.ts",
  "src/fluid/fluidAdaptiveTier.ts",
  "src/fluid/fluidAdaptiveTier.report.ts",
  "src/fluid/fluidAdaptiveTier.test.ts",
  "src/fluid/fluidPersistedCalibration.ts",
  "src/fluid/fluidPersistedCalibration.report.ts",
  "src/fluid/fluidPersistedCalibration.test.ts",
  "src/fluid/fluidInstalledCalibration.ts",
  "src/fluid/fluidInstalledCalibration.report.ts",
  "src/fluid/fluidInstalledCalibration.test.ts",
  "src/fluid/fluidInstalledDisplayPacing.ts",
  "src/fluid/fluidInstalledDisplayPacing.report.ts",
  "src/fluid/fluidInstalledDisplayPacing.test.ts",
  "src/fluid/fluidCalibrationFreshness.ts",
  "src/fluid/fluidCalibrationFreshness.report.ts",
  "src/fluid/fluidCalibrationFreshness.test.ts",
  "src/fluid/fluidResolutionScaling.ts",
  "src/fluid/fluidResolutionScaling.report.ts",
  "src/fluid/fluidResolutionScaling.test.ts",
  "src/fluid/fluidUltraRenderer.ts",
  "src/fluid/fluidUltraRenderer.report.ts",
  "src/fluid/fluidUltraRenderer.test.ts",
  "src/fluid/fluidUltraReferenceOutcomes.ts",
  "src/fluid/fluidUltraReferenceOutcomes.report.ts",
  "src/fluid/fluidUltraReferenceOutcomes.test.ts",
  "src/fluid/fluidGridContract.ts",
  "src/fluid/fluidFrameLoop.ts",
  "src/fluid/fluidLocalCalibration.ts",
  "src/fluid/fluidSolverArchitecture.ts",
  "src/fluid/fluidReferenceDataset.ts",
  "src/fluid/fluidShallowWater.ts",
  "src/fluid/fluidParticleSplash.ts",
  "src/fluid/fluidCoupledCalibration.ts",
  "src/fluid/fluidWaterRenderer.ts",
  "src/vite-env.d.ts",
];

const milestoneIds = ["FG-00", "FG-01", "FG-02", "FG-03", "FG-04", "FG-05", "FG-06", "FG-07", "FG-08", "FG-09", "FG-10", "FG-11", "FG-12", "FG-13", "FG-14", "FG-15", "FG-16", "FG-17", "FG-18", "FG-19", "FG-20", "FG-21", "FG-22", "FG-23", "FG-24", "FG-25", "FG-26", "FG-27"];
const gateIds = ["G-FG-00", "G-FG-01", "G-FG-02", "G-FG-03", "G-FG-04", "G-FG-05", "G-FG-06", "G-FG-07", "G-FG-08", "G-FG-09", "G-FG-10", "G-FG-11", "G-FG-12", "G-FG-13", "G-FG-14", "G-FG-15", "G-FG-16", "G-FG-17", "G-FG-18", "G-FG-19", "G-FG-20", "G-FG-21", "G-FG-22", "G-FG-23", "G-FG-24", "G-FG-25", "G-FG-26", "G-FG-27"];

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
const electronMain = files.get("electron/main.cjs") ?? "";
const electronStorage = files.get("electron/storage.cjs") ?? "";
const electronStorageTest = files.get("electron/storage.test.mjs") ?? "";
const packageJson = files.get("package.json") ?? "";
const desktopStorageSmoke = files.get("scripts/desktop_storage_smoke.mjs") ?? "";
const liveReferenceScript = files.get("scripts/fluid_live_reference_outcomes_report.mjs") ?? "";
const oceanPhysicsApp = files.get("src/OceanPhysicsApp.tsx") ?? "";
const oceanPhysicsAppTest = files.get("src/OceanPhysicsApp.test.tsx") ?? "";
const physicsOcean = files.get("src/physicsOcean.ts") ?? "";
const displayPacing = files.get("src/fluid/fluidDisplayPacing.ts") ?? "";
const displayPacingReport = files.get("src/fluid/fluidDisplayPacing.report.ts") ?? "";
const displayPacingTest = files.get("src/fluid/fluidDisplayPacing.test.ts") ?? "";
const adaptiveTier = files.get("src/fluid/fluidAdaptiveTier.ts") ?? "";
const adaptiveTierReport = files.get("src/fluid/fluidAdaptiveTier.report.ts") ?? "";
const adaptiveTierTest = files.get("src/fluid/fluidAdaptiveTier.test.ts") ?? "";
const persistedCalibration = files.get("src/fluid/fluidPersistedCalibration.ts") ?? "";
const persistedCalibrationReport = files.get("src/fluid/fluidPersistedCalibration.report.ts") ?? "";
const persistedCalibrationTest = files.get("src/fluid/fluidPersistedCalibration.test.ts") ?? "";
const installedCalibration = files.get("src/fluid/fluidInstalledCalibration.ts") ?? "";
const installedCalibrationReport = files.get("src/fluid/fluidInstalledCalibration.report.ts") ?? "";
const installedCalibrationTest = files.get("src/fluid/fluidInstalledCalibration.test.ts") ?? "";
const installedDisplayPacing = files.get("src/fluid/fluidInstalledDisplayPacing.ts") ?? "";
const installedDisplayPacingReport = files.get("src/fluid/fluidInstalledDisplayPacing.report.ts") ?? "";
const installedDisplayPacingTest = files.get("src/fluid/fluidInstalledDisplayPacing.test.ts") ?? "";
const calibrationFreshness = files.get("src/fluid/fluidCalibrationFreshness.ts") ?? "";
const calibrationFreshnessReport = files.get("src/fluid/fluidCalibrationFreshness.report.ts") ?? "";
const calibrationFreshnessTest = files.get("src/fluid/fluidCalibrationFreshness.test.ts") ?? "";
const resolutionScaling = files.get("src/fluid/fluidResolutionScaling.ts") ?? "";
const resolutionScalingReport = files.get("src/fluid/fluidResolutionScaling.report.ts") ?? "";
const resolutionScalingTest = files.get("src/fluid/fluidResolutionScaling.test.ts") ?? "";
const ultraRenderer = files.get("src/fluid/fluidUltraRenderer.ts") ?? "";
const ultraRendererReport = files.get("src/fluid/fluidUltraRenderer.report.ts") ?? "";
const ultraRendererTest = files.get("src/fluid/fluidUltraRenderer.test.ts") ?? "";
const ultraReferenceOutcomes = files.get("src/fluid/fluidUltraReferenceOutcomes.ts") ?? "";
const ultraReferenceOutcomesReport = files.get("src/fluid/fluidUltraReferenceOutcomes.report.ts") ?? "";
const ultraReferenceOutcomesTest = files.get("src/fluid/fluidUltraReferenceOutcomes.test.ts") ?? "";
const frameLoop = files.get("src/fluid/fluidFrameLoop.ts") ?? "";
const localCalibration = files.get("src/fluid/fluidLocalCalibration.ts") ?? "";
const solverArchitecture = files.get("src/fluid/fluidSolverArchitecture.ts") ?? "";
const referenceDatasetCode = files.get("src/fluid/fluidReferenceDataset.ts") ?? "";
const referenceDataset = files.get("data/fluid-reference-cases.json") ?? "";
const shallowWater = files.get("src/fluid/fluidShallowWater.ts") ?? "";
const particleSplash = files.get("src/fluid/fluidParticleSplash.ts") ?? "";
const coupledCalibration = files.get("src/fluid/fluidCoupledCalibration.ts") ?? "";
const waterRenderer = files.get("src/fluid/fluidWaterRenderer.ts") ?? "";
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
const fg12Evidence = files.get("docs/evidence/FG-12-particle-splash-2026-06-08.json") ?? "";
const fg13Evidence = files.get("docs/evidence/FG-13-coupled-calibration-2026-06-08.json") ?? "";
const fg14Evidence = files.get("docs/evidence/FG-14-live-particles-2026-06-08.json") ?? "";
const fg15Evidence = files.get("docs/evidence/FG-15-pressure-gradient-2026-06-08.json") ?? "";
const fg16Evidence = files.get("docs/evidence/FG-16-live-pressure-2026-06-08.json") ?? "";
const fg17Evidence = files.get("docs/evidence/FG-17-pressure-feedback-2026-06-08.json") ?? "";
const fg18Evidence = files.get("docs/evidence/FG-18-live-reference-outcomes-2026-06-08.json") ?? "";
const fg19Evidence = files.get("docs/evidence/FG-19-display-pacing-2026-06-08.json") ?? "";
const fg20Evidence = files.get("docs/evidence/FG-20-resolution-scaling-2026-06-08.json") ?? "";
const fg21Evidence = files.get("docs/evidence/FG-21-ultra-renderer-2026-06-08.json") ?? "";
const fg22Evidence = files.get("docs/evidence/FG-22-ultra-reference-outcomes-2026-06-08.json") ?? "";
const fg23Evidence = files.get("docs/evidence/FG-23-adaptive-tier-2026-06-08.json") ?? "";
const fg24Evidence = files.get("docs/evidence/FG-24-persisted-calibration-2026-06-08.json") ?? "";
const fg25Evidence = files.get("docs/evidence/FG-25-installed-calibration-2026-06-08.json") ?? "";
const fg26Evidence = files.get("docs/evidence/FG-26-installed-display-pacing-2026-06-08.json") ?? "";
const fg27Evidence = files.get("docs/evidence/FG-27-calibration-freshness-2026-06-08.json") ?? "";
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

if (!packageJson.includes("\"fluid:particles\"")) {
  errors.push("package.json must expose the FG-12 particle-splash command");
}

if (!tracking.includes("FG-12-T03") || !tracking.includes("FG-12-particle-splash-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/15")) {
  errors.push("docs/TRACKING.md must record FG-12 particle-splash evidence and issue mapping");
}

if (
  !particleSplash.includes("localized-particle-splash-v1") ||
  !particleSplash.includes("ParticleSplashGridFeedback") ||
  !particleSplash.includes("massFractionOfDisplaced") ||
  !particleSplash.includes("momentumFractionOfImpact") ||
  !particleSplash.includes("referenceSplashBandFor") ||
  !particleSplash.includes("reentryEnergyJ") ||
  !particleSplash.includes("timestamp-query")
) {
  errors.push("fluidParticleSplash.ts must implement localized particle splash state, diagnostics, reference bands, and GPU timing");
}

if (!viteEnv.includes("__runParticleSplashBenchmark") || !packageJson.includes("scripts/fluid_particle_splash_report.mjs")) {
  errors.push("FG-12 benchmark must be exposed to the Electron evidence runner");
}

if (
  !remap.includes("FG-12") ||
  !remap.includes("localized particle") ||
  !remap.includes("spray mass") ||
  !remap.includes("reference splash") ||
  !remap.includes("secondary reentry")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-12 particle splash gate and evidence");
}

if (
  !fg12Evidence.includes("\"gate\": \"G-FG-12\"") ||
  !fg12Evidence.includes("\"pass\": true") ||
  !fg12Evidence.includes("\"solver\": \"localized-particle-splash-v1\"") ||
  !fg12Evidence.includes("\"noFullGridReadbackPerFrame\": true") ||
  !fg12Evidence.includes("\"massFractionOfDisplaced\"") ||
  !fg12Evidence.includes("\"momentumFractionOfImpact\"") ||
  !fg12Evidence.includes("\"predictedCrownHeightM\"") ||
  !fg12Evidence.includes("\"referenceSplashBand\"") ||
  !fg12Evidence.includes("\"reentryEnergyJ\"") ||
  !fg12Evidence.includes("\"gridFeedback\"") ||
  !fg12Evidence.includes("\"timestampQueryEnabled\": true") ||
  !fg12Evidence.includes("\"standard\"") ||
  !fg12Evidence.includes("\"high\"")
) {
  errors.push("FG-12 evidence must record a passing localized particle-splash WebGPU report for standard and high tiers");
}

if (!packageJson.includes("\"fluid:coupled-calibrate\"")) {
  errors.push("package.json must expose the FG-13 coupled packaged-app calibration command");
}

if (!tracking.includes("FG-13-T03") || !tracking.includes("FG-13-coupled-calibration-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/16")) {
  errors.push("docs/TRACKING.md must record FG-13 coupled calibration evidence and issue mapping");
}

if (
  !coupledCalibration.includes("G-FG-13") ||
  !coupledCalibration.includes("createFluidCoupledCalibrationReport") ||
  !coupledCalibration.includes("packaged-app") ||
  !coupledCalibration.includes("splash-crown-cpu-particle-agreement") ||
  !coupledCalibration.includes("shallow-water-mass-drift") ||
  !coupledCalibration.includes("particle-splash-mass-fraction") ||
  !coupledCalibration.includes("noFullGridReadbackPerFrame")
) {
  errors.push("fluidCoupledCalibration.ts must compose packaged runtime, reference replay, shallow-water, and particle evidence");
}

if (
  !remap.includes("FG-13") ||
  !remap.includes("coupled packaged-app") ||
  !remap.includes("CPU reference crown") ||
  !remap.includes("particle crown") ||
  !remap.includes("drop, splash, float, sink, and damping")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-13 coupled packaged-app calibration gate and evidence");
}

if (
  !fg13Evidence.includes("\"gate\": \"G-FG-13\"") ||
  !fg13Evidence.includes("\"pass\": true") ||
  !fg13Evidence.includes("\"launchMode\": \"packaged-app\"") ||
  !fg13Evidence.includes("\"renderer\": [") ||
  !fg13Evidence.includes("\"webgpu-grid-primary-v1\"") ||
  !fg13Evidence.includes("\"drop-speed-reference\"") ||
  !fg13Evidence.includes("\"splash-crown-cpu-particle-agreement\"") ||
  !fg13Evidence.includes("\"float-static-draft-reference\"") ||
  !fg13Evidence.includes("\"sink-terminal-speed-reference\"") ||
  !fg13Evidence.includes("\"shallowWater\"") ||
  !fg13Evidence.includes("\"massRelativeDrift\"") ||
  !fg13Evidence.includes("\"particleSplash\"") ||
  !fg13Evidence.includes("\"massFractionOfDisplaced\"") ||
  !fg13Evidence.includes("\"noFullGridReadbackPerFrame\": true") ||
  !fg13Evidence.includes("\"failedMeasurements\": []")
) {
  errors.push("FG-13 evidence must record a passing coupled packaged-app calibration report");
}

if (!packageJson.includes("\"fluid:live-particles\"")) {
  errors.push("package.json must expose the FG-14 packaged live-particle command");
}

if (!tracking.includes("FG-14-T03") || !tracking.includes("FG-14-live-particles-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/17")) {
  errors.push("docs/TRACKING.md must record FG-14 live particle evidence and issue mapping");
}

if (
  !particleSplash.includes("localized-particle-splash-live-v1") ||
  !particleSplash.includes("liveParticleSplashFeedbackFor") ||
  !particleSplash.includes("ParticleSplashLiveFeedbackSummary") ||
  !particleSplash.includes("massFractionOfDisplaced") ||
  !particleSplash.includes("momentumFractionOfImpact") ||
  !particleSplash.includes("noFullGridReadbackPerFrame")
) {
  errors.push("fluidParticleSplash.ts must expose live particle splash feedback with bounded diagnostics");
}

if (
  !waterRenderer.includes("lastParticleSplash") ||
  !waterRenderer.includes("liveParticleSplashFeedbackFor") ||
  !waterRenderer.includes("writeParticleFeedbackRow") ||
  !waterRenderer.includes("waterParticles") ||
  !waterRenderer.includes("waterParticlesMassFraction") ||
  !waterRenderer.includes("waterParticlesReentryEnergy")
) {
  errors.push("fluidWaterRenderer.ts must integrate live particle feedback into renderer stats, telemetry, uniforms, and grid rows");
}

if (
  !remap.includes("FG-14") ||
  !remap.includes("localized-particle-splash-live-v1") ||
  !remap.includes("Runtime telemetry") ||
  !remap.includes("live particle render intensity") ||
  !remap.includes("no per-frame full-grid readback")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-14 live particle renderer gate and evidence");
}

if (
  !fg14Evidence.includes("\"gate\": \"G-FG-14\"") ||
  !fg14Evidence.includes("\"pass\": true") ||
  !fg14Evidence.includes("\"launchMode\": \"packaged-app\"") ||
  !fg14Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg14Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg14Evidence.includes("\"particles\": \"localized-particle-splash-live-v1\"") ||
  !fg14Evidence.includes("\"particlesActive\": true") ||
  !fg14Evidence.includes("\"massFraction\"") ||
  !fg14Evidence.includes("\"momentumFraction\"") ||
  !fg14Evidence.includes("\"reentryEnergyJ\"") ||
  !fg14Evidence.includes("\"renderIntensity\"") ||
  !fg14Evidence.includes("\"noFullGridReadbackPerFrame\": true")
) {
  errors.push("FG-14 evidence must record a passing packaged live-particle renderer report");
}

if (!packageJson.includes("\"fluid:pressure\"") || !packageJson.includes("scripts/fluid_pressure_gradient_report.mjs")) {
  errors.push("package.json must expose the FG-15 pressure-gradient command");
}

if (!tracking.includes("FG-15-T03") || !tracking.includes("FG-15-pressure-gradient-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/18")) {
  errors.push("docs/TRACKING.md must record FG-15 pressure-gradient evidence and issue mapping");
}

if (
  !shallowWater.includes("bounded-pressure-gradient-v1") ||
  !shallowWater.includes("pressureGradient") ||
  !shallowWater.includes("pressureWorkEstimateJ") ||
  !shallowWater.includes("energyRelativeDrift") ||
  !shallowWater.includes("slopeLimitedCells") ||
  !shallowWater.includes("maxMomentumPerDepth")
) {
  errors.push("fluidShallowWater.ts must implement bounded pressure-gradient diagnostics, slope limiting, and momentum limiting");
}

if (
  !remap.includes("FG-15") ||
  !remap.includes("bounded-pressure-gradient-v1") ||
  !remap.includes("pressure-gradient acceleration") ||
  !remap.includes("slope-limited cells") ||
  !remap.includes("pressure momentum budget ratio")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-15 pressure-gradient gate and measured evidence");
}

if (
  !fg15Evidence.includes("\"gate\": \"G-FG-15\"") ||
  !fg15Evidence.includes("\"pass\": true") ||
  !fg15Evidence.includes("\"solver\": \"bounded-pressure-gradient-v1\"") ||
  !fg15Evidence.includes("\"pressureGradient\": true") ||
  !fg15Evidence.includes("\"pressureGain\": 0.06") ||
  !fg15Evidence.includes("\"massRelativeDrift\"") ||
  !fg15Evidence.includes("\"energyRelativeDrift\"") ||
  !fg15Evidence.includes("\"pressureWorkEstimateJ\"") ||
  !fg15Evidence.includes("\"slopeLimitedCells\"") ||
  !fg15Evidence.includes("\"momentumGrowthRatio\"") ||
  !fg15Evidence.includes("\"negativeDepthCells\": 0") ||
  !fg15Evidence.includes("\"dryCellsWithWater\": 0") ||
  !fg15Evidence.includes("\"timestampQueryEnabled\": true") ||
  !fg15Evidence.includes("\"standard\"") ||
  !fg15Evidence.includes("\"high\"")
) {
  errors.push("FG-15 evidence must record a passing bounded pressure-gradient WebGPU report for standard and high tiers");
}

if (!packageJson.includes("\"fluid:live-pressure\"") || !packageJson.includes("scripts/fluid_live_pressure_report.mjs")) {
  errors.push("package.json must expose the FG-16 packaged live-pressure command");
}

if (!tracking.includes("FG-16-T03") || !tracking.includes("FG-16-live-pressure-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/19")) {
  errors.push("docs/TRACKING.md must record FG-16 live pressure evidence and issue mapping");
}

if (
  !waterRenderer.includes("bounded-pressure-gradient-live-v1") ||
  !waterRenderer.includes("fluidWaterPressureStepShader") ||
  !waterRenderer.includes("momentumX") ||
  !waterRenderer.includes("momentumY") ||
  !waterRenderer.includes("lastPressure") ||
  !waterRenderer.includes("waterPressureGain") ||
  !waterRenderer.includes("waterPressureImpulseEnergy") ||
  !waterRenderer.includes("waterPressureWork")
) {
  errors.push("fluidWaterRenderer.ts must implement live pressure-gradient renderer state, stats, and telemetry");
}

if (
  !remap.includes("FG-16") ||
  !remap.includes("bounded-pressure-gradient-live-v1") ||
  !remap.includes("fluidWaterPressureStepShader") ||
  !remap.includes("x/y momentum") ||
  !remap.includes("live impulse")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-16 live pressure renderer gate and evidence");
}

if (
  !fg16Evidence.includes("\"gate\": \"G-FG-16\"") ||
  !fg16Evidence.includes("\"pass\": true") ||
  !fg16Evidence.includes("\"launchMode\": \"packaged-app\"") ||
  !fg16Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg16Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg16Evidence.includes("\"pressure\": \"bounded-pressure-gradient-live-v1\"") ||
  !fg16Evidence.includes("\"pressureActive\": true") ||
  !fg16Evidence.includes("\"pressureGain\": 0.06") ||
  !fg16Evidence.includes("\"slopeLimit\": 0.34") ||
  !fg16Evidence.includes("\"momentumLimit\": 1.15") ||
  !fg16Evidence.includes("\"pressureWorkJ\"") ||
  !fg16Evidence.includes("\"impulseEnergyJ\"") ||
  !fg16Evidence.includes("\"particles\": \"localized-particle-splash-live-v1\"") ||
  !fg16Evidence.includes("\"particlesActive\": true") ||
  !fg16Evidence.includes("\"momentumX\"") ||
  !fg16Evidence.includes("\"momentumY\"") ||
  !fg16Evidence.includes("\"noFullGridReadbackPerFrame\": true")
) {
  errors.push("FG-16 evidence must record a passing packaged live pressure renderer report");
}

if (!packageJson.includes("\"fluid:live-pressure-feedback\"") || !packageJson.includes("scripts/fluid_live_pressure_feedback_report.mjs")) {
  errors.push("package.json must expose the FG-17 packaged live-pressure-feedback command");
}

if (!tracking.includes("FG-17-T03") || !tracking.includes("FG-17-pressure-feedback-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/20")) {
  errors.push("docs/TRACKING.md must record FG-17 pressure feedback evidence and issue mapping");
}

if (
  !waterRenderer.includes("verticalForceDeltaN") ||
  !waterRenderer.includes("horizontalForceDeltaN") ||
  !waterRenderer.includes("forceBoundN") ||
  !waterRenderer.includes("waterPressureVerticalForce") ||
  !waterRenderer.includes("waterPressureHorizontalForce") ||
  !waterRenderer.includes("livePressureSummaryFor")
) {
  errors.push("fluidWaterRenderer.ts must derive and expose bounded live pressure force feedback");
}

if (
  !oceanPhysicsApp.includes("__fluidGridCouplingForces") ||
  !oceanPhysicsApp.includes("pressureVerticalForceDeltaN") ||
  !oceanPhysicsApp.includes("pressureHorizontalForceDeltaN") ||
  !oceanPhysicsApp.includes("stats.lastPressure") ||
  !oceanPhysicsApp.includes("gridCouplingRef.current")
) {
  errors.push("OceanPhysicsApp.tsx must merge live pressure force feedback into the grid coupling consumed by stepSimulation");
}

if (
  !physicsOcean.includes("pressureVerticalForceDeltaN") ||
  !physicsOcean.includes("pressureHorizontalForceDeltaN") ||
  !viteEnv.includes("__fluidGridCouplingForces")
) {
  errors.push("physicsOcean.ts and vite-env.d.ts must expose pressure force diagnostics on GridFluidCouplingForces");
}

if (
  !remap.includes("FG-17") ||
  !remap.includes("window.__fluidGridCouplingForces") ||
  !remap.includes("Pressure force telemetry") ||
  !remap.includes("Consumed rigid-body coupling")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-17 pressure force feedback gate and evidence");
}

if (
  !fg17Evidence.includes("\"gate\": \"G-FG-17\"") ||
  !fg17Evidence.includes("\"pass\": true") ||
  !fg17Evidence.includes("\"launchMode\": \"packaged-app\"") ||
  !fg17Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg17Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg17Evidence.includes("\"pressure\": \"bounded-pressure-gradient-live-v1\"") ||
  !fg17Evidence.includes("\"pressureActive\": true") ||
  !fg17Evidence.includes("\"verticalForceDeltaN\"") ||
  !fg17Evidence.includes("\"horizontalForceDeltaN\"") ||
  !fg17Evidence.includes("\"forceBoundN\"") ||
  !fg17Evidence.includes("\"consumedCoupling\"") ||
  !fg17Evidence.includes("\"pressureVerticalForceDeltaN\"") ||
  !fg17Evidence.includes("\"pressureHorizontalForceDeltaN\"") ||
  !fg17Evidence.includes("\"objectCoupling\"") ||
  !fg17Evidence.includes("\"particles\": \"localized-particle-splash-live-v1\"") ||
  !fg17Evidence.includes("\"particlesActive\": true") ||
  !fg17Evidence.includes("\"noFullGridReadbackPerFrame\": true")
) {
  errors.push("FG-17 evidence must record a passing packaged pressure-informed rigid-body force feedback report");
}

if (!packageJson.includes("\"fluid:live-reference-outcomes\"") || !packageJson.includes("scripts/fluid_live_reference_outcomes_report.mjs")) {
  errors.push("package.json must expose the FG-18 packaged live-reference-outcomes command");
}

if (!tracking.includes("FG-18-T03") || !tracking.includes("FG-18-live-reference-outcomes-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/21")) {
  errors.push("docs/TRACKING.md must record FG-18 live reference outcome evidence and issue mapping");
}

if (
  !oceanPhysicsApp.includes("OceanPhysicsLiveSnapshot") ||
  !oceanPhysicsApp.includes("oceanPhysicsLiveSnapshotFor") ||
  !oceanPhysicsApp.includes("__oceanPhysicsSnapshot") ||
  !oceanPhysicsApp.includes("__oceanPhysicsScenarioControls") ||
  !oceanPhysicsApp.includes("prediction.secondsUntilSink") ||
  !oceanPhysicsApp.includes("equilibriumSubmergedFraction") ||
  !oceanPhysicsApp.includes("settledAtS") ||
  !oceanPhysicsApp.includes("sankAtS")
) {
  errors.push("OceanPhysicsApp.tsx must expose live reference-ready physics snapshots and scenario controls for FG-18");
}

if (!viteEnv.includes("__oceanPhysicsSnapshot") || !viteEnv.includes("__oceanPhysicsScenarioControls")) {
  errors.push("vite-env.d.ts must type the FG-18 live physics snapshot and scenario controls");
}

if (
  !oceanPhysicsAppTest.includes("oceanPhysicsLiveSnapshotFor") ||
  !oceanPhysicsAppTest.includes("floats-indefinitely") ||
  !oceanPhysicsAppTest.includes("impactSpeedMps")
) {
  errors.push("OceanPhysicsApp.test.tsx must cover the FG-18 live snapshot helper");
}

if (
  !liveReferenceScript.includes("G-FG-18") ||
  !liveReferenceScript.includes("live-concrete-drop-splash-pressure") ||
  !liveReferenceScript.includes("live-ice-static-draft") ||
  !liveReferenceScript.includes("live-foam-damped-settling") ||
  !liveReferenceScript.includes("live-concrete-sink-terminal-band") ||
  !liveReferenceScript.includes("live-leaky-drum-sink-time-prediction") ||
  !liveReferenceScript.includes("window.__oceanPhysicsScenarioControls") ||
  !liveReferenceScript.includes("window.__oceanPhysicsSnapshot") ||
  !liveReferenceScript.includes("noFullGridReadbackPerFrame")
) {
  errors.push("fluid_live_reference_outcomes_report.mjs must drive packaged live reference scenarios with snapshot and telemetry checks");
}

if (
  !remap.includes("FG-18") ||
  !remap.includes("window.__oceanPhysicsSnapshot") ||
  !remap.includes("live reference-outcome") ||
  !remap.includes("drop, splash, float, sink, and damping") ||
  !remap.includes("live damping equilibrium")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-18 live reference outcome gate and evidence");
}

if (
  !fg18Evidence.includes("\"gate\": \"G-FG-18\"") ||
  !fg18Evidence.includes("\"pass\": true") ||
  !fg18Evidence.includes("\"launchMode\": \"packaged-app\"") ||
  !fg18Evidence.includes("\"caseCount\": 5") ||
  !fg18Evidence.includes("\"comparisonCount\": 10") ||
  !fg18Evidence.includes("\"drop\"") ||
  !fg18Evidence.includes("\"splash\"") ||
  !fg18Evidence.includes("\"float\"") ||
  !fg18Evidence.includes("\"sink\"") ||
  !fg18Evidence.includes("\"damping\"") ||
  !fg18Evidence.includes("\"live-drop-speed-reference\"") ||
  !fg18Evidence.includes("\"live-splash-height-reference\"") ||
  !fg18Evidence.includes("\"live-ice-equilibrium-submerged-fraction-reference\"") ||
  !fg18Evidence.includes("\"live-foam-settled-draft-error\"") ||
  !fg18Evidence.includes("\"live-concrete-terminal-speed-reference\"") ||
  !fg18Evidence.includes("\"live-leaky-drum-sink-time-ratio-reference\"") ||
  !fg18Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg18Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg18Evidence.includes("\"pressureActive\": true") ||
  !fg18Evidence.includes("\"particlesActive\": true") ||
  !fg18Evidence.includes("\"noFullGridReadbackPerFrame\": true") ||
  !fg18Evidence.includes("\"fixedStepS\": 0.008333333333333333")
) {
  errors.push("FG-18 evidence must record a passing packaged live reference outcome report with all required categories and bounded telemetry");
}

if (!packageJson.includes("\"fluid:display-pacing\"") || !packageJson.includes("src/fluid/fluidDisplayPacing.report.ts")) {
  errors.push("package.json must expose the FG-19 packaged display-pacing command");
}

if (!tracking.includes("FG-19-T03") || !tracking.includes("FG-19-display-pacing-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/22")) {
  errors.push("docs/TRACKING.md must record FG-19 packaged display pacing evidence and issue mapping");
}

if (
  !oceanPhysicsApp.includes("oceanPhysicsMotionSnapshotFor") ||
  !oceanPhysicsApp.includes("liveSnapshotRef") ||
  !oceanPhysicsApp.includes("equilibriumPanelSnapshot") ||
  !oceanPhysicsApp.includes("snapshot: () => publishLiveSnapshot(simulationRef.current)")
) {
  errors.push("OceanPhysicsApp.tsx must keep full diagnostics off the per-frame display path while exposing explicit full snapshots for FG-19");
}

if (
  !displayPacing.includes("G-FG-19") ||
  !displayPacing.includes("maxP95FrameMs") ||
  !displayPacing.includes("maxLongTaskDurationMs") ||
  !displayPacing.includes("activePhysicsDurationMsFor") ||
  !displayPacing.includes("duplicateWaterFrameRatio")
) {
  errors.push("fluidDisplayPacing.ts must define the FG-19 display pacing summary thresholds");
}

if (
  !displayPacingReport.includes("idle-display-pacing") ||
  !displayPacingReport.includes("concrete-impact-display-pacing") ||
  !displayPacingReport.includes("foam-damping-display-pacing") ||
  !displayPacingReport.includes("PerformanceObserver") ||
  !displayPacingReport.includes("longtask") ||
  !displayPacingReport.includes("window.__oceanPhysicsSnapshot")
) {
  errors.push("fluidDisplayPacing.report.ts must drive packaged idle, concrete impact, and foam damping smoothness scenarios");
}

if (
  !displayPacingTest.includes("summarizeDisplayPacing") ||
  !displayPacingTest.includes("resets before sampling ends") ||
  !displayPacingTest.includes("primary WebGPU")
) {
  errors.push("fluidDisplayPacing.test.ts must cover FG-19 smoothness summary and telemetry failures");
}

if (
  !remap.includes("FG-19") ||
  !remap.includes("display-pacing") ||
  !remap.includes("foam damping") ||
  !remap.includes("no long-task stalls") ||
  !remap.includes("Packaged display pacing")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-19 packaged display pacing gate and evidence");
}

if (
  !fg19Evidence.includes("\"gate\": \"G-FG-19\"") ||
  !fg19Evidence.includes("\"pass\": true") ||
  !fg19Evidence.includes("\"launchMode\": \"packaged-app\"") ||
  !fg19Evidence.includes("\"scenarioCount\": 3") ||
  !fg19Evidence.includes("\"idle-display-pacing\"") ||
  !fg19Evidence.includes("\"concrete-impact-display-pacing\"") ||
  !fg19Evidence.includes("\"foam-damping-display-pacing\"") ||
  !fg19Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg19Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg19Evidence.includes("\"pressureActiveSeen\": true") ||
  !fg19Evidence.includes("\"longTaskDurationMs\": 0") ||
  !fg19Evidence.includes("\"maxDroppedDebtS\": 0")
) {
  errors.push("FG-19 evidence must record a passing packaged display pacing report with WebGPU telemetry and zero long-task/dropped-debt failures");
}

if (!packageJson.includes("\"fluid:resolution-scale\"") || !packageJson.includes("src/fluid/fluidResolutionScaling.report.ts")) {
  errors.push("package.json must expose the FG-20 packaged resolution-scaling command");
}

if (!tracking.includes("FG-20-T03") || !tracking.includes("FG-20-resolution-scaling-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/23")) {
  errors.push("docs/TRACKING.md must record FG-20 resolution scaling evidence and issue mapping");
}

if (
  !resolutionScaling.includes("G-FG-20") ||
  !resolutionScaling.includes("resolutionScalingTiers") ||
  !resolutionScaling.includes("\"standard\", \"high\", \"ultra\"") ||
  !resolutionScaling.includes("maxUltraToHighGpuP95Ratio") ||
  !resolutionScaling.includes("selectFluidGridTier(options.capability.limits, \"ultra\")")
) {
  errors.push("fluidResolutionScaling.ts must define the FG-20 standard/high/ultra resolution scaling gate");
}

if (
  !resolutionScalingReport.includes("G-FG-20") ||
  !resolutionScalingReport.includes("__runFluidGridBenchmark") ||
  !resolutionScalingReport.includes("__runShallowWaterBenchmark") ||
  !resolutionScalingReport.includes("__runParticleSplashBenchmark") ||
  !resolutionScalingReport.includes("resolutionScalingTiers") ||
  !resolutionScalingReport.includes("packaged-app")
) {
  errors.push("fluidResolutionScaling.report.ts must drive packaged standard/high/ultra grid, pressure, and particle benchmarks");
}

if (
  !resolutionScalingTest.includes("createFluidResolutionScalingReport") ||
  !resolutionScalingTest.includes("missing ultra") ||
  !resolutionScalingTest.includes("excessive ultra/high scaling ratios") ||
  !resolutionScalingTest.includes("GPU timestamps")
) {
  errors.push("fluidResolutionScaling.test.ts must cover FG-20 resolution scaling failures");
}

if (
  !remap.includes("FG-20") ||
  !remap.includes("resolution-scaling") ||
  !remap.includes("331,776") ||
  !remap.includes("ultra/high p95 ratios") ||
  !remap.includes("Resolution scaling")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-20 ultra-tier resolution scaling gate and evidence");
}

if (
  !fg20Evidence.includes("\"gate\": \"G-FG-20\"") ||
  !fg20Evidence.includes("\"pass\": true") ||
  !fg20Evidence.includes("\"launchMode\": \"packaged-app\"") ||
  !fg20Evidence.includes("\"tierCount\": 3") ||
  !fg20Evidence.includes("\"standard\"") ||
  !fg20Evidence.includes("\"high\"") ||
  !fg20Evidence.includes("\"ultra\"") ||
  !fg20Evidence.includes("\"cellCount\": 331776") ||
  !fg20Evidence.includes("\"particleCapacity\": 8192") ||
  !fg20Evidence.includes("\"gridGpuP95\": 2.0687679083094554") ||
  !fg20Evidence.includes("\"pressureGpuP95\": 1.0292691837508958") ||
  !fg20Evidence.includes("\"particlesGpuP95\": 1.9194666666666669") ||
  !fg20Evidence.includes("\"maxEstimatedStorageBytes\": 18841600") ||
  !fg20Evidence.includes("\"failures\": []")
) {
  errors.push("FG-20 evidence must record a passing packaged standard/high/ultra resolution scaling report with ultra timing, storage, and ratio evidence");
}

if (!packageJson.includes("\"fluid:ultra-renderer\"") || !packageJson.includes("src/fluid/fluidUltraRenderer.report.ts")) {
  errors.push("package.json must expose the FG-21 packaged ultra-renderer command");
}

if (!tracking.includes("FG-21-T03") || !tracking.includes("FG-21-ultra-renderer-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/24")) {
  errors.push("docs/TRACKING.md must record FG-21 ultra renderer evidence and issue mapping");
}

if (!electronMain.includes("OCEAN_LAB_FLUID_TIER") || !electronMain.includes("fluidTier")) {
  errors.push("electron/main.cjs must pass the FG-21 fluid tier override into the renderer URL");
}

if (
  !oceanPhysicsApp.includes("preferredFluidTierFromSearch") ||
  !oceanPhysicsApp.includes("detectFluidCapability({ preferredTier") ||
  !oceanPhysicsApp.includes("__fluidGridPreferredTier") ||
  !oceanPhysicsApp.includes("data-fluid-preferred-tier")
) {
  errors.push("OceanPhysicsApp.tsx must honor and expose the FG-21 preferred fluid tier through capability detection");
}

if (!oceanPhysicsAppTest.includes("preferredFluidTierFromSearch") || !oceanPhysicsAppTest.includes("?fluidTier=ultra")) {
  errors.push("OceanPhysicsApp.test.tsx must cover FG-21 fluid tier URL parsing");
}

if (!viteEnv.includes("__fluidGridPreferredTier")) {
  errors.push("vite-env.d.ts must type the FG-21 preferred fluid tier telemetry");
}

if (
  !ultraRenderer.includes("G-FG-21") ||
  !ultraRenderer.includes("selectedTier === \"ultra\"") ||
  !ultraRenderer.includes("768") ||
  !ultraRenderer.includes("432") ||
  !ultraRenderer.includes("display samples did not all observe ultra tier")
) {
  errors.push("fluidUltraRenderer.ts must define the FG-21 ultra live renderer gate");
}

if (
  !ultraRendererReport.includes("OCEAN_LAB_FLUID_TIER") ||
  !ultraRendererReport.includes("__fluidGridPreferredTier === \"ultra\"") ||
  !ultraRendererReport.includes("data-water-grid") ||
  !ultraRendererReport.includes("idle-ultra-display-pacing") ||
  !ultraRendererReport.includes("concrete-ultra-impact-display-pacing")
) {
  errors.push("fluidUltraRenderer.report.ts must launch and measure the packaged ultra live renderer");
}

if (
  !ultraRendererTest.includes("createFluidUltraRendererReport") ||
  !ultraRendererTest.includes("selected tier must be ultra") ||
  !ultraRendererTest.includes("display samples")
) {
  errors.push("fluidUltraRenderer.test.ts must cover FG-21 ultra renderer failure cases");
}

if (
  !remap.includes("FG-21") ||
  !remap.includes("OCEAN_LAB_FLUID_TIER=ultra") ||
  !remap.includes("Opt-in ultra renderer") ||
  !remap.includes("768 x 432") ||
  !remap.includes("concrete-impact ultra")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-21 opt-in ultra live renderer gate and evidence");
}

if (
  !fg21Evidence.includes("\"gate\": \"G-FG-21\"") ||
  !fg21Evidence.includes("\"pass\": true") ||
  !fg21Evidence.includes("\"launchMode\": \"packaged-app\"") ||
  !fg21Evidence.includes("\"preferredTier\": \"ultra\"") ||
  !fg21Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg21Evidence.includes("\"cellsX\": 768") ||
  !fg21Evidence.includes("\"cellsY\": 432") ||
  !fg21Evidence.includes("\"idle-ultra-display-pacing\"") ||
  !fg21Evidence.includes("\"concrete-ultra-impact-display-pacing\"") ||
  !fg21Evidence.includes("\"particlesActiveSeen\": true") ||
  !fg21Evidence.includes("\"pressureActiveSeen\": true") ||
  !fg21Evidence.includes("\"couplingActiveSeen\": true") ||
  !fg21Evidence.includes("\"worstDroppedFrameRatio\": 0")
) {
  errors.push("FG-21 evidence must record a passing packaged ultra live renderer report with smooth display pacing and active drop telemetry");
}

if (!packageJson.includes("\"fluid:ultra-reference-outcomes\"") || !packageJson.includes("src/fluid/fluidUltraReferenceOutcomes.report.ts")) {
  errors.push("package.json must expose the FG-22 packaged ultra-reference-outcomes command");
}

if (!tracking.includes("FG-22-T03") || !tracking.includes("FG-22-ultra-reference-outcomes-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/25")) {
  errors.push("docs/TRACKING.md must record FG-22 ultra reference outcome evidence and issue mapping");
}

if (
  !contract.includes("FG-22") ||
  !contract.includes("G-FG-22") ||
  !contract.includes("Ultra-tier live reference outcome gate") ||
  !contract.includes("npm run fluid:ultra-reference-outcomes")
) {
  errors.push("fluidGridContract.ts must define the FG-22 ultra reference outcome milestone, gate, and evidence command");
}

if (
  !ultraReferenceOutcomes.includes("G-FG-22") ||
  !ultraReferenceOutcomes.includes("requiredComparisonIds") ||
  !ultraReferenceOutcomes.includes("selected tier must be ultra") ||
  !ultraReferenceOutcomes.includes("combined grid coupling never became active") ||
  !ultraReferenceOutcomes.includes("frame loop for")
) {
  errors.push("fluidUltraReferenceOutcomes.ts must define the FG-22 ultra reference outcome gate and failure checks");
}

if (
  !ultraReferenceOutcomesReport.includes("OCEAN_LAB_FLUID_TIER") ||
  !ultraReferenceOutcomesReport.includes("window.__fluidGridPreferredTier === \"ultra\"") ||
  !ultraReferenceOutcomesReport.includes("data-water-grid") ||
  !ultraReferenceOutcomesReport.includes("live-concrete-drop-splash-pressure") ||
  !ultraReferenceOutcomesReport.includes("live-leaky-drum-sink-time-ratio-reference")
) {
  errors.push("fluidUltraReferenceOutcomes.report.ts must launch the packaged ultra renderer and drive the live reference scenarios");
}

if (
  !ultraReferenceOutcomesTest.includes("createFluidUltraReferenceOutcomesReport") ||
  !ultraReferenceOutcomesTest.includes("rejects a high-tier live replay") ||
  !ultraReferenceOutcomesTest.includes("particle splash feedback never became active")
) {
  errors.push("fluidUltraReferenceOutcomes.test.ts must cover FG-22 pass and failure cases");
}

if (
  !remap.includes("FG-22") ||
  !remap.includes("Ultra-tier live reference") ||
  !remap.includes("fluid:ultra-reference-outcomes") ||
  !remap.includes("drop, splash, float, sink, and damping")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-22 ultra live reference outcome gate and evidence");
}

if (
  !fg22Evidence.includes("\"gate\": \"G-FG-22\"") ||
  !fg22Evidence.includes("\"pass\": true") ||
  !fg22Evidence.includes("\"launchMode\": \"packaged-app\"") ||
  !fg22Evidence.includes("\"preferredTier\": \"ultra\"") ||
  !fg22Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg22Evidence.includes("\"cellsX\": 768") ||
  !fg22Evidence.includes("\"cellsY\": 432") ||
  !fg22Evidence.includes("\"liveGrid\": \"768x432\"") ||
  !fg22Evidence.includes("\"caseCount\": 5") ||
  !fg22Evidence.includes("\"comparisonCount\": 10") ||
  !fg22Evidence.includes("\"live-drop-speed-reference\"") ||
  !fg22Evidence.includes("\"live-splash-height-reference\"") ||
  !fg22Evidence.includes("\"live-foam-settled-buoyancy-error\"") ||
  !fg22Evidence.includes("\"live-leaky-drum-sink-time-ratio-reference\"") ||
  !fg22Evidence.includes("\"particlesActive\": true") ||
  !fg22Evidence.includes("\"pressureActive\": true") ||
  !fg22Evidence.includes("\"noFullGridReadbackPerFrame\": true") ||
  !fg22Evidence.includes("\"failures\": []")
) {
  errors.push("FG-22 evidence must record a passing packaged ultra live reference outcome report with reference comparisons and active WebGPU telemetry");
}

if (!packageJson.includes("\"fluid:adaptive-tier\"") || !packageJson.includes("src/fluid/fluidAdaptiveTier.report.ts")) {
  errors.push("package.json must expose the FG-23 packaged adaptive-tier command");
}

if (!tracking.includes("FG-23-T03") || !tracking.includes("FG-23-adaptive-tier-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/26")) {
  errors.push("docs/TRACKING.md must record FG-23 adaptive tier evidence and issue mapping");
}

if (
  !contract.includes("FG-23") ||
  !contract.includes("G-FG-23") ||
  !contract.includes("Adaptive local GPU tier calibration selector") ||
  !contract.includes("npm run fluid:adaptive-tier")
) {
  errors.push("fluidGridContract.ts must define the FG-23 adaptive tier milestone, gate, and evidence command");
}

if (!electronMain.includes("OCEAN_LAB_CALIBRATED_FLUID_TIER") || !electronMain.includes("calibratedFluidTier") || !electronMain.includes("fluidTierQueryObject")) {
  errors.push("electron/main.cjs must forward the FG-23 calibrated auto tier query into the renderer");
}

if (
  !oceanPhysicsApp.includes("fluidRuntimeTierSelectionFromSearch") ||
  !oceanPhysicsApp.includes("__fluidGridTierSelection") ||
  !oceanPhysicsApp.includes("data-fluid-tier-selection-mode") ||
  !oceanPhysicsApp.includes("data-fluid-tier-requested")
) {
  errors.push("OceanPhysicsApp.tsx must expose the FG-23 adaptive tier selection telemetry");
}

if (!oceanPhysicsAppTest.includes("runtimeFluidTierSelectionFromSearch") || !oceanPhysicsAppTest.includes("calibrated-auto") || !oceanPhysicsAppTest.includes("default-high")) {
  errors.push("OceanPhysicsApp.test.tsx must cover FG-23 adaptive tier URL parsing");
}

if (!viteEnv.includes("__fluidGridTierSelection")) {
  errors.push("vite-env.d.ts must type the FG-23 adaptive tier telemetry");
}

if (
  !adaptiveTier.includes("G-FG-23") ||
  !adaptiveTier.includes("fluidRuntimeTierSelectionFromSearch") ||
  !adaptiveTier.includes("recommendAdaptiveFluidTier") ||
  !adaptiveTier.includes("explicit tier override") ||
  !adaptiveTier.includes("calibrated-auto") ||
  !adaptiveTier.includes("ultra has measured local headroom")
) {
  errors.push("fluidAdaptiveTier.ts must define FG-23 adaptive selection and recommendation logic");
}

if (
  !adaptiveTierReport.includes("OCEAN_LAB_FLUID_TIER") ||
  !adaptiveTierReport.includes("OCEAN_LAB_CALIBRATED_FLUID_TIER") ||
  !adaptiveTierReport.includes("window.__fluidGridTierSelection?.mode === \"calibrated-auto\"") ||
  !adaptiveTierReport.includes("FG-20-resolution-scaling") ||
  !adaptiveTierReport.includes("FG-22-ultra-reference-outcomes")
) {
  errors.push("fluidAdaptiveTier.report.ts must compose prior evidence and probe the packaged calibrated-auto runtime path");
}

if (
  !adaptiveTierTest.includes("explicit tier overrides") ||
  !adaptiveTierTest.includes("calibrated tier") ||
  !adaptiveTierTest.includes("rejects ultra auto promotion") ||
  !adaptiveTierTest.includes("G-FG-23")
) {
  errors.push("fluidAdaptiveTier.test.ts must cover FG-23 adaptive tier pass and failure cases");
}

if (
  !remap.includes("FG-23") ||
  !remap.includes("adaptive-tier") ||
  !remap.includes("calibrated-auto") ||
  !remap.includes("max ultra GPU p95 step")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-23 adaptive tier gate and evidence");
}

if (
  !fg23Evidence.includes("\"gate\": \"G-FG-23\"") ||
  !fg23Evidence.includes("\"pass\": true") ||
  !fg23Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg23Evidence.includes("\"reason\": \"ultra has measured local headroom and live reference parity\"") ||
  !fg23Evidence.includes("\"maxUltraGpuP95StepMs\": 0.09025") ||
  !fg23Evidence.includes("\"maxUltraToHighGpuP95Ratio\": 2.0687679083094554") ||
  !fg23Evidence.includes("\"maxLiveP95FrameMs\": 9.300000000000182") ||
  !fg23Evidence.includes("\"requestedTier\": \"auto\"") ||
  !fg23Evidence.includes("\"mode\": \"calibrated-auto\"") ||
  !fg23Evidence.includes("\"grid\": \"768x432\"") ||
  !fg23Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg23Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg23Evidence.includes("\"failures\": []")
) {
  errors.push("FG-23 evidence must record a passing packaged calibrated-auto adaptive tier report");
}

if (!packageJson.includes("\"fluid:persisted-calibration\"") || !packageJson.includes("src/fluid/fluidPersistedCalibration.report.ts")) {
  errors.push("package.json must expose the FG-24 packaged persisted-calibration command");
}

if (!tracking.includes("FG-24-T03") || !tracking.includes("FG-24-persisted-calibration-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/27")) {
  errors.push("docs/TRACKING.md must record FG-24 persisted calibration evidence and issue mapping");
}

if (
  !contract.includes("FG-24") ||
  !contract.includes("G-FG-24") ||
  !contract.includes("Persisted local calibration profile runtime gate") ||
  !contract.includes("npm run fluid:persisted-calibration")
) {
  errors.push("fluidGridContract.ts must define the FG-24 persisted calibration milestone, gate, and evidence command");
}

if (
  !electronStorage.includes("fluidCalibrationProfile") ||
  !electronStorage.includes("fluid-calibration.v1.json") ||
  !electronStorageTest.includes("fluidCalibrationProfile") ||
  !desktopStorageSmoke.includes("fluidCalibrationProfile")
) {
  errors.push("Electron storage must allowlist and test the FG-24 fluid calibration profile file");
}

if (
  !electronMain.includes("calibratedFluidTierFromStorage") ||
  !electronMain.includes("desktopStorageFiles.fluidCalibrationProfile") ||
  !electronMain.includes("ocean-fluid-calibration-profile-v1") ||
  !electronMain.includes("calibrationProfileFailures(profile, app.getVersion())") ||
  !electronMain.includes("!requestedFluidTier && calibratedFluidTier ? \"auto\"")
) {
  errors.push("electron/main.cjs must read and validate the FG-24 persisted calibration profile at startup");
}

if (
  !persistedCalibration.includes("G-FG-24") ||
  !persistedCalibration.includes("calibrationProfileForAdaptiveReport") ||
  !persistedCalibration.includes("ocean-fluid-calibration-profile-v1") ||
  !persistedCalibration.includes("OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent")
) {
  errors.push("fluidPersistedCalibration.ts must define the FG-24 persisted calibration profile and gate checks");
}

if (
  !persistedCalibrationReport.includes("desktopStorageFiles.fluidCalibrationProfile") ||
  !persistedCalibrationReport.includes("delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER") ||
  !persistedCalibrationReport.includes("window.__fluidGridTierSelection?.mode === \"calibrated-auto\"") ||
  !persistedCalibrationReport.includes("FG-23-adaptive-tier")
) {
  errors.push("fluidPersistedCalibration.report.ts must write the stored profile and prove packaged startup reads it without calibrated env");
}

if (
  !persistedCalibrationTest.includes("env calibrated tier") ||
  !persistedCalibrationTest.includes("saved profile") ||
  !persistedCalibrationTest.includes("G-FG-24") ||
  !persistedCalibrationTest.includes("auto-fallback-high")
) {
  errors.push("fluidPersistedCalibration.test.ts must cover FG-24 pass and failure cases");
}

if (
  !remap.includes("FG-24") ||
  !remap.includes("persisted-calibration") ||
  !remap.includes("fluid-calibration.v1.json") ||
  !remap.includes("no\n  `OCEAN_LAB_CALIBRATED_FLUID_TIER`")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-24 persisted calibration gate and evidence");
}

if (
  !fg24Evidence.includes("\"gate\": \"G-FG-24\"") ||
  !fg24Evidence.includes("\"pass\": true") ||
  !fg24Evidence.includes("\"schema\": \"ocean-fluid-calibration-profile-v1\"") ||
  !fg24Evidence.includes("\"sourceGate\": \"G-FG-23\"") ||
  !fg24Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg24Evidence.includes("\"envCalibratedTierPresent\": false") ||
  !fg24Evidence.includes("\"fileName\": \"fluid-calibration.v1.json\"") ||
  !fg24Evidence.includes("\"readByMainProcess\": true") ||
  !fg24Evidence.includes("\"requestedTier\": \"auto\"") ||
  !fg24Evidence.includes("\"mode\": \"calibrated-auto\"") ||
  !fg24Evidence.includes("\"grid\": \"768x432\"") ||
  !fg24Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg24Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg24Evidence.includes("\"failures\": []")
) {
  errors.push("FG-24 evidence must record a passing packaged persisted calibration report with no calibrated env tier");
}

if (!packageJson.includes("\"fluid:installed-calibration\"") || !packageJson.includes("src/fluid/fluidInstalledCalibration.report.ts")) {
  errors.push("package.json must expose the FG-25 packaged installed-calibration command");
}

if (!tracking.includes("FG-25-T03") || !tracking.includes("FG-25-installed-calibration-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/28")) {
  errors.push("docs/TRACKING.md must record FG-25 installed calibration evidence and issue mapping");
}

if (
  !contract.includes("FG-25") ||
  !contract.includes("G-FG-25") ||
  !contract.includes("Installed local calibration profile reuse gate") ||
  !contract.includes("npm run fluid:installed-calibration")
) {
  errors.push("fluidGridContract.ts must define the FG-25 installed calibration milestone, gate, and evidence command");
}

if (
  !installedCalibration.includes("G-FG-25") ||
  !installedCalibration.includes("installFluidCalibrationProfile") ||
  !installedCalibration.includes("verificationReadMatched") ||
  !installedCalibration.includes("OCEAN_LAB_FLUID_TIER must be absent") ||
  !installedCalibration.includes("relaunchProbe") ||
  !installedCalibration.includes("harborline-game")
) {
  errors.push("fluidInstalledCalibration.ts must define the FG-25 installer receipt and reuse gate checks");
}

if (
  !installedCalibrationReport.includes("desktopStorageFiles.fluidCalibrationProfile") ||
  !installedCalibrationReport.includes("delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER") ||
  !installedCalibrationReport.includes("delete launchEnv.OCEAN_LAB_FLUID_TIER") ||
  !installedCalibrationReport.includes("launchAndProbe") ||
  !installedCalibrationReport.includes("FG-23-adaptive-tier") ||
  !installedCalibrationReport.includes("window.__fluidGridTierSelection?.mode === \"calibrated-auto\"")
) {
  errors.push("fluidInstalledCalibration.report.ts must install the profile and prove two packaged env-free calibrated-auto launches");
}

if (
  !installedCalibrationTest.includes("installed profile") ||
  !installedCalibrationTest.includes("env-provided tier") ||
  !installedCalibrationTest.includes("fallback-high") ||
  !installedCalibrationTest.includes("G-FG-25") ||
  !installedCalibrationTest.includes("did not round-trip")
) {
  errors.push("fluidInstalledCalibration.test.ts must cover FG-25 pass and failure cases");
}

if (
  !remap.includes("FG-25") ||
  !remap.includes("installed-calibration") ||
  !remap.includes("fluid-calibration.v1.json") ||
  !remap.includes("two clean packaged launches") ||
  !remap.includes("no `OCEAN_LAB_FLUID_TIER`")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-25 installed calibration gate and evidence");
}

if (
  !fg25Evidence.includes("\"gate\": \"G-FG-25\"") ||
  !fg25Evidence.includes("\"pass\": true") ||
  !fg25Evidence.includes("\"fileName\": \"fluid-calibration.v1.json\"") ||
  !fg25Evidence.includes("\"sourceGate\": \"G-FG-23\"") ||
  !fg25Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg25Evidence.includes("\"verificationReadMatched\": true") ||
  !fg25Evidence.includes("\"envCalibratedTierPresent\": false") ||
  !fg25Evidence.includes("\"envRequestedTierPresent\": false") ||
  !fg25Evidence.includes("\"reusedByMainProcess\": true") ||
  !fg25Evidence.includes("\"requestedTier\": \"auto\"") ||
  !fg25Evidence.includes("\"mode\": \"calibrated-auto\"") ||
  !fg25Evidence.includes("\"grid\": \"768x432\"") ||
  !fg25Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg25Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg25Evidence.includes("\"failures\": []")
) {
  errors.push("FG-25 evidence must record a passing packaged installed calibration report with env-free profile reuse");
}

if (!packageJson.includes("\"fluid:installed-display-pacing\"") || !packageJson.includes("src/fluid/fluidInstalledDisplayPacing.report.ts")) {
  errors.push("package.json must expose the FG-26 packaged installed-display-pacing command");
}

if (!tracking.includes("FG-26-T03") || !tracking.includes("FG-26-installed-display-pacing-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/29")) {
  errors.push("docs/TRACKING.md must record FG-26 installed display pacing evidence and issue mapping");
}

if (
  !contract.includes("FG-26") ||
  !contract.includes("G-FG-26") ||
  !contract.includes("Installed calibration display pacing gate") ||
  !contract.includes("npm run fluid:installed-display-pacing")
) {
  errors.push("fluidGridContract.ts must define the FG-26 installed display pacing milestone, gate, and evidence command");
}

if (
  !installedDisplayPacing.includes("G-FG-26") ||
  !installedDisplayPacing.includes("createFluidDisplayPacingReport") ||
  !installedDisplayPacing.includes("calibrated-auto") ||
  !installedDisplayPacing.includes("display samples did not all observe calibrated-auto") ||
  !installedDisplayPacing.includes("OCEAN_LAB_FLUID_TIER must be absent") ||
  !installedDisplayPacing.includes("idle-installed-display-pacing")
) {
  errors.push("fluidInstalledDisplayPacing.ts must define the FG-26 installed-profile display pacing checks");
}

if (
  !installedDisplayPacingReport.includes("installFluidCalibrationProfile") ||
  !installedDisplayPacingReport.includes("desktopStorageFiles.fluidCalibrationProfile") ||
  !installedDisplayPacingReport.includes("delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER") ||
  !installedDisplayPacingReport.includes("delete launchEnv.OCEAN_LAB_FLUID_TIER") ||
  !installedDisplayPacingReport.includes("window.__fluidGridTierSelection?.mode === \"calibrated-auto\"") ||
  !installedDisplayPacingReport.includes("concrete-installed-impact-display-pacing") ||
  !installedDisplayPacingReport.includes("foam-installed-damping-display-pacing")
) {
  errors.push("fluidInstalledDisplayPacing.report.ts must install the profile and sample env-free calibrated-auto display pacing scenarios");
}

if (
  !installedDisplayPacingTest.includes("env-provided tier") ||
  !installedDisplayPacingTest.includes("fallback-high") ||
  !installedDisplayPacingTest.includes("choppy") ||
  !installedDisplayPacingTest.includes("G-FG-26") ||
  !installedDisplayPacingTest.includes("display samples did not all observe calibrated-auto")
) {
  errors.push("fluidInstalledDisplayPacing.test.ts must cover FG-26 pass and failure cases");
}

if (
  !remap.includes("FG-26") ||
  !remap.includes("installed-display-pacing") ||
  !remap.includes("calibrated-auto ultra samples") ||
  !remap.includes("no `OCEAN_LAB_FLUID_TIER`") ||
  !remap.includes("long-task telemetry")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-26 installed display pacing gate and evidence");
}

if (
  !fg26Evidence.includes("\"gate\": \"G-FG-26\"") ||
  !fg26Evidence.includes("\"pass\": true") ||
  !fg26Evidence.includes("\"fileName\": \"fluid-calibration.v1.json\"") ||
  !fg26Evidence.includes("\"sourceGate\": \"G-FG-23\"") ||
  !fg26Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg26Evidence.includes("\"verificationReadMatched\": true") ||
  !fg26Evidence.includes("\"envCalibratedTierPresent\": false") ||
  !fg26Evidence.includes("\"envRequestedTierPresent\": false") ||
  !fg26Evidence.includes("\"reusedByMainProcess\": true") ||
  !fg26Evidence.includes("\"requestedTier\": \"auto\"") ||
  !fg26Evidence.includes("\"mode\": \"calibrated-auto\"") ||
  !fg26Evidence.includes("\"selectedGrid\"") ||
  !fg26Evidence.includes("\"cellsX\": 768") ||
  !fg26Evidence.includes("\"cellsY\": 432") ||
  !fg26Evidence.includes("\"idle-installed-display-pacing\"") ||
  !fg26Evidence.includes("\"concrete-installed-impact-display-pacing\"") ||
  !fg26Evidence.includes("\"foam-installed-damping-display-pacing\"") ||
  !fg26Evidence.includes("\"tierSelectionMode\": \"calibrated-auto\"") ||
  !fg26Evidence.includes("\"capabilityGrid\": \"768x432\"") ||
  !fg26Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg26Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg26Evidence.includes("\"stability\": \"smooth\"") ||
  !fg26Evidence.includes("\"failures\": []")
) {
  errors.push("FG-26 evidence must record a passing packaged installed-profile display pacing report with calibrated-auto ultra samples");
}

if (!packageJson.includes("\"fluid:calibration-freshness\"") || !packageJson.includes("src/fluid/fluidCalibrationFreshness.report.ts")) {
  errors.push("package.json must expose the FG-27 packaged calibration-freshness command");
}

if (!tracking.includes("FG-27-T03") || !tracking.includes("FG-27-calibration-freshness-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/30")) {
  errors.push("docs/TRACKING.md must record FG-27 calibration freshness evidence and issue mapping");
}

if (
  !contract.includes("FG-27") ||
  !contract.includes("G-FG-27") ||
  !contract.includes("Calibration profile freshness invalidation gate") ||
  !contract.includes("npm run fluid:calibration-freshness")
) {
  errors.push("fluidGridContract.ts must define the FG-27 calibration freshness milestone, gate, and evidence command");
}

if (
  !persistedCalibration.includes("appVersion") ||
  !persistedCalibration.includes("source:") ||
  !persistedCalibration.includes("validateFluidCalibrationProfile") ||
  !persistedCalibration.includes("profile appVersion") ||
  !persistedCalibration.includes("profile source tier")
) {
  errors.push("fluidPersistedCalibration.ts must write and validate FG-27 profile provenance");
}

if (
  !electronMain.includes("calibrationProfileFailures") ||
  !electronMain.includes("app.getVersion()") ||
  !electronMain.includes("profile?.appVersion === expectedAppVersion") ||
  !electronMain.includes("profile?.source?.adaptiveGate === \"G-FG-23\"") ||
  !electronMain.includes("profile source tier did not match selected tier")
) {
  errors.push("electron/main.cjs must reject stale or malformed calibration profiles before setting calibratedFluidTier");
}

if (
  !calibrationFreshness.includes("G-FG-27") ||
  !calibrationFreshness.includes("validProfileReusedByMainProcess") ||
  !calibrationFreshness.includes("staleProfileRejectedByMainProcess") ||
  !calibrationFreshness.includes("stale profile must fail appVersion validation") ||
  !calibrationFreshness.includes("default-high")
) {
  errors.push("fluidCalibrationFreshness.ts must define valid-profile reuse and stale-profile fallback checks");
}

if (
  !calibrationFreshnessReport.includes("calibrationProfileForAdaptiveReport") ||
  !calibrationFreshnessReport.includes("appVersion: \"0.0.0-stale\"") ||
  !calibrationFreshnessReport.includes("expectedMode: \"calibrated-auto\"") ||
  !calibrationFreshnessReport.includes("expectedMode: \"default-high\"") ||
  !calibrationFreshnessReport.includes("delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER") ||
  !calibrationFreshnessReport.includes("delete launchEnv.OCEAN_LAB_FLUID_TIER")
) {
  errors.push("fluidCalibrationFreshness.report.ts must prove current-profile reuse and stale-profile fallback without fluid-tier env vars");
}

if (
  !calibrationFreshnessTest.includes("current profile is reused") ||
  !calibrationFreshnessTest.includes("environment tier inputs") ||
  !calibrationFreshnessTest.includes("stale profile that still reaches calibrated-auto ultra") ||
  !calibrationFreshnessTest.includes("G-FG-27")
) {
  errors.push("fluidCalibrationFreshness.test.ts must cover FG-27 pass and failure cases");
}

if (
  !remap.includes("FG-27") ||
  !remap.includes("calibration-freshness") ||
  !remap.includes("wrong-app-version") ||
  !remap.includes("default-high") ||
  !remap.includes("stale profiles")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-27 calibration freshness gate and evidence");
}

if (
  !fg27Evidence.includes("\"gate\": \"G-FG-27\"") ||
  !fg27Evidence.includes("\"pass\": true") ||
  !fg27Evidence.includes("\"expectedAppVersion\": \"0.1.0\"") ||
  !fg27Evidence.includes("\"appVersion\": \"0.1.0\"") ||
  !fg27Evidence.includes("\"appVersion\": \"0.0.0-stale\"") ||
  !fg27Evidence.includes("\"validationFailures\": []") ||
  !fg27Evidence.includes("profile appVersion 0.0.0-stale did not match runtime 0.1.0") ||
  !fg27Evidence.includes("\"envCalibratedTierPresent\": false") ||
  !fg27Evidence.includes("\"envRequestedTierPresent\": false") ||
  !fg27Evidence.includes("\"validProfileReusedByMainProcess\": true") ||
  !fg27Evidence.includes("\"staleProfileRejectedByMainProcess\": true") ||
  !fg27Evidence.includes("\"mode\": \"calibrated-auto\"") ||
  !fg27Evidence.includes("\"mode\": \"default-high\"") ||
  !fg27Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg27Evidence.includes("\"selectedTier\": \"high\"") ||
  !fg27Evidence.includes("\"grid\": \"768x432\"") ||
  !fg27Evidence.includes("\"grid\": \"512x288\"") ||
  !fg27Evidence.includes("\"failures\": []")
) {
  errors.push("FG-27 evidence must record a passing packaged calibration freshness report with stale-profile fallback");
}

if (errors.length > 0) {
  console.error("Fluid remap tracking check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Fluid remap tracking check passed: ${milestoneIds.length} milestones, ${gateIds.length} gates, ${requiredFiles.length} files.`);
