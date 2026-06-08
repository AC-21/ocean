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
  "docs/evidence/FG-28-calibration-provenance-2026-06-08.json",
  "docs/evidence/FG-29-sustained-interaction-pacing-2026-06-08.json",
  "docs/evidence/FG-30-package-reproducibility-2026-06-08.json",
  "docs/evidence/FG-31-impact-energy-budget-2026-06-08.json",
  "docs/evidence/FG-32-surface-recovery-2026-06-08.json",
  "docs/evidence/FG-33-desktop-launcher-2026-06-08.json",
  "docs/evidence/FG-34-default-profile-calibration-2026-06-08.json",
  "docs/evidence/FG-35-desktop-visibility-2026-06-08.json",
  "data/fluid-reference-cases.json",
  ".github/ISSUE_TEMPLATE/fluid_grid_task.yml",
  ".github/ISSUE_TEMPLATE/fluid_grid_gate.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "electron/main.cjs",
  "electron/storage.cjs",
  "electron/storage.test.mjs",
  "package.json",
  "scripts/desktop_storage_smoke.mjs",
  "scripts/electron_zip_cache.mjs",
  "scripts/electron_zip_cache.test.mjs",
  "scripts/fluid_live_reference_outcomes_report.mjs",
  "scripts/package_mac.mjs",
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
  "src/fluid/fluidCalibrationProvenance.ts",
  "src/fluid/fluidCalibrationProvenance.report.ts",
  "src/fluid/fluidCalibrationProvenance.test.ts",
  "src/fluid/fluidSustainedInteractionPacing.ts",
  "src/fluid/fluidSustainedInteractionPacing.report.ts",
  "src/fluid/fluidSustainedInteractionPacing.test.ts",
  "src/fluid/fluidPackageReproducibility.ts",
  "src/fluid/fluidPackageReproducibility.report.ts",
  "src/fluid/fluidPackageReproducibility.test.ts",
  "src/fluid/fluidImpactEnergyBudget.ts",
  "src/fluid/fluidImpactEnergyBudget.report.ts",
  "src/fluid/fluidImpactEnergyBudget.test.ts",
  "src/fluid/fluidSurfaceRecovery.ts",
  "src/fluid/fluidSurfaceRecovery.report.ts",
  "src/fluid/fluidSurfaceRecovery.test.ts",
  "src/fluid/fluidDesktopLauncher.ts",
  "src/fluid/fluidDesktopLauncher.report.ts",
  "src/fluid/fluidDesktopLauncher.test.ts",
  "src/fluid/fluidDefaultProfileCalibration.ts",
  "src/fluid/fluidDefaultProfileCalibration.report.ts",
  "src/fluid/fluidDefaultProfileCalibration.test.ts",
  "src/fluid/fluidDesktopVisibility.ts",
  "src/fluid/fluidDesktopVisibility.report.ts",
  "src/fluid/fluidDesktopVisibility.test.ts",
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

const milestoneIds = ["FG-00", "FG-01", "FG-02", "FG-03", "FG-04", "FG-05", "FG-06", "FG-07", "FG-08", "FG-09", "FG-10", "FG-11", "FG-12", "FG-13", "FG-14", "FG-15", "FG-16", "FG-17", "FG-18", "FG-19", "FG-20", "FG-21", "FG-22", "FG-23", "FG-24", "FG-25", "FG-26", "FG-27", "FG-28", "FG-29", "FG-30", "FG-31", "FG-32", "FG-33", "FG-34", "FG-35"];
const gateIds = ["G-FG-00", "G-FG-01", "G-FG-02", "G-FG-03", "G-FG-04", "G-FG-05", "G-FG-06", "G-FG-07", "G-FG-08", "G-FG-09", "G-FG-10", "G-FG-11", "G-FG-12", "G-FG-13", "G-FG-14", "G-FG-15", "G-FG-16", "G-FG-17", "G-FG-18", "G-FG-19", "G-FG-20", "G-FG-21", "G-FG-22", "G-FG-23", "G-FG-24", "G-FG-25", "G-FG-26", "G-FG-27", "G-FG-28", "G-FG-29", "G-FG-30", "G-FG-31", "G-FG-32", "G-FG-33", "G-FG-34", "G-FG-35"];

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
const electronZipCache = files.get("scripts/electron_zip_cache.mjs") ?? "";
const electronZipCacheTest = files.get("scripts/electron_zip_cache.test.mjs") ?? "";
const liveReferenceScript = files.get("scripts/fluid_live_reference_outcomes_report.mjs") ?? "";
const packageMac = files.get("scripts/package_mac.mjs") ?? "";
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
const calibrationProvenance = files.get("src/fluid/fluidCalibrationProvenance.ts") ?? "";
const calibrationProvenanceReport = files.get("src/fluid/fluidCalibrationProvenance.report.ts") ?? "";
const calibrationProvenanceTest = files.get("src/fluid/fluidCalibrationProvenance.test.ts") ?? "";
const sustainedInteractionPacing = files.get("src/fluid/fluidSustainedInteractionPacing.ts") ?? "";
const sustainedInteractionPacingReport = files.get("src/fluid/fluidSustainedInteractionPacing.report.ts") ?? "";
const sustainedInteractionPacingTest = files.get("src/fluid/fluidSustainedInteractionPacing.test.ts") ?? "";
const packageReproducibility = files.get("src/fluid/fluidPackageReproducibility.ts") ?? "";
const packageReproducibilityReport = files.get("src/fluid/fluidPackageReproducibility.report.ts") ?? "";
const packageReproducibilityTest = files.get("src/fluid/fluidPackageReproducibility.test.ts") ?? "";
const impactEnergyBudget = files.get("src/fluid/fluidImpactEnergyBudget.ts") ?? "";
const impactEnergyBudgetReport = files.get("src/fluid/fluidImpactEnergyBudget.report.ts") ?? "";
const impactEnergyBudgetTest = files.get("src/fluid/fluidImpactEnergyBudget.test.ts") ?? "";
const surfaceRecovery = files.get("src/fluid/fluidSurfaceRecovery.ts") ?? "";
const surfaceRecoveryReport = files.get("src/fluid/fluidSurfaceRecovery.report.ts") ?? "";
const surfaceRecoveryTest = files.get("src/fluid/fluidSurfaceRecovery.test.ts") ?? "";
const desktopLauncher = files.get("src/fluid/fluidDesktopLauncher.ts") ?? "";
const desktopLauncherReport = files.get("src/fluid/fluidDesktopLauncher.report.ts") ?? "";
const desktopLauncherTest = files.get("src/fluid/fluidDesktopLauncher.test.ts") ?? "";
const defaultProfileCalibration = files.get("src/fluid/fluidDefaultProfileCalibration.ts") ?? "";
const defaultProfileCalibrationReport = files.get("src/fluid/fluidDefaultProfileCalibration.report.ts") ?? "";
const defaultProfileCalibrationTest = files.get("src/fluid/fluidDefaultProfileCalibration.test.ts") ?? "";
const desktopVisibility = files.get("src/fluid/fluidDesktopVisibility.ts") ?? "";
const desktopVisibilityReport = files.get("src/fluid/fluidDesktopVisibility.report.ts") ?? "";
const desktopVisibilityTest = files.get("src/fluid/fluidDesktopVisibility.test.ts") ?? "";
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
const fg28Evidence = files.get("docs/evidence/FG-28-calibration-provenance-2026-06-08.json") ?? "";
const fg29Evidence = files.get("docs/evidence/FG-29-sustained-interaction-pacing-2026-06-08.json") ?? "";
const fg30Evidence = files.get("docs/evidence/FG-30-package-reproducibility-2026-06-08.json") ?? "";
const fg31Evidence = files.get("docs/evidence/FG-31-impact-energy-budget-2026-06-08.json") ?? "";
const fg32Evidence = files.get("docs/evidence/FG-32-surface-recovery-2026-06-08.json") ?? "";
const fg33Evidence = files.get("docs/evidence/FG-33-desktop-launcher-2026-06-08.json") ?? "";
const fg34Evidence = files.get("docs/evidence/FG-34-default-profile-calibration-2026-06-08.json") ?? "";
const fg35Evidence = files.get("docs/evidence/FG-35-desktop-visibility-2026-06-08.json") ?? "";
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
  !electronMain.includes("calibratedFluidCalibrationFromStorage") ||
  !electronMain.includes("desktopStorageFiles.fluidCalibrationProfile") ||
  !electronMain.includes("ocean-fluid-calibration-profile-v1") ||
  !electronMain.includes("calibrationProfileFailures(profile, app.getVersion())") ||
  !electronMain.includes("!requestedFluidTier && calibratedFluidTier ? \"auto\"") ||
  !electronMain.includes("calibratedFluidFingerprint")
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

if (!packageJson.includes("\"fluid:calibration-provenance\"") || !packageJson.includes("src/fluid/fluidCalibrationProvenance.report.ts")) {
  errors.push("package.json must expose the FG-28 packaged calibration-provenance command");
}

if (!tracking.includes("FG-28-T03") || !tracking.includes("FG-28-calibration-provenance-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/31")) {
  errors.push("docs/TRACKING.md must record FG-28 calibration provenance evidence and issue mapping");
}

if (
  !contract.includes("FG-28") ||
  !contract.includes("G-FG-28") ||
  !contract.includes("Calibration profile hardware provenance gate") ||
  !contract.includes("npm run fluid:calibration-provenance")
) {
  errors.push("fluidGridContract.ts must define the FG-28 calibration provenance milestone, gate, and evidence command");
}

if (
  !persistedCalibration.includes("capabilityProvenanceForReport") ||
  !persistedCalibration.includes("capabilityProvenanceFailures") ||
  !persistedCalibration.includes("profile capability fingerprint") ||
  !persistedCalibration.includes("G-FG-01")
) {
  errors.push("fluidPersistedCalibration.ts must write and validate FG-28 WebGPU capability provenance");
}

if (
  !electronMain.includes("calibratedFluidFingerprint") ||
  !electronMain.includes("capabilityFingerprint") ||
  !electronMain.includes("profile capability fingerprint did not match provenance")
) {
  errors.push("electron/main.cjs must pass valid calibration fingerprints and reject tampered profile capability provenance");
}

if (
  !adaptiveTier.includes("calibration-provenance-fallback-high") ||
  !adaptiveTier.includes("calibratedFluidCapabilityFingerprintFromSearch") ||
  !adaptiveTier.includes("fluidRuntimeTierSelectionForCapabilityProvenance")
) {
  errors.push("fluidAdaptiveTier.ts must define the FG-28 provenance mismatch fallback selection mode");
}

if (
  !oceanPhysicsApp.includes("fluidCapabilityFingerprintForReport") ||
  !oceanPhysicsApp.includes("fluidRuntimeTierSelectionForCapabilityProvenance") ||
  !oceanPhysicsApp.includes("expectedCalibratedFingerprint")
) {
  errors.push("OceanPhysicsApp must compare saved and live WebGPU capability fingerprints before using calibrated auto tier");
}

if (
  !calibrationProvenance.includes("G-FG-28") ||
  !calibrationProvenance.includes("mismatchedProfileDowngradedByRenderer") ||
  !calibrationProvenance.includes("tamperedProfileRejectedByMainProcess") ||
  !calibrationProvenance.includes("tampered profile must fail capability fingerprint validation") ||
  !calibrationProvenance.includes("calibration-provenance-fallback-high")
) {
  errors.push("fluidCalibrationProvenance.ts must define matching, copied-profile, and tampered-profile provenance checks");
}

if (
  !calibrationProvenanceReport.includes("external / copied-profile") ||
  !calibrationProvenanceReport.includes("expectedMode: \"calibrated-auto\"") ||
  !calibrationProvenanceReport.includes("expectedMode: \"calibration-provenance-fallback-high\"") ||
  !calibrationProvenanceReport.includes("expectedMode: \"default-high\"") ||
  !calibrationProvenanceReport.includes("delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER") ||
  !calibrationProvenanceReport.includes("delete launchEnv.OCEAN_LAB_FLUID_TIER")
) {
  errors.push("fluidCalibrationProvenance.report.ts must prove matching, copied-profile, and tampered-profile packaged runtime behavior without fluid-tier env vars");
}

if (
  !calibrationProvenanceTest.includes("copied-profile") ||
  !calibrationProvenanceTest.includes("tampered profiles are rejected") ||
  !calibrationProvenanceTest.includes("calibration-provenance-fallback-high") ||
  !calibrationProvenanceTest.includes("G-FG-28")
) {
  errors.push("fluidCalibrationProvenance.test.ts must cover FG-28 pass and failure cases");
}

if (
  !remap.includes("FG-28") ||
  !remap.includes("calibration-provenance") ||
  !remap.includes("calibratedFluidFingerprint") ||
  !remap.includes("calibration-provenance-fallback-high") ||
  !remap.includes("tampered-profile")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-28 calibration provenance gate and evidence");
}

if (
  !fg28Evidence.includes("\"gate\": \"G-FG-28\"") ||
  !fg28Evidence.includes("\"pass\": true") ||
  !fg28Evidence.includes("\"expectedAppVersion\": \"0.1.0\"") ||
  !fg28Evidence.includes("\"adapterInfo\": \"apple / metal-3\"") ||
  !fg28Evidence.includes("\"adapterInfo\": \"external / copied-profile\"") ||
  !fg28Evidence.includes("\"validationFailures\": []") ||
  !fg28Evidence.includes("profile capability fingerprint tampered did not match recorded WebGPU capability provenance") ||
  !fg28Evidence.includes("\"envCalibratedTierPresent\": false") ||
  !fg28Evidence.includes("\"envRequestedTierPresent\": false") ||
  !fg28Evidence.includes("\"validProfileReusedByMainProcess\": true") ||
  !fg28Evidence.includes("\"mismatchedProfileDowngradedByRenderer\": true") ||
  !fg28Evidence.includes("\"tamperedProfileRejectedByMainProcess\": true") ||
  !fg28Evidence.includes("\"mode\": \"calibrated-auto\"") ||
  !fg28Evidence.includes("\"mode\": \"calibration-provenance-fallback-high\"") ||
  !fg28Evidence.includes("\"mode\": \"default-high\"") ||
  !fg28Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg28Evidence.includes("\"selectedTier\": \"high\"") ||
  !fg28Evidence.includes("\"grid\": \"768x432\"") ||
  !fg28Evidence.includes("\"grid\": \"512x288\"") ||
  !fg28Evidence.includes("\"failures\": []")
) {
  errors.push("FG-28 evidence must record a passing packaged calibration provenance report with matching, copied-profile, and tampered-profile fallback behavior");
}

if (!packageJson.includes("\"fluid:sustained-interaction-pacing\"") || !packageJson.includes("src/fluid/fluidSustainedInteractionPacing.report.ts")) {
  errors.push("package.json must expose the FG-29 packaged sustained-interaction-pacing command");
}

if (!tracking.includes("FG-29-T03") || !tracking.includes("FG-29-sustained-interaction-pacing-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/32")) {
  errors.push("docs/TRACKING.md must record FG-29 sustained interaction pacing evidence and issue mapping");
}

if (
  !contract.includes("FG-29") ||
  !contract.includes("G-FG-29") ||
  !contract.includes("Sustained calibrated interaction pacing gate") ||
  !contract.includes("npm run fluid:sustained-interaction-pacing")
) {
  errors.push("fluidGridContract.ts must define the FG-29 sustained interaction pacing milestone, gate, and evidence command");
}

if (
  !sustainedInteractionPacing.includes("G-FG-29") ||
  !sustainedInteractionPacing.includes("sustained-calibrated-mixed-drops") ||
  !sustainedInteractionPacing.includes("minSamples: 600") ||
  !sustainedInteractionPacing.includes("workload never observed active pressure telemetry") ||
  !sustainedInteractionPacing.includes("samples did not all observe calibrated-auto")
) {
  errors.push("fluidSustainedInteractionPacing.ts must define sustained calibrated workload smoothness and telemetry checks");
}

if (
  !sustainedInteractionPacingReport.includes("installFluidCalibrationProfile") ||
  !sustainedInteractionPacingReport.includes("concrete-cube") ||
  !sustainedInteractionPacingReport.includes("foam-rescue-block") ||
  !sustainedInteractionPacingReport.includes("leaky-steel-drum") ||
  !sustainedInteractionPacingReport.includes("steel-sphere") ||
  !sustainedInteractionPacingReport.includes("delete launchEnv.OCEAN_LAB_CALIBRATED_FLUID_TIER") ||
  !sustainedInteractionPacingReport.includes("delete launchEnv.OCEAN_LAB_FLUID_TIER") ||
  !sustainedInteractionPacingReport.includes("physicsOffsetS")
) {
  errors.push("fluidSustainedInteractionPacing.report.ts must drive a sustained env-free packaged installed-profile workload with monotonic physics-time sampling");
}

if (
  !sustainedInteractionPacingTest.includes("mixed sustained workload") ||
  !sustainedInteractionPacingTest.includes("choppy frames") ||
  !sustainedInteractionPacingTest.includes("lost calibrated ultra telemetry") ||
  !sustainedInteractionPacingTest.includes("G-FG-29")
) {
  errors.push("fluidSustainedInteractionPacing.test.ts must cover FG-29 pass and failure cases");
}

if (
  !remap.includes("FG-29") ||
  !remap.includes("sustained-interaction-pacing") ||
  !remap.includes("concrete, foam") ||
  !remap.includes("leaky-drum") ||
  !remap.includes("fixed-step simulation debt")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-29 sustained interaction pacing gate and evidence");
}

if (
  !fg29Evidence.includes("\"gate\": \"G-FG-29\"") ||
  !fg29Evidence.includes("\"pass\": true") ||
  !fg29Evidence.includes("\"installedTier\": \"ultra\"") ||
  !fg29Evidence.includes("\"reusedByMainProcess\": true") ||
  !fg29Evidence.includes("\"mode\": \"calibrated-auto\"") ||
  !fg29Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg29Evidence.includes("\"selectedGrid\"") ||
  !fg29Evidence.includes("\"cellsX\": 768") ||
  !fg29Evidence.includes("\"cellsY\": 432") ||
  !fg29Evidence.includes("\"sustained-calibrated-mixed-drops\"") ||
  !fg29Evidence.includes("\"Concrete cube dense impact\"") ||
  !fg29Evidence.includes("\"Foam block damping\"") ||
  !fg29Evidence.includes("\"Leaky drum float/fill\"") ||
  !fg29Evidence.includes("\"Steel sphere compact sink\"") ||
  !fg29Evidence.includes("\"actionCount\": 4") ||
  !fg29Evidence.includes("\"firedActionCount\": 4") ||
  !fg29Evidence.includes("\"capabilityGrid\": \"768x432\"") ||
  !fg29Evidence.includes("\"capabilitySelectedTier\": \"ultra\"") ||
  !fg29Evidence.includes("\"tierSelectionMode\": \"calibrated-auto\"") ||
  !fg29Evidence.includes("\"pressureActiveSeen\": true") ||
  !fg29Evidence.includes("\"particlesActiveSeen\": true") ||
  !fg29Evidence.includes("\"couplingActiveSeen\": true") ||
  !fg29Evidence.includes("\"stability\": \"smooth\"") ||
  !fg29Evidence.includes("\"maxDroppedDebtS\": 0") ||
  !fg29Evidence.includes("\"failures\": []")
) {
  errors.push("FG-29 evidence must record a passing packaged sustained calibrated interaction pacing report");
}

if (!packageJson.includes("\"fluid:package-reproducibility\"") || !packageJson.includes("src/fluid/fluidPackageReproducibility.report.ts")) {
  errors.push("package.json must expose the FG-30 package reproducibility command");
}

if (!tracking.includes("FG-30-T03") || !tracking.includes("FG-30-package-reproducibility-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/33")) {
  errors.push("docs/TRACKING.md must record FG-30 package reproducibility evidence and issue mapping");
}

if (
  !contract.includes("FG-30") ||
  !contract.includes("G-FG-30") ||
  !contract.includes("Local cached packaging reproducibility gate") ||
  !contract.includes("npm run fluid:package-reproducibility")
) {
  errors.push("fluidGridContract.ts must define the FG-30 package reproducibility milestone, gate, and evidence command");
}

if (
  !electronZipCache.includes("electronZipFileName") ||
  !electronZipCache.includes("findCachedElectronZip") ||
  !electronZipCache.includes("electronZipDirArgs") ||
  !electronZipCache.includes("Library\", \"Caches\", \"electron") ||
  !electronZipCache.includes("OCEAN_LAB_ELECTRON_ZIP_DIR") ||
  !electronZipCache.includes("--electron-zip-dir=")
) {
  errors.push("electron_zip_cache.mjs must discover exact local Electron zip artifacts from cache roots");
}

if (
  !electronZipCacheTest.includes("nested @electron/get cache directories") ||
  !electronZipCacheTest.includes("electron-v42.3.3-darwin-arm64.zip") ||
  !electronZipCacheTest.includes("returns no packager args")
) {
  errors.push("electron_zip_cache.test.mjs must cover local Electron zip cache discovery and fallback");
}

if (
  !packageMac.includes("electronZipDirArgs") ||
  !packageMac.includes("Using cached Electron zip") ||
  !packageMac.includes("electronPackageJson.version") ||
  !packageMac.includes("OCEAN_LAB_RELEASE_DIR") ||
  !packageMac.includes("xattr") ||
  !packageMac.includes("-cr") ||
  !packageMac.includes("codesign") ||
  !packageMac.includes("--deep")
) {
  errors.push("package_mac.mjs must prefer the local cached Electron zip when packaging");
}

if (
  !packageReproducibility.includes("G-FG-30") ||
  !packageReproducibility.includes("packaging did not use a local cached Electron zip") ||
  !packageReproducibility.includes("sustained interaction pacing report must pass") ||
  !packageReproducibility.includes("representativeSamples")
) {
  errors.push("fluidPackageReproducibility.ts must define cached packaging and sustained interaction checks");
}

if (
  !packageReproducibilityReport.includes("findCachedElectronZip") ||
  !packageReproducibilityReport.includes("ocean-lab-package-reproducibility-release") ||
  !packageReproducibilityReport.includes("OCEAN_LAB_RELEASE_DIR") ||
  !packageReproducibilityReport.includes("scripts/package_mac.mjs") ||
  !packageReproducibilityReport.includes("fluidSustainedInteractionPacing.report.ts") ||
  !packageReproducibilityReport.includes("fluid-sustained-interaction-pacing-package-reproducibility.json")
) {
  errors.push("fluidPackageReproducibility.report.ts must package through the cached path and run sustained interaction evidence");
}

if (
  !packageReproducibilityTest.includes("cached Electron packaging") ||
  !packageReproducibilityTest.includes("local Electron cache") ||
  !packageReproducibilityTest.includes("G-FG-30")
) {
  errors.push("fluidPackageReproducibility.test.ts must cover FG-30 pass and failure cases");
}

if (
  !remap.includes("FG-30") ||
  !remap.includes("package-reproducibility") ||
  !remap.includes("ocean-lab-package-reproducibility-release") ||
  !remap.includes("electron-v42.3.3-darwin-arm64.zip") ||
  !remap.includes("electron-zip-dir") ||
  !remap.includes("host execution context") ||
  !remap.includes("freshly packaged app")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-30 cached package reproducibility gate and evidence");
}

if (
  !fg30Evidence.includes("\"gate\": \"G-FG-30\"") ||
  !fg30Evidence.includes("\"pass\": true") ||
  !fg30Evidence.includes("\"cacheHit\": true") ||
  !fg30Evidence.includes("\"electronVersion\": \"42.3.3\"") ||
  !fg30Evidence.includes("\"zipFileName\": \"electron-v42.3.3-darwin-arm64.zip\"") ||
  !fg30Evidence.includes("\"packageScript\": \"scripts/package_mac.mjs\"") ||
  !fg30Evidence.includes("\"appBundlePath\": \"/private/tmp/ocean-lab-package-reproducibility-release/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app\"") ||
  !fg30Evidence.includes("\"gate\": \"G-FG-29\"") ||
  !fg30Evidence.includes("\"mode\": \"calibrated-auto\"") ||
  !fg30Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg30Evidence.includes("\"stability\": \"smooth\"") ||
  !fg30Evidence.includes("\"maxDroppedDebtS\": 0") ||
  !fg30Evidence.includes("\"failures\": []")
) {
  errors.push("FG-30 evidence must record cached local packaging plus passing sustained calibrated interaction evidence");
}

if (!packageJson.includes("\"fluid:impact-energy-budget\"") || !packageJson.includes("src/fluid/fluidImpactEnergyBudget.report.ts")) {
  errors.push("package.json must expose the FG-31 impact-energy-budget command");
}

if (!tracking.includes("FG-31-T03") || !tracking.includes("FG-31-impact-energy-budget-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/34")) {
  errors.push("docs/TRACKING.md must record FG-31 impact energy budget evidence and issue mapping");
}

if (
  !contract.includes("FG-31") ||
  !contract.includes("G-FG-31") ||
  !contract.includes("Live impact energy budget gate") ||
  !contract.includes("npm run fluid:impact-energy-budget")
) {
  errors.push("fluidGridContract.ts must define the FG-31 impact energy budget milestone, gate, and evidence command");
}

if (
  !impactEnergyBudget.includes("G-FG-31") ||
  !impactEnergyBudget.includes("impactKineticEnergyJ") ||
  !impactEnergyBudget.includes("accountedEnergyRatio") ||
  !impactEnergyBudget.includes("pressureImpulseEnergyRatio") ||
  !impactEnergyBudget.includes("splashGridEnergyRatio") ||
  !impactEnergyBudget.includes("particleReentryEnergyRatio") ||
  !impactEnergyBudget.includes("ejectedToDisplacedMassRatio") ||
  !impactEnergyBudget.includes("fg09-solver-architecture") ||
  !impactEnergyBudget.includes("energy budget path lost no-full-grid-readback telemetry")
) {
  errors.push("fluidImpactEnergyBudget.ts must define the FG-31 source-traced live impact energy budget checks");
}

if (
  !impactEnergyBudgetReport.includes("FG-22-ultra-reference-outcomes-2026-06-08.json") ||
  !impactEnergyBudgetReport.includes("data/fluid-reference-cases.json") ||
  !impactEnergyBudgetReport.includes("G-FG-31") ||
  !impactEnergyBudgetReport.includes("accounted energy ratio") ||
  !impactEnergyBudgetReport.includes("pressure/grid/potential/reentry ratios")
) {
  errors.push("fluidImpactEnergyBudget.report.ts must consume FG-22/reference evidence and write the FG-31 impact energy budget report");
}

if (
  !impactEnergyBudgetTest.includes("createFluidImpactEnergyBudgetReport") ||
  !impactEnergyBudgetTest.includes("too much accounted water energy") ||
  !impactEnergyBudgetTest.includes("missing source trace") ||
  !impactEnergyBudgetTest.includes("no-full-grid-readback") ||
  !impactEnergyBudgetTest.includes("G-FG-31")
) {
  errors.push("fluidImpactEnergyBudget.test.ts must cover FG-31 pass and failure cases");
}

if (
  !remap.includes("FG-31") ||
  !remap.includes("impact-energy-budget") ||
  !remap.includes("pressure impulse energy") ||
  !remap.includes("splash-grid energy") ||
  !remap.includes("nist-standard-gravity")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-31 impact energy budget gate and evidence");
}

if (
  !fg31Evidence.includes("\"gate\": \"G-FG-31\"") ||
  !fg31Evidence.includes("\"pass\": true") ||
  !fg31Evidence.includes("\"liveCaseId\": \"live-concrete-drop-splash-pressure\"") ||
  !fg31Evidence.includes("\"impactKineticEnergyJ\": 67748.55516313208") ||
  !fg31Evidence.includes("\"accountedEnergyRatio\": 0.3262289556144377") ||
  !fg31Evidence.includes("\"pressureImpulseEnergyRatio\": 0.15855249224247944") ||
  !fg31Evidence.includes("\"splashGridEnergyRatio\": 0.12476294726500031") ||
  !fg31Evidence.includes("\"particleReentryEnergyRatio\": 0.0008623444827862187") ||
  !fg31Evidence.includes("\"ejectedToDisplacedMassRatio\": 0.8088888888888939") ||
  !fg31Evidence.includes("\"reenteredToSprayMassRatio\": 0.24291883714931523") ||
  !fg31Evidence.includes("\"datasetId\": \"ocean-impact-reference-v1\"") ||
  !fg31Evidence.includes("\"fg06-calibration-evidence\"") ||
  !fg31Evidence.includes("\"fg09-solver-architecture\"") ||
  !fg31Evidence.includes("\"nist-standard-gravity\"") ||
  !fg31Evidence.includes("\"grid\": \"768x432\"") ||
  !fg31Evidence.includes("\"noFullGridReadbackPerFrame\": true") ||
  !fg31Evidence.includes("\"pressureActive\": true") ||
  !fg31Evidence.includes("\"particleSplashActive\": true") ||
  !fg31Evidence.includes("\"splashActive\": true") ||
  !fg31Evidence.includes("\"couplingActive\": true") ||
  !fg31Evidence.includes("\"failures\": []")
) {
  errors.push("FG-31 evidence must record a passing source-traced live impact energy budget with bounded WebGPU energy and telemetry channels");
}

if (!packageJson.includes("\"fluid:surface-recovery\"") || !packageJson.includes("src/fluid/fluidSurfaceRecovery.report.ts")) {
  errors.push("package.json must expose the FG-32 surface-recovery command");
}

if (!tracking.includes("FG-32-T03") || !tracking.includes("FG-32-surface-recovery-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/35")) {
  errors.push("docs/TRACKING.md must record FG-32 surface recovery evidence and issue mapping");
}

if (
  !contract.includes("FG-32") ||
  !contract.includes("G-FG-32") ||
  !contract.includes("Live surface recovery damping gate") ||
  !contract.includes("npm run fluid:surface-recovery")
) {
  errors.push("fluidGridContract.ts must define the FG-32 surface recovery milestone, gate, and evidence command");
}

if (
  !surfaceRecovery.includes("G-FG-32") ||
  !surfaceRecovery.includes("lumaStdDevLateToInitialRatio") ||
  !surfaceRecovery.includes("visualBucketsLateToInitialRatio") ||
  !surfaceRecovery.includes("pressureWorkLateToInitialRatio") ||
  !surfaceRecovery.includes("foamEnergyLateToInitialRatio") ||
  !surfaceRecovery.includes("no-full-grid-readback") ||
  !surfaceRecovery.includes("visualRecovery")
) {
  errors.push("fluidSurfaceRecovery.ts must define the FG-32 visual, foam, pressure-work, and no-readback recovery checks");
}

if (
  !surfaceRecoveryReport.includes("OCEAN_LAB_FLUID_TIER") ||
  !surfaceRecoveryReport.includes("concrete-cube") ||
  !surfaceRecoveryReport.includes("waterDepthM: 22") ||
  !surfaceRecoveryReport.includes("recoveryOffsetsS") ||
  !surfaceRecoveryReport.includes("summarizeCanvasPng") ||
  !surfaceRecoveryReport.includes("data-water-pressure-work") ||
  !surfaceRecoveryReport.includes("G-FG-32")
) {
  errors.push("fluidSurfaceRecovery.report.ts must drive the packaged ultra deep-water concrete recovery probe");
}

if (
  !surfaceRecoveryTest.includes("createFluidSurfaceRecoveryReport") ||
  !surfaceRecoveryTest.includes("visually turbulent") ||
  !surfaceRecoveryTest.includes("lost WebGPU") ||
  !surfaceRecoveryTest.includes("G-FG-32")
) {
  errors.push("fluidSurfaceRecovery.test.ts must cover FG-32 pass and failure cases");
}

if (
  !remap.includes("FG-32") ||
  !remap.includes("surface-recovery") ||
  !remap.includes("luma stddev") ||
  !remap.includes("pressure work ratio") ||
  !remap.includes("no-full-grid-readback")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-32 surface recovery gate and evidence");
}

if (
  !fg32Evidence.includes("\"gate\": \"G-FG-32\"") ||
  !fg32Evidence.includes("\"pass\": true") ||
  !fg32Evidence.includes("\"failures\": []") ||
  !fg32Evidence.includes("\"launchMode\": \"packaged-app\"") ||
  !fg32Evidence.includes("\"objectPresetId\": \"concrete-cube\"") ||
  !fg32Evidence.includes("\"waterDepthM\": 22") ||
  !fg32Evidence.includes("\"lumaStdDevLateToInitialRatio\": 0.6223803787286891") ||
  !fg32Evidence.includes("\"visualBucketsLateToInitialRatio\": 0.40350877192982454") ||
  !fg32Evidence.includes("\"pressureWorkLateToInitialRatio\": 0.07796400197495398") ||
  !fg32Evidence.includes("\"foamEnergyLateToInitialRatio\": 0.6723764010928198") ||
  !fg32Evidence.includes("\"waterFrameDelta\": 449") ||
  !fg32Evidence.includes("\"visualRecovery\": \"recovered\"") ||
  !fg32Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg32Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg32Evidence.includes("\"grid\": \"768x432\"") ||
  !fg32Evidence.includes("\"noFullGridReadbackPerFrame\": true") ||
  !fg32Evidence.includes("\"droppedDebtS\": 0")
) {
  errors.push("FG-32 evidence must record a passing packaged ultra surface recovery report with visual, pressure, foam, and no-readback telemetry");
}

if (!packageJson.includes("\"fluid:desktop-launcher\"") || !packageJson.includes("src/fluid/fluidDesktopLauncher.report.ts") || !packageJson.includes("OCEAN_LAB_RELEASE_DIR")) {
  errors.push("package.json must expose the FG-33 desktop-launcher command with a stable local install root");
}

if (!tracking.includes("FG-33-T03") || !tracking.includes("FG-33-desktop-launcher-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/36")) {
  errors.push("docs/TRACKING.md must record FG-33 desktop launcher evidence and issue mapping");
}

if (
  !contract.includes("FG-33") ||
  !contract.includes("G-FG-33") ||
  !contract.includes("Desktop launcher install reproducibility gate") ||
  !contract.includes("npm run fluid:desktop-launcher")
) {
  errors.push("fluidGridContract.ts must define the FG-33 desktop launcher milestone, gate, and evidence command");
}

if (
  !desktopLauncher.includes("G-FG-33") ||
  !desktopLauncher.includes("installRootOutsideWorkspace") ||
  !desktopLauncher.includes("resolvesToAppBundle") ||
  !desktopLauncher.includes("codesignVerified") ||
  !desktopLauncher.includes("forbiddenExtendedAttributes") ||
  !desktopLauncher.includes("desktop render probe did not pass")
) {
  errors.push("fluidDesktopLauncher.ts must define the FG-33 desktop install, launcher, signing, and render checks");
}

if (
  !desktopLauncherReport.includes("OCEAN_LAB_DESKTOP_LAUNCHER_WRITE") ||
  !desktopLauncherReport.includes("OCEAN_LAB_FLUID_RENDER_EXECUTABLE") ||
  !desktopLauncherReport.includes("scripts/fluid_render_probe.mjs") ||
  !desktopLauncherReport.includes("codesign") ||
  !desktopLauncherReport.includes("xattr") ||
  !desktopLauncherReport.includes("Desktop") ||
  !desktopLauncherReport.includes("Applications") ||
  !desktopLauncherReport.includes("G-FG-33")
) {
  errors.push("fluidDesktopLauncher.report.ts must package, verify, and pixel-probe the exact Desktop launcher target");
}

if (
  !desktopLauncherTest.includes("inside the workspace") ||
  !desktopLauncherTest.includes("does not resolve") ||
  !desktopLauncherTest.includes("black or flat") ||
  !desktopLauncherTest.includes("G-FG-33")
) {
  errors.push("fluidDesktopLauncher.test.ts must cover FG-33 pass and failure cases");
}

if (
  !remap.includes("FG-33") ||
  !remap.includes("desktop-launcher") ||
  !remap.includes("Desktop launcher") ||
  !remap.includes("codesign") ||
  !remap.includes("nonblank/varied")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-33 desktop launcher gate and evidence");
}

if (
  !fg33Evidence.includes("\"gate\": \"G-FG-33\"") ||
  !fg33Evidence.includes("\"pass\": true") ||
  !fg33Evidence.includes("\"failures\": []") ||
  !fg33Evidence.includes("\"installRootOutsideWorkspace\": true") ||
  !fg33Evidence.includes("\"installRootPath\": \"/Users/sasha/Applications/Ocean Impact Lab Builds\"") ||
  !fg33Evidence.includes("\"workspaceRoot\": \"/Users/sasha/Documents/New project\"") ||
  !fg33Evidence.includes("\"kind\": \"symlink\"") ||
  !fg33Evidence.includes("\"resolvesToAppBundle\": true") ||
  !fg33Evidence.includes("\"targetPath\": \"/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app\"") ||
  !fg33Evidence.includes("\"codesignVerified\": true") ||
  !fg33Evidence.includes("\"forbiddenExtendedAttributes\": []") ||
  !fg33Evidence.includes("\"launchMode\": \"packaged-executable\"") ||
  !fg33Evidence.includes("\"userData\": \"default\"") ||
  !fg33Evidence.includes("\"averageLuma\": 125.6693323792467") ||
  !fg33Evidence.includes("\"colorBuckets\": 23") ||
  !fg33Evidence.includes("\"status\": \"nonblank\"") ||
  !fg33Evidence.includes("\"variety\": \"varied\"") ||
  !fg33Evidence.includes("\"frames\": 56") ||
  !fg33Evidence.includes("\"grid\": \"512x288\"") ||
  !fg33Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg33Evidence.includes("\"waterContext\": \"webgpu\"")
) {
  errors.push("FG-33 evidence must record a passing signed Desktop launcher install and default-profile WebGPU render probe");
}

if (!packageJson.includes("\"fluid:default-profile-calibration\"") || !packageJson.includes("src/fluid/fluidDefaultProfileCalibration.report.ts")) {
  errors.push("package.json must expose the FG-34 default-profile calibration command");
}

if (!tracking.includes("FG-34-T03") || !tracking.includes("FG-34-default-profile-calibration-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/37")) {
  errors.push("docs/TRACKING.md must record FG-34 default-profile calibration evidence and issue mapping");
}

if (
  !contract.includes("FG-34") ||
  !contract.includes("G-FG-34") ||
  !contract.includes("Default-profile calibrated Desktop launch gate") ||
  !contract.includes("npm run fluid:default-profile-calibration")
) {
  errors.push("fluidGridContract.ts must define the FG-34 default-profile calibration milestone, gate, and evidence command");
}

if (
  !electronMain.includes("createMainWindowRevealer") ||
  !electronMain.includes("show: true") ||
  !electronMain.includes("did-finish-load") ||
  !electronMain.includes("did-fail-load") ||
  !electronMain.includes("app.focus({ steal: true })") ||
  !electronMain.includes("revealFallback")
) {
  errors.push("electron/main.cjs must reveal the Desktop BrowserWindow outside the Playwright hidden-renderer path");
}

if (
  !defaultProfileCalibration.includes("G-FG-34") ||
  !defaultProfileCalibration.includes("defaultUserDataPath") ||
  !defaultProfileCalibration.includes("storageBasePath") ||
  !defaultProfileCalibration.includes("calibrated-auto") ||
  !defaultProfileCalibration.includes("readByMainProcess") ||
  !defaultProfileCalibration.includes("runtime color buckets") ||
  !defaultProfileCalibration.includes("validateFluidCalibrationProfile")
) {
  errors.push("fluidDefaultProfileCalibration.ts must define the FG-34 default-profile storage, calibrated-auto runtime, and pixel checks");
}

if (
  !defaultProfileCalibrationReport.includes("OCEAN_LAB_DEFAULT_PROFILE_USER_DATA") ||
  !defaultProfileCalibrationReport.includes("HARBORLINE_USER_DATA_DIR") ||
  !defaultProfileCalibrationReport.includes("fluid-calibration.v1.json") ||
  !defaultProfileCalibrationReport.includes("Application Support") ||
  !defaultProfileCalibrationReport.includes("Desktop") ||
  !defaultProfileCalibrationReport.includes("Concrete cube") ||
  !defaultProfileCalibrationReport.includes("G-FG-34")
) {
  errors.push("fluidDefaultProfileCalibration.report.ts must install the real default profile and probe the exact Desktop launch path");
}

if (
  !defaultProfileCalibrationTest.includes("real default app storage") ||
  !defaultProfileCalibrationTest.includes("falls back to high") ||
  !defaultProfileCalibrationTest.includes("black or flat") ||
  !defaultProfileCalibrationTest.includes("G-FG-34")
) {
  errors.push("fluidDefaultProfileCalibration.test.ts must cover FG-34 pass and failure cases");
}

if (
  !remap.includes("FG-34") ||
  !remap.includes("default-profile calibration") ||
  !remap.includes("Application Support") ||
  !remap.includes("calibrated-auto") ||
  !remap.includes("768 x 432")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-34 default-profile calibration gate and evidence");
}

if (
  !fg34Evidence.includes("\"gate\": \"G-FG-34\"") ||
  !fg34Evidence.includes("\"pass\": true") ||
  !fg34Evidence.includes("\"failures\": []") ||
  !fg34Evidence.includes("\"defaultUserDataPath\": \"/Users/sasha/Library/Application Support/Ocean Impact Lab\"") ||
  !fg34Evidence.includes("\"fileName\": \"fluid-calibration.v1.json\"") ||
  !fg34Evidence.includes("\"persistedRawBytes\": 2376") ||
  !fg34Evidence.includes("\"storageBasePath\": \"/Users/sasha/Library/Application Support/Ocean Impact Lab/harborline-game\"") ||
  !fg34Evidence.includes("\"verificationReadMatched\": true") ||
  !fg34Evidence.includes("\"appVersion\": \"0.1.0\"") ||
  !fg34Evidence.includes("\"adapterInfo\": \"apple / metal-3\"") ||
  !fg34Evidence.includes("\"backend\": \"webgpu-compute\"") ||
  !fg34Evidence.includes("\"sourceGate\": \"G-FG-23\"") ||
  !fg34Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg34Evidence.includes("\"schema\": \"ocean-fluid-calibration-profile-v1\"") ||
  !fg34Evidence.includes("\"executablePath\": \"/Users/sasha/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab\"") ||
  !fg34Evidence.includes("\"resolvesToInstalledBundle\": true") ||
  !fg34Evidence.includes("\"targetPath\": \"/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app\"") ||
  !fg34Evidence.includes("\"capabilitySelectedTier\": \"ultra\"") ||
  !fg34Evidence.includes("\"grid\": \"768x432\"") ||
  !fg34Evidence.includes("\"launchMode\": \"desktop-launcher\"") ||
  !fg34Evidence.includes("\"averageLuma\": 125.77515477638447") ||
  !fg34Evidence.includes("\"colorBuckets\": 23") ||
  !fg34Evidence.includes("\"status\": \"nonblank\"") ||
  !fg34Evidence.includes("\"variety\": \"varied\"") ||
  !fg34Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg34Evidence.includes("\"cellsX\": 768") ||
  !fg34Evidence.includes("\"cellsY\": 432") ||
  !fg34Evidence.includes("\"calibratedTier\": \"ultra\"") ||
  !fg34Evidence.includes("\"mode\": \"calibrated-auto\"") ||
  !fg34Evidence.includes("\"preferredTier\": \"ultra\"") ||
  !fg34Evidence.includes("\"requestedTier\": \"auto\"") ||
  !fg34Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg34Evidence.includes("\"waterFrames\": 81") ||
  !fg34Evidence.includes("\"envCalibratedTierPresent\": false") ||
  !fg34Evidence.includes("\"envRequestedTierPresent\": false") ||
  !fg34Evidence.includes("\"readByMainProcess\": true")
) {
  errors.push("FG-34 evidence must record a passing real default-profile calibrated Desktop launch with calibrated-auto ultra WebGPU render proof");
}

if (!packageJson.includes("\"fluid:desktop-visibility\"") || !packageJson.includes("src/fluid/fluidDesktopVisibility.report.ts")) {
  errors.push("package.json must expose the FG-35 desktop visibility command");
}

if (!tracking.includes("FG-35-T03") || !tracking.includes("FG-35-desktop-visibility-2026-06-08.json") || !tracking.includes("https://github.com/AC-21/ocean/issues/38")) {
  errors.push("docs/TRACKING.md must record FG-35 visible Desktop window evidence and issue mapping");
}

if (
  !contract.includes("FG-35") ||
  !contract.includes("G-FG-35") ||
  !contract.includes("Visible calibrated Desktop window gate") ||
  !contract.includes("npm run fluid:desktop-visibility")
) {
  errors.push("fluidGridContract.ts must define the FG-35 visible Desktop window milestone, gate, and evidence command");
}

if (
  !desktopVisibility.includes("G-FG-35") ||
  !desktopVisibility.includes("defaultProfileEvidence") ||
  !desktopVisibility.includes("installedBundleProcess") ||
  !desktopVisibility.includes("frontmost") ||
  !desktopVisibility.includes("windowCount") ||
  !desktopVisibility.includes("ocean viewport average luma") ||
  !desktopVisibility.includes("ocean viewport color buckets")
) {
  errors.push("fluidDesktopVisibility.ts must define FG-35 calibrated profile, installed process, window, and ocean viewport checks");
}

if (
  !desktopVisibilityReport.includes("open") ||
  !desktopVisibilityReport.includes("screencapture") ||
  !desktopVisibilityReport.includes("System Events") ||
  !desktopVisibilityReport.includes("OCEAN_LAB_DESKTOP_VISIBILITY_DEFAULT_PROFILE_IN") ||
  !desktopVisibilityReport.includes("oceanViewportCrop") ||
  !desktopVisibilityReport.includes("reports/fluid-default-profile-calibration-latest.json") ||
  !desktopVisibilityReport.includes("G-FG-35")
) {
  errors.push("fluidDesktopVisibility.report.ts must open the normal Desktop app, foreground it, screenshot it, and crop the ocean viewport");
}

if (
  !desktopVisibilityTest.includes("stale high-tier") ||
  !desktopVisibilityTest.includes("not user-visible") ||
  !desktopVisibilityTest.includes("black or flat") ||
  !desktopVisibilityTest.includes("not the installed bundle") ||
  !desktopVisibilityTest.includes("G-FG-35")
) {
  errors.push("fluidDesktopVisibility.test.ts must cover FG-35 pass and failure cases");
}

if (
  !remap.includes("FG-35") ||
  !remap.includes("desktop-visibility") ||
  !remap.includes("normal macOS Desktop") ||
  !remap.includes("visible frontmost") ||
  !remap.includes("black surface")
) {
  errors.push("docs/FLUID_GRID_REMAP.md must summarize the FG-35 visible Desktop launch gate and evidence");
}

if (
  !fg35Evidence.includes("\"gate\": \"G-FG-35\"") ||
  !fg35Evidence.includes("\"pass\": true") ||
  !fg35Evidence.includes("\"failures\": []") ||
  !fg35Evidence.includes("\"sourcePath\": \"reports/fluid-default-profile-calibration-latest.json\"") ||
  !fg35Evidence.includes("\"mode\": \"calibrated-auto\"") ||
  !fg35Evidence.includes("\"selectedTier\": \"ultra\"") ||
  !fg35Evidence.includes("\"grid\": \"768x432\"") ||
  !fg35Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") ||
  !fg35Evidence.includes("\"waterContext\": \"webgpu\"") ||
  !fg35Evidence.includes("\"path\": \"/Users/sasha/Desktop/Ocean Impact Lab.app\"") ||
  !fg35Evidence.includes("\"resolvesToInstalledBundle\": true") ||
  !fg35Evidence.includes("\"targetPath\": \"/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app\"") ||
  !fg35Evidence.includes("\"installedBundleProcess\": true") ||
  !fg35Evidence.includes("\"visible\": true") ||
  !fg35Evidence.includes("\"frontmost\": true") ||
  !fg35Evidence.includes("\"windowCount\": 1") ||
  !fg35Evidence.includes("\"title\": \"Ocean Impact Lab\"") ||
  !fg35Evidence.includes("\"onScreen\": true") ||
  !fg35Evidence.includes("\"status\": \"nonblank\"") ||
  !fg35Evidence.includes("\"variety\": \"varied\"")
) {
  errors.push("FG-35 evidence must record a normal visible calibrated Desktop launch with nonblack ocean viewport pixels");
}

if (errors.length > 0) {
  console.error("Fluid remap tracking check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Fluid remap tracking check passed: ${milestoneIds.length} milestones, ${gateIds.length} gates, ${requiredFiles.length} files.`);
