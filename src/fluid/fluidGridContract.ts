export type FluidBackendKind = "webgpu-compute" | "cpu-deterministic-test" | "legacy-canvas-diagnostic";

export type FluidGridMilestoneId =
  | "FG-00"
  | "FG-01"
  | "FG-02"
  | "FG-03"
  | "FG-04"
  | "FG-05"
  | "FG-06"
  | "FG-07"
  | "FG-08"
  | "FG-09"
  | "FG-10"
  | "FG-11"
  | "FG-12"
  | "FG-13"
  | "FG-14"
  | "FG-15"
  | "FG-16"
  | "FG-17"
  | "FG-18"
  | "FG-19"
  | "FG-20"
  | "FG-21"
  | "FG-22"
  | "FG-23"
  | "FG-24"
  | "FG-25"
  | "FG-26"
  | "FG-27"
  | "FG-28"
  | "FG-29"
  | "FG-30"
  | "FG-31"
  | "FG-32"
  | "FG-33"
  | "FG-34"
  | "FG-35"
  | "FG-36"
  | "FG-37"
  | "FG-38"
  | "FG-39"
  | "FG-40"
  | "FG-41"
  | "FG-42"
  | "FG-43"
  | "FG-44"
  | "FG-45"
  | "FG-46";

export type FluidGridGateId =
  | "G-FG-00"
  | "G-FG-01"
  | "G-FG-02"
  | "G-FG-03"
  | "G-FG-04"
  | "G-FG-05"
  | "G-FG-06"
  | "G-FG-07"
  | "G-FG-08"
  | "G-FG-09"
  | "G-FG-10"
  | "G-FG-11"
  | "G-FG-12"
  | "G-FG-13"
  | "G-FG-14"
  | "G-FG-15"
  | "G-FG-16"
  | "G-FG-17"
  | "G-FG-18"
  | "G-FG-19"
  | "G-FG-20"
  | "G-FG-21"
  | "G-FG-22"
  | "G-FG-23"
  | "G-FG-24"
  | "G-FG-25"
  | "G-FG-26"
  | "G-FG-27"
  | "G-FG-28"
  | "G-FG-29"
  | "G-FG-30"
  | "G-FG-31"
  | "G-FG-32"
  | "G-FG-33"
  | "G-FG-34"
  | "G-FG-35"
  | "G-FG-36"
  | "G-FG-37"
  | "G-FG-38"
  | "G-FG-39"
  | "G-FG-40"
  | "G-FG-41"
  | "G-FG-42"
  | "G-FG-43"
  | "G-FG-44"
  | "G-FG-45"
  | "G-FG-46";

export type FluidGridTierId = "low" | "standard" | "high" | "ultra";

export type FluidGridTaskStatus = "done" | "in-progress" | "planned" | "blocked";

export type FluidGridCapability = {
  backend: FluidBackendKind;
  computeRequired: boolean;
  primaryCanvasContext: "webgpu" | "none";
  requiredBrowserApis: string[];
  forbiddenProductionRenderers: string[];
};

export type FluidGridTier = {
  id: FluidGridTierId;
  cellsX: number;
  cellsY: number;
  minimumAverageFps: number;
  purpose: string;
};

export type FluidGridGate = {
  id: FluidGridGateId;
  blocks: FluidGridMilestoneId;
  evidence: string;
  passBar: string;
};

export type FluidGridMilestone = {
  id: FluidGridMilestoneId;
  title: string;
  gate: FluidGridGateId;
};

export type FluidGridTask = {
  id: `${FluidGridMilestoneId}-T${string}`;
  milestone: FluidGridMilestoneId;
  status: FluidGridTaskStatus;
  title: string;
  exitProof: string;
};

export const productionFluidCapability: FluidGridCapability = {
  backend: "webgpu-compute",
  computeRequired: true,
  primaryCanvasContext: "webgpu",
  requiredBrowserApis: ["navigator.gpu", "GPUDevice", "GPUComputePassEncoder"],
  forbiddenProductionRenderers: ["canvas-2d", "per-pixel-cpu-water-draw", "visual-only-water"],
};

export const diagnosticFluidCapability: FluidGridCapability = {
  backend: "cpu-deterministic-test",
  computeRequired: false,
  primaryCanvasContext: "none",
  requiredBrowserApis: [],
  forbiddenProductionRenderers: [],
};

export const fluidGridTiers: FluidGridTier[] = [
  { id: "low", cellsX: 128, cellsY: 72, minimumAverageFps: 30, purpose: "compatibility fallback" },
  { id: "standard", cellsX: 256, cellsY: 144, minimumAverageFps: 45, purpose: "default interactive simulation" },
  { id: "high", cellsX: 512, cellsY: 288, minimumAverageFps: 30, purpose: "realism inspection" },
  { id: "ultra", cellsX: 768, cellsY: 432, minimumAverageFps: 24, purpose: "opt-in benchmark and future hardware" },
];

export const fluidGridMilestones: FluidGridMilestone[] = [
  { id: "FG-00", title: "Repository and tracking foundation", gate: "G-FG-00" },
  { id: "FG-01", title: "WebGPU capability shell", gate: "G-FG-01" },
  { id: "FG-02", title: "GPU grid allocation and stepping", gate: "G-FG-02" },
  { id: "FG-03", title: "Grid-backed water rendering", gate: "G-FG-03" },
  { id: "FG-04", title: "Two-way rigid-body/fluid coupling", gate: "G-FG-04" },
  { id: "FG-05", title: "Splash, foam, and spray from grid state", gate: "G-FG-05" },
  { id: "FG-06", title: "Calibration and near-realism validation", gate: "G-FG-06" },
  { id: "FG-07", title: "Local GPU calibration and frame pacing", gate: "G-FG-07" },
  { id: "FG-08", title: "Fixed-step simulation loop hardening", gate: "G-FG-08" },
  { id: "FG-09", title: "Research-backed solver architecture decision", gate: "G-FG-09" },
  { id: "FG-10", title: "Reference dataset ingestion and measurement harness", gate: "G-FG-10" },
  { id: "FG-11", title: "Conservative GPU shallow-water upgrade", gate: "G-FG-11" },
  { id: "FG-12", title: "Localized particle splash and spray layer", gate: "G-FG-12" },
  { id: "FG-13", title: "Coupled packaged-app calibration against reference cases", gate: "G-FG-13" },
  { id: "FG-14", title: "Live particle splash feedback in packaged renderer", gate: "G-FG-14" },
  { id: "FG-15", title: "Bounded pressure-gradient broad-water acceleration", gate: "G-FG-15" },
  { id: "FG-16", title: "Live pressure-gradient broad-water renderer path", gate: "G-FG-16" },
  { id: "FG-17", title: "Pressure-informed rigid-body force feedback", gate: "G-FG-17" },
  { id: "FG-18", title: "Live coupled reference outcome gate", gate: "G-FG-18" },
  { id: "FG-19", title: "Packaged display pacing and smoothness gate", gate: "G-FG-19" },
  { id: "FG-20", title: "Ultra-tier resolution scaling gate", gate: "G-FG-20" },
  { id: "FG-21", title: "Opt-in ultra-tier live renderer gate", gate: "G-FG-21" },
  { id: "FG-22", title: "Ultra-tier live reference outcome gate", gate: "G-FG-22" },
  { id: "FG-23", title: "Adaptive local GPU tier calibration selector", gate: "G-FG-23" },
  { id: "FG-24", title: "Persisted local calibration profile runtime gate", gate: "G-FG-24" },
  { id: "FG-25", title: "Installed local calibration profile reuse gate", gate: "G-FG-25" },
  { id: "FG-26", title: "Installed calibration display pacing gate", gate: "G-FG-26" },
  { id: "FG-27", title: "Calibration profile freshness invalidation gate", gate: "G-FG-27" },
  { id: "FG-28", title: "Calibration profile hardware provenance gate", gate: "G-FG-28" },
  { id: "FG-29", title: "Sustained calibrated interaction pacing gate", gate: "G-FG-29" },
  { id: "FG-30", title: "Local cached packaging reproducibility gate", gate: "G-FG-30" },
  { id: "FG-31", title: "Live impact energy budget gate", gate: "G-FG-31" },
  { id: "FG-32", title: "Live surface recovery damping gate", gate: "G-FG-32" },
  { id: "FG-33", title: "Desktop launcher install reproducibility gate", gate: "G-FG-33" },
  { id: "FG-34", title: "Default-profile calibrated Desktop launch gate", gate: "G-FG-34" },
  { id: "FG-35", title: "Visible calibrated Desktop window gate", gate: "G-FG-35" },
  { id: "FG-36", title: "Installed calibrated reference outcome gate", gate: "G-FG-36" },
  { id: "FG-37", title: "Installed reference pacing envelope gate", gate: "G-FG-37" },
  { id: "FG-38", title: "Experimental high-resolution grid headroom gate", gate: "G-FG-38" },
  { id: "FG-39", title: "Experimental high-resolution live renderer gate", gate: "G-FG-39" },
  { id: "FG-40", title: "Experimental high-resolution reference outcomes gate", gate: "G-FG-40" },
  { id: "FG-41", title: "Persisted high-resolution runtime-grid calibration gate", gate: "G-FG-41" },
  { id: "FG-42", title: "Installed high-resolution reference pacing gate", gate: "G-FG-42" },
  { id: "FG-43", title: "Installed high-resolution float/sink envelope gate", gate: "G-FG-43" },
  { id: "FG-44", title: "Installed high-resolution Desktop visibility gate", gate: "G-FG-44" },
  { id: "FG-45", title: "Installed high-resolution operator readout gate", gate: "G-FG-45" },
  { id: "FG-46", title: "Installed high-resolution reference residual budget gate", gate: "G-FG-46" },
];

export const fluidGridGates: FluidGridGate[] = [
  {
    id: "G-FG-00",
    blocks: "FG-00",
    evidence: "npm run fluid:tracking",
    passBar: "docs, issue templates, and code contract agree on milestones and gates",
  },
  {
    id: "G-FG-01",
    blocks: "FG-01",
    evidence: "npm run fluid:capability and docs/evidence/FG-01-fluid-capability-2026-06-07.json",
    passBar: "adapter/device limits captured; unsupported hardware has intentional fallback",
  },
  {
    id: "G-FG-02",
    blocks: "FG-02",
    evidence: "npm run fluid:grid and docs/evidence/FG-02-fluid-grid-benchmark-2026-06-07.json",
    passBar: "standard grid steps inside frame budget with stable CFL and no full-grid readback",
  },
  {
    id: "G-FG-03",
    blocks: "FG-03",
    evidence: "npm run fluid:render and docs/evidence/FG-03-fluid-render-probe-2026-06-07.json",
    passBar: "WebGPU renderer is nonblank/varied and Canvas 2D is not the primary water path",
  },
  {
    id: "G-FG-04",
    blocks: "FG-04",
    evidence: "npm run fluid:coupling and docs/evidence/FG-04-fluid-coupling-2026-06-07.json",
    passBar: "object entries write footprints, depth impedance, and displacement impulses to the WebGPU grid and feed bounded force deltas into rigid-body motion",
  },
  {
    id: "G-FG-05",
    blocks: "FG-05",
    evidence: "npm run fluid:splash and docs/evidence/FG-05-fluid-splash-2026-06-07.json",
    passBar: "splash crown, foam, spray, and secondary impacts are driven by bounded local WebGPU grid energy",
  },
  {
    id: "G-FG-06",
    blocks: "FG-06",
    evidence: "npm run fluid:calibration and docs/evidence/FG-06-fluid-calibration-2026-06-07.json",
    passBar: "reference cases and prior WebGPU gates match accepted error bounds for impact speed, splash height, damping, float behavior, and evidence completeness",
  },
  {
    id: "G-FG-07",
    blocks: "FG-07",
    evidence: "npm run fluid:local-calibrate, npm run fluid:local-calibrate:packaged, and docs/evidence/FG-07-local-calibration-2026-06-08.json",
    passBar: "local desktop app records WebGPU renderer telemetry, timestamp-query GPU grid timing, and smooth idle/drop frame pacing with bounded p95/p99 frame times",
  },
  {
    id: "G-FG-08",
    blocks: "FG-08",
    evidence: "npm run fluid:frame-loop and docs/evidence/FG-08-frame-loop-2026-06-08.json",
    passBar: "the app advances rigid-body physics through a bounded fixed-step accumulator with WebGPU rendering active and no dropped simulation debt at normal speed",
  },
  {
    id: "G-FG-09",
    blocks: "FG-09",
    evidence: "npm run fluid:architecture and docs/evidence/FG-09-solver-architecture-2026-06-08.json",
    passBar:
      "primary-source solver decision selects a hybrid GPU heightfield/free-surface grid plus localized particle splash layer, rejects incomplete immediate paths, and names the next calibration-backed gates",
  },
  {
    id: "G-FG-10",
    blocks: "FG-10",
    evidence: "npm run fluid:references and docs/evidence/FG-10-reference-dataset-2026-06-08.json",
    passBar:
      "drop, splash, float, sink, and damping reference cases ingest with source metadata, units, uncertainty, resolved expected bands, and replayed CPU-reference measurements",
  },
  {
    id: "G-FG-11",
    blocks: "FG-11",
    evidence: "npm run fluid:shallow-water and docs/evidence/FG-11-shallow-water-2026-06-08.json",
    passBar:
      "standard and high WebGPU tiers step conservative height and x/y momentum fields with bounded mass drift, momentum damping, wet/dry stability, CFL, and local GPU timing",
  },
  {
    id: "G-FG-12",
    blocks: "FG-12",
    evidence: "npm run fluid:particles and docs/evidence/FG-12-particle-splash-2026-06-08.json",
    passBar:
      "standard and high WebGPU tiers step localized splash particles with bounded mass and momentum, splash crown inside the reference band, measurable reentry feedback, and local GPU timing",
  },
  {
    id: "G-FG-13",
    blocks: "FG-13",
    evidence: "npm run fluid:coupled-calibrate and docs/evidence/FG-13-coupled-calibration-2026-06-08.json",
    passBar:
      "the packaged desktop app, reference replay, shallow-water evidence, and particle-splash evidence pass as one coupled calibration packet for drop, splash, float, sink, damping, frame pacing, and bounded GPU readback",
  },
  {
    id: "G-FG-14",
    blocks: "FG-14",
    evidence: "npm run fluid:live-particles and docs/evidence/FG-14-live-particles-2026-06-08.json",
    passBar:
      "the packaged WebGPU renderer exposes and uses localized particle splash feedback with bounded mass, momentum, crown height, reentry energy, local grid feedback, and no Canvas fallback",
  },
  {
    id: "G-FG-15",
    blocks: "FG-15",
    evidence: "npm run fluid:pressure and docs/evidence/FG-15-pressure-gradient-2026-06-08.json",
    passBar:
      "standard and high WebGPU tiers use bounded pressure-gradient acceleration with mass, wet/dry, energy, momentum-budget, slope-limiter, CFL, and timestamp-query evidence",
  },
  {
    id: "G-FG-16",
    blocks: "FG-16",
    evidence: "npm run fluid:live-pressure and docs/evidence/FG-16-live-pressure-2026-06-08.json",
    passBar:
      "the packaged WebGPU renderer advances live broad water with bounded pressure-gradient momentum buffers and exposes pressure plus particle telemetry without Canvas fallback or full-grid readback",
  },
  {
    id: "G-FG-17",
    blocks: "FG-17",
    evidence: "npm run fluid:live-pressure-feedback and docs/evidence/FG-17-pressure-feedback-2026-06-08.json",
    passBar:
      "the packaged app feeds bounded live pressure force deltas into the rigid-body grid coupling consumed by stepSimulation while retaining WebGPU pressure, object-grid, and particle telemetry",
  },
  {
    id: "G-FG-18",
    blocks: "FG-18",
    evidence: "npm run fluid:live-reference-outcomes and docs/evidence/FG-18-live-reference-outcomes-2026-06-08.json",
    passBar:
      "the packaged app exposes live physics snapshots and passes reference-outcome comparisons for drop, splash, float, sink, and damping while WebGPU pressure, particle, object-grid, and fixed-step telemetry remain bounded",
  },
  {
    id: "G-FG-19",
    blocks: "FG-19",
    evidence: "npm run fluid:display-pacing and docs/evidence/FG-19-display-pacing-2026-06-08.json",
    passBar:
      "the packaged app sustains smooth display pacing across idle, dense impact, and foam damping scenarios at 1x with WebGPU pressure, particles, object-grid coupling, no dropped simulation debt, and no long-task stalls from diagnostics",
  },
  {
    id: "G-FG-20",
    blocks: "FG-20",
    evidence: "npm run fluid:resolution-scale and docs/evidence/FG-20-resolution-scaling-2026-06-08.json",
    passBar:
      "the packaged app benchmarks standard, high, and ultra WebGPU tiers across grid stepping, bounded pressure shallow water, and localized particle splash with timestamp-query timing, bounded memory growth, no full-grid readback, and stable ultra/high timing ratios",
  },
  {
    id: "G-FG-21",
    blocks: "FG-21",
    evidence: "npm run fluid:ultra-renderer and docs/evidence/FG-21-ultra-renderer-2026-06-08.json",
    passBar:
      "the packaged app honors an explicit ultra-tier request, selects the live 768 x 432 WebGPU renderer, and sustains smooth idle and concrete-impact display pacing with pressure, particles, object-grid coupling, zero dropped simulation debt, and no Canvas fallback",
  },
  {
    id: "G-FG-22",
    blocks: "FG-22",
    evidence: "npm run fluid:ultra-reference-outcomes and docs/evidence/FG-22-ultra-reference-outcomes-2026-06-08.json",
    passBar:
      "the packaged app honors an explicit ultra-tier request, selects the live 768 x 432 WebGPU renderer, and passes live reference comparisons for drop, splash, float, sink, and damping with pressure, particles, object-grid coupling, fixed-step telemetry, and no full-grid readback",
  },
  {
    id: "G-FG-23",
    blocks: "FG-23",
    evidence: "npm run fluid:adaptive-tier and docs/evidence/FG-23-adaptive-tier-2026-06-08.json",
    passBar:
      "the packaged app composes local resolution, ultra renderer, and ultra reference evidence into a calibrated auto tier recommendation, then launches with auto tier selection and proves calibrated-auto selects the live 768 x 432 ultra WebGPU renderer",
  },
  {
    id: "G-FG-24",
    blocks: "FG-24",
    evidence: "npm run fluid:persisted-calibration and docs/evidence/FG-24-persisted-calibration-2026-06-08.json",
    passBar:
      "the packaged app reads an app-owned local calibration profile without a calibrated-tier environment variable, auto-requests the saved calibrated tier, and proves calibrated-auto selects the live 768 x 432 ultra WebGPU renderer while explicit overrides remain supported",
  },
  {
    id: "G-FG-25",
    blocks: "FG-25",
    evidence: "npm run fluid:installed-calibration and docs/evidence/FG-25-installed-calibration-2026-06-08.json",
    passBar:
      "the calibration installer writes a passing FG-23 profile through app-owned desktop storage, then two clean packaged launches reuse the installed profile without fluid-tier environment variables and select the live 768 x 432 ultra WebGPU renderer",
  },
  {
    id: "G-FG-26",
    blocks: "FG-26",
    evidence: "npm run fluid:installed-display-pacing and docs/evidence/FG-26-installed-display-pacing-2026-06-08.json",
    passBar:
      "the normal installed-profile startup path selects calibrated-auto ultra without fluid-tier environment variables and sustains smooth idle, concrete-impact, and foam-damping display pacing with WebGPU pressure, particles, object-grid coupling, fixed-step debt, and long-task telemetry",
  },
  {
    id: "G-FG-27",
    blocks: "FG-27",
    evidence: "npm run fluid:calibration-freshness and docs/evidence/FG-27-calibration-freshness-2026-06-08.json",
    passBar:
      "calibration profiles include app-version and FG-23 source provenance; Electron reuses the current profile for calibrated-auto ultra but rejects a stale app-version profile and falls back to default high without fluid-tier environment variables",
  },
  {
    id: "G-FG-28",
    blocks: "FG-28",
    evidence: "npm run fluid:calibration-provenance and docs/evidence/FG-28-calibration-provenance-2026-06-08.json",
    passBar:
      "calibration profiles bind to FG-01 WebGPU capability provenance; the packaged app reuses a matching profile, downgrades a copied-profile hardware mismatch to high, and rejects a tampered capability fingerprint without fluid-tier environment variables",
  },
  {
    id: "G-FG-29",
    blocks: "FG-29",
    evidence: "npm run fluid:sustained-interaction-pacing and docs/evidence/FG-29-sustained-interaction-pacing-2026-06-08.json",
    passBar:
      "a packaged installed-profile calibrated-auto ultra run drives a sustained mixed-object workload while the WebGPU renderer remains on 768 x 432, active pressure/particles/coupling are observed, display pacing stays smooth, and fixed-step simulation debt remains bounded",
  },
  {
    id: "G-FG-30",
    blocks: "FG-30",
    evidence: "npm run fluid:package-reproducibility and docs/evidence/FG-30-package-reproducibility-2026-06-08.json",
    passBar:
      "the macOS package path uses the exact local cached Electron zip for the current version, rebuilds the packaged app without remote checksum dependency, and then passes sustained calibrated-auto ultra interaction evidence",
  },
  {
    id: "G-FG-31",
    blocks: "FG-31",
    evidence: "npm run fluid:impact-energy-budget and docs/evidence/FG-31-impact-energy-budget-2026-06-08.json",
    passBar:
      "the ultra live concrete impact reports a source-traced, bounded energy budget across pressure impulse, splash grid energy, foam and potential energy, particle reentry, ejected mass, and WebGPU no-full-grid-readback telemetry",
  },
  {
    id: "G-FG-32",
    blocks: "FG-32",
    evidence: "npm run fluid:surface-recovery and docs/evidence/FG-32-surface-recovery-2026-06-08.json",
    passBar:
      "the packaged ultra WebGPU renderer shows post-impact visible surface agitation, foam, and pressure-work recovery over a deep-water concrete drop while maintaining active pressure, particles, coupling, fixed-step pacing, and no full-grid readback",
  },
  {
    id: "G-FG-33",
    blocks: "FG-33",
    evidence: "npm run fluid:desktop-launcher and docs/evidence/FG-33-desktop-launcher-2026-06-08.json",
    passBar:
      "the app packages into a stable local install root outside the workspace, the Desktop launcher resolves to the signed app bundle, and the exact Desktop target renders nonblank/varied WebGPU pixels with the default user profile",
  },
  {
    id: "G-FG-34",
    blocks: "FG-34",
    evidence: "npm run fluid:default-profile-calibration and docs/evidence/FG-34-default-profile-calibration-2026-06-08.json",
    passBar:
      "the real default Ocean Impact Lab profile contains a provenance-valid local calibration profile and the exact Desktop launcher starts without fluid-tier environment overrides in calibrated-auto ultra on the live 768 x 432 WebGPU renderer",
  },
  {
    id: "G-FG-35",
    blocks: "FG-35",
    evidence: "npm run fluid:desktop-visibility and docs/evidence/FG-35-desktop-visibility-2026-06-08.json",
    passBar:
      "a normal macOS Desktop launch starts the installed calibrated app, exposes a visible frontmost Ocean Impact Lab window, and the captured ocean viewport is nonblank/varied instead of a black surface",
  },
  {
    id: "G-FG-36",
    blocks: "FG-36",
    evidence: "npm run fluid:installed-reference-outcomes and docs/evidence/FG-36-installed-reference-outcomes-2026-06-08.json",
    passBar:
      "the real installed Desktop app uses the default calibrated profile with no fluid-tier environment overrides and passes drop, splash, float, sink, and damping reference outcomes on calibrated-auto ultra WebGPU",
  },
  {
    id: "G-FG-37",
    blocks: "FG-37",
    evidence: "npm run fluid:installed-reference-pacing and docs/evidence/FG-37-installed-reference-pacing-2026-06-08.json",
    passBar:
      "the real installed Desktop app composes passing FG-36 reference outcomes with smooth calibrated-auto ultra display pacing while exercising concrete drop/splash, ice float, foam damping, concrete sink, and leaky-drum sink reference scenarios without fluid-tier or userData environment overrides",
  },
  {
    id: "G-FG-38",
    blocks: "FG-38",
    evidence: "npm run fluid:high-resolution-headroom and docs/evidence/FG-38-high-resolution-headroom-2026-06-08.json",
    passBar:
      "the packaged Desktop app keeps production runtime selection capped at ultra while benchmark-only explicit high-resolution grids beyond 768 x 432 pass WebGPU grid, bounded pressure-gradient, and localized particle-splash timing, memory, no-readback, and diagnostic thresholds with timestamp-query evidence",
  },
  {
    id: "G-FG-39",
    blocks: "FG-39",
    evidence: "npm run fluid:experimental-live-grid and docs/evidence/FG-39-experimental-live-grid-2026-06-08.json",
    passBar:
      "the packaged Desktop app keeps default calibrated capability selection capped at ultra 768 x 432 while an explicit experimental runtime flag drives the live WebGPU renderer at 1024 x 576 with smooth idle and concrete-impact pacing, active pressure/particles/coupling, and no full-grid readback",
  },
  {
    id: "G-FG-40",
    blocks: "FG-40",
    evidence: "npm run fluid:experimental-reference-outcomes and docs/evidence/FG-40-experimental-reference-outcomes-2026-06-08.json",
    passBar:
      "the packaged Desktop app runs the experimental 1024 x 576 live WebGPU renderer through drop, splash, float, sink, and damping reference cases while capability selection remains capped at ultra 768 x 432 and no full-grid readback is used",
  },
  {
    id: "G-FG-41",
    blocks: "FG-41",
    evidence: "npm run fluid:high-resolution-calibration and docs/evidence/FG-41-high-resolution-calibration-2026-06-08.json",
    passBar:
      "a persisted local calibration profile derived from passing FG-40 evidence launches the packaged app at live 1024 x 576 without OCEAN_LAB_EXPERIMENTAL_FLUID_GRID while capability selection remains capped at ultra 768 x 432",
  },
  {
    id: "G-FG-42",
    blocks: "FG-42",
    evidence:
      "npm run fluid:installed-high-resolution-reference-pacing and docs/evidence/FG-42-installed-high-resolution-reference-pacing-2026-06-08.json",
    passBar:
      "the real installed Desktop app uses the default fluid-calibration.v1.json profile with a persisted FG-40 runtimeGrid, no fluid-tier, grid, or userData environment overrides, replays drop/splash, float, sink, and damping reference outcomes, and sustains smooth live 1024 x 576 WebGPU pacing",
  },
  {
    id: "G-FG-43",
    blocks: "FG-43",
    evidence:
      "npm run fluid:installed-high-resolution-float-sink and docs/evidence/FG-43-installed-high-resolution-float-sink-envelope-2026-06-08.json",
    passBar:
      "the real installed Desktop app uses the default high-resolution calibration profile to exercise every object preset at live 1024 x 576, proving stable floaters, immediate sinkers, waterlogging-then-sink predictions, smooth WebGPU pacing, active coupling telemetry, no full-grid readback, and nonblank high-resolution viewport pixels",
  },
  {
    id: "G-FG-44",
    blocks: "FG-44",
    evidence:
      "npm run fluid:installed-high-resolution-desktop-visibility and docs/evidence/FG-44-installed-high-resolution-desktop-visibility-2026-06-08.json",
    passBar:
      "the normal macOS Desktop launch path opens the installed app with the FG-43 high-resolution profile, exposes a frontmost Ocean Impact Lab window, and captures nonblank varied ocean viewport pixels from the user-visible screen",
  },
  {
    id: "G-FG-45",
    blocks: "FG-45",
    evidence:
      "npm run fluid:installed-high-resolution-operator-readout and docs/evidence/FG-45-installed-high-resolution-operator-readout-2026-06-08.json",
    passBar:
      "the installed high-resolution Desktop app lets an operator use the visible preset and Drop controls for float, sink, and waterlogging objects, and the visible Float Result, Float Timing, impact, splash, renderer, and pacing readouts match live 1024 x 576 WebGPU physics snapshots",
  },
  {
    id: "G-FG-46",
    blocks: "FG-46",
    evidence:
      "npm run fluid:installed-high-resolution-residual-budget and docs/evidence/FG-46-installed-high-resolution-residual-budget-2026-06-08.json",
    passBar:
      "the installed high-resolution reference packet reports normalized residuals and edge margins for drop, splash, float, sink, and damping comparisons while preserving live 1024 x 576 WebGPU, no-readback, pacing, and operator snapshot provenance",
  },
];

export const fluidGridTasks: FluidGridTask[] = [
  {
    id: "FG-00-T01",
    milestone: "FG-00",
    status: "done",
    title: "Initialize local repository with artifact ignores",
    exitProof: "git status no longer lists node_modules, dist, release, or generated JSON reports as source",
  },
  {
    id: "FG-00-T02",
    milestone: "FG-00",
    status: "done",
    title: "Document the WebGPU fluid-grid remap",
    exitProof: "docs/FLUID_GRID_REMAP.md defines production backend, forbidden Canvas 2D path, solver stages, and completion bar",
  },
  {
    id: "FG-00-T03",
    milestone: "FG-00",
    status: "done",
    title: "Add milestone, task, and gate tracking",
    exitProof: "docs/TRACKING.md and GitHub issue templates define the work ledger",
  },
  {
    id: "FG-00-T04",
    milestone: "FG-00",
    status: "done",
    title: "Create remote GitHub repository and push main",
    exitProof: "origin points to https://github.com/AC-21/ocean.git and main tracks origin/main",
  },
  {
    id: "FG-01-T01",
    milestone: "FG-01",
    status: "done",
    title: "Detect WebGPU adapter and device limits",
    exitProof: "npm run fluid:capability records webgpu-ready, apple / metal-3, high tier, features, and limits",
  },
  {
    id: "FG-01-T02",
    milestone: "FG-01",
    status: "done",
    title: "Add FluidBackend abstraction",
    exitProof: "src/fluid/fluidBackend.ts defines WebGPU production, deterministic CPU reference, and legacy Canvas diagnostic backends",
  },
  {
    id: "FG-01-T03",
    milestone: "FG-01",
    status: "done",
    title: "Expose fluid capability diagnostics in the app",
    exitProof: "OceanPhysicsApp exposes backend, status, tier, grid size, adapter, storage limit, and fallback reason",
  },
  {
    id: "FG-02-T01",
    milestone: "FG-02",
    status: "done",
    title: "Allocate GPU height, velocity, foam, obstacle, depth, and impulse buffers",
    exitProof: "npm run fluid:grid allocates height, height scratch, velocity, foam, obstacle, depth, and impulse buffers",
  },
  {
    id: "FG-02-T02",
    milestone: "FG-02",
    status: "done",
    title: "Implement fixed-substep compute passes",
    exitProof: "fluidGridStepShader runs propagation, damping, depth, obstacle, impulse, and foam updates",
  },
  {
    id: "FG-02-T03",
    milestone: "FG-02",
    status: "done",
    title: "Add CFL, energy, and frame-budget grid checks",
    exitProof: "npm run fluid:grid passes standard and high tiers with CFL 0.566 and no per-frame full-grid readback",
  },
  {
    id: "FG-03-T01",
    milestone: "FG-03",
    status: "done",
    title: "Replace primary water rendering with WebGPU shading",
    exitProof: "npm run fluid:render proves webgpu-grid-primary-v1 with webgpu context and nonblank/varied pixels",
  },
  {
    id: "FG-03-T02",
    milestone: "FG-03",
    status: "done",
    title: "Keep legacy Canvas 2D diagnostic-only",
    exitProof: "OceanPhysicsApp calls legacy Canvas rendering only when WebGPU renderer setup reports an explicit fallback",
  },
  {
    id: "FG-03-T03",
    milestone: "FG-03",
    status: "done",
    title: "Add WebGPU render probe",
    exitProof: "npm run fluid:render rejects legacy Canvas as primary and checks nonblank/varied screenshot pixels",
  },
  {
    id: "FG-04-T01",
    milestone: "FG-04",
    status: "done",
    title: "Write object footprints and displacement impulses into the grid",
    exitProof: "FluidWaterRenderer writes bounded object footprints, depth impedance, and displacement impulse rows into WebGPU storage buffers",
  },
  {
    id: "FG-04-T02",
    milestone: "FG-04",
    status: "done",
    title: "Feed bounded grid coupling forces into rigid-body motion",
    exitProof: "stepSimulation accepts the latest active object-grid coupling summary and consumes vertical and horizontal force deltas",
  },
  {
    id: "FG-04-T03",
    milestone: "FG-04",
    status: "done",
    title: "Verify canonical drop coupling in Electron",
    exitProof: "npm run fluid:coupling passes with active object-grid-v1 coupling, bounded samples, nonzero impulse, and finite force deltas",
  },
  {
    id: "FG-05-T01",
    milestone: "FG-05",
    status: "done",
    title: "Drive splash, foam, and spray from local grid energy",
    exitProof: "gridSplashCouplingFor derives foam, spray, crown height, entrained air, and breakup from local grid energy plus Weber/Froude impact state",
  },
  {
    id: "FG-05-T02",
    milestone: "FG-05",
    status: "done",
    title: "Feed droplet reentry back into the grid",
    exitProof: "FluidWaterRenderer writes foam and secondary reentry impulse samples back into bounded local WebGPU grid rows",
  },
  {
    id: "FG-05-T03",
    milestone: "FG-05",
    status: "done",
    title: "Verify grid-driven splash coupling in Electron",
    exitProof: "npm run fluid:splash passes with grid-splash-v1 foam cells, spray droplets, crown height, and accumulated droplet reentry energy",
  },
  {
    id: "FG-06-T01",
    milestone: "FG-06",
    status: "done",
    title: "Calibrate against reference drop cases",
    exitProof: "Calibration packet covers dense impact, timestep convergence, ice draft, foam settling, splash height, leak sensitivity, and underwater terminal velocity",
  },
  {
    id: "FG-06-T02",
    milestone: "FG-06",
    status: "done",
    title: "Define accepted near-realism error bounds",
    exitProof: "fluidCalibration.ts defines accepted bounds for impact speed, splash height, damping/settling, float behavior, leak sensitivity, and terminal velocity",
  },
  {
    id: "FG-06-T03",
    milestone: "FG-06",
    status: "done",
    title: "Verify the final near-realism evidence packet",
    exitProof: "npm run fluid:calibration passes seven calibration cases and five WebGPU evidence checks with committed evidence",
  },
  {
    id: "FG-07-T01",
    milestone: "FG-07",
    status: "done",
    title: "Define local frame-pacing thresholds",
    exitProof: "fluidLocalCalibration.ts defines p95/p99 frame time, dropped-frame ratio, duplicate water-frame ratio, and WebGPU renderer checks",
  },
  {
    id: "FG-07-T02",
    milestone: "FG-07",
    status: "done",
    title: "Add an Electron local GPU calibration runner",
    exitProof: "npm run fluid:local-calibrate launches the desktop app, records idle/drop frame samples, and writes reports/fluid-local-calibration-latest.json",
  },
  {
    id: "FG-07-T03",
    milestone: "FG-07",
    status: "done",
    title: "Close the local smoothness gate with passing evidence",
    exitProof: "packaged-app calibration passed with timestamp-query GPU samples, high-tier GPU p95 0.0271 ms, idle/drop p99 9.4 ms, and no dropped frames",
  },
  {
    id: "FG-08-T01",
    milestone: "FG-08",
    status: "done",
    title: "Define a bounded fixed-step frame-loop planner",
    exitProof: "fluidFrameLoop.ts plans 1/120 s physics steps with interpolation alpha, accumulated-debt bounds, and a max-substep guard",
  },
  {
    id: "FG-08-T02",
    milestone: "FG-08",
    status: "done",
    title: "Integrate fixed-step planning into OceanPhysicsApp",
    exitProof: "OceanPhysicsApp uses planFluidFrameStep instead of variable render-sized physics steps and exposes window.__fluidFrameLoopStats",
  },
  {
    id: "FG-08-T03",
    milestone: "FG-08",
    status: "done",
    title: "Verify frame-loop hardening in Electron",
    exitProof: "npm run fluid:frame-loop records 420 fixed physics steps, 421 WebGPU water frames, max substeps 1/24, and zero dropped simulation debt",
  },
  {
    id: "FG-09-T01",
    milestone: "FG-09",
    status: "done",
    title: "Capture primary-source solver references",
    exitProof:
      "fluidSolverArchitecture.ts records Stable Fluids, SIGGRAPH fluid simulation notes, heightfield-plus-particle water, Position Based Fluids, GPU shallow-water validation, and rigid-body water interaction sources",
  },
  {
    id: "FG-09-T02",
    milestone: "FG-09",
    status: "done",
    title: "Score and reject candidate solver architectures",
    exitProof:
      "npm run fluid:architecture scores broad heightfield-only, full 3D Eulerian, particle-only, stable-fluids Eulerian, and hybrid heightfield-plus-particles options",
  },
  {
    id: "FG-09-T03",
    milestone: "FG-09",
    status: "done",
    title: "Define the next implementation gates from the selected architecture",
    exitProof:
      "FG-09 evidence names FG-10 through FG-13 gates for reference ingestion, conservative shallow-water upgrade, local particle splash, and coupled calibration",
  },
  {
    id: "FG-10-T01",
    milestone: "FG-10",
    status: "done",
    title: "Add a structured source-backed reference dataset",
    exitProof:
      "data/fluid-reference-cases.json records drop, splash, float, sink, and damping cases with source metadata, units, uncertainty, and explicit expected formulas or bands",
  },
  {
    id: "FG-10-T02",
    milestone: "FG-10",
    status: "done",
    title: "Validate dataset structure and replay methods",
    exitProof:
      "fluidReferenceDataset.ts rejects missing categories, unsupported source locators, missing source IDs, missing units, and non-replayable measurement methods",
  },
  {
    id: "FG-10-T03",
    milestone: "FG-10",
    status: "done",
    title: "Replay CPU reference measurements against the dataset",
    exitProof:
      "npm run fluid:references evaluates entry speed, hydrostatic draft, damped settling, splash height, leak sensitivity, and terminal speed into FG-10 committed evidence",
  },
  {
    id: "FG-11-T01",
    milestone: "FG-11",
    status: "done",
    title: "Add conservative WebGPU shallow-water state",
    exitProof:
      "fluidShallowWater.ts defines conservative-shallow-water-v1 with ping-pong height, x/y momentum, and dry-mask buffers",
  },
  {
    id: "FG-11-T02",
    milestone: "FG-11",
    status: "done",
    title: "Track mass, momentum, CFL, and wet/dry diagnostics",
    exitProof:
      "runShallowWaterBenchmark reports massRelativeDrift, momentumDampingRatio, negativeDepthCells, dryCellsWithWater, wet/dry counts, CFL, wall timing, and timestamp-query GPU timing",
  },
  {
    id: "FG-11-T03",
    milestone: "FG-11",
    status: "done",
    title: "Verify standard and high tier local WebGPU shallow-water evidence",
    exitProof:
      "npm run fluid:shallow-water passes standard and high tiers with zero reported mass drift, stable wet/dry cells, no negative depths, and committed FG-11 evidence",
  },
  {
    id: "FG-12-T01",
    milestone: "FG-12",
    status: "done",
    title: "Add localized WebGPU particle splash state",
    exitProof:
      "fluidParticleSplash.ts defines localized-particle-splash-v1 with deterministic particle seeding from displaced water mass, Weber/Froude impact state, and reference splash bands",
  },
  {
    id: "FG-12-T02",
    milestone: "FG-12",
    status: "done",
    title: "Track particle mass, momentum, reentry, foam, and grid feedback",
    exitProof:
      "runParticleSplashBenchmark reports mass fraction, momentum fraction, crown height, reentry energy, foam contribution, bounded feedback samples, and timestamp-query GPU timing",
  },
  {
    id: "FG-12-T03",
    milestone: "FG-12",
    status: "done",
    title: "Verify standard and high tier local particle evidence",
    exitProof:
      "npm run fluid:particles passes standard and high tiers with bounded mass/momentum, reference-band crown height, local reentry feedback, and committed FG-12 evidence",
  },
  {
    id: "FG-13-T01",
    milestone: "FG-13",
    status: "done",
    title: "Compose packaged runtime, references, and solver evidence",
    exitProof:
      "fluidCoupledCalibration.ts composes packaged-app local calibration, FG-10 reference replay, FG-11 shallow-water evidence, and FG-12 particle-splash evidence",
  },
  {
    id: "FG-13-T02",
    milestone: "FG-13",
    status: "done",
    title: "Check coupled calibration measurements and solver bounds",
    exitProof:
      "createFluidCoupledCalibrationReport verifies drop speed, CPU/particle splash crown agreement, float/sink/damping references, frame pacing, mass drift, spray mass, reentry, and readback discipline",
  },
  {
    id: "FG-13-T03",
    milestone: "FG-13",
    status: "done",
    title: "Verify packaged coupled calibration evidence",
    exitProof:
      "npm run fluid:coupled-calibrate packages the app, passes packaged WebGPU runtime calibration, and writes committed FG-13 coupled evidence",
  },
  {
    id: "FG-14-T01",
    milestone: "FG-14",
    status: "done",
    title: "Add live particle feedback summary",
    exitProof:
      "fluidParticleSplash.ts derives localized-particle-splash-live-v1 from displaced mass, Weber/Froude state, splash reference bands, and reentry energy",
  },
  {
    id: "FG-14-T02",
    milestone: "FG-14",
    status: "done",
    title: "Feed live particles into WebGPU renderer telemetry and grid rows",
    exitProof:
      "FluidWaterRenderer exposes lastParticleSplash, writes particle foam/impulse feedback into bounded grid rows, and passes particle crown/density/reentry into render uniforms",
  },
  {
    id: "FG-14-T03",
    milestone: "FG-14",
    status: "done",
    title: "Verify packaged live particle renderer evidence",
    exitProof:
      "npm run fluid:live-particles launches the packaged app, drops the concrete cube, and records active localized-particle-splash-live-v1 telemetry with bounded mass/momentum and WebGPU renderer context",
  },
  {
    id: "FG-15-T01",
    milestone: "FG-15",
    status: "done",
    title: "Add bounded pressure-gradient shallow-water mode",
    exitProof:
      "fluidShallowWater.ts exposes bounded-pressure-gradient-v1 with nonzero pressure gain, slope limiting, momentum limiting, and preserved conservative baseline mode",
  },
  {
    id: "FG-15-T02",
    milestone: "FG-15",
    status: "done",
    title: "Report pressure energy, work, momentum, and wet/dry diagnostics",
    exitProof:
      "runShallowWaterBenchmark reports pressure work estimate, energy drift, pressure momentum budget ratio, slope-limited cells, dry leakage, negative depths, and timestamp-query timing",
  },
  {
    id: "FG-15-T03",
    milestone: "FG-15",
    status: "done",
    title: "Verify pressure-gradient WebGPU evidence",
    exitProof:
      "npm run fluid:pressure passes standard and high WebGPU tiers and writes docs/evidence/FG-15-pressure-gradient-2026-06-08.json",
  },
  {
    id: "FG-16-T01",
    milestone: "FG-16",
    status: "done",
    title: "Add live renderer pressure-gradient compute state",
    exitProof:
      "FluidWaterRenderer allocates x/y momentum ping-pong buffers and runs fluidWaterPressureStepShader with pressure gain, slope limiting, momentum limiting, depth, obstacle, impulse, and foam state",
  },
  {
    id: "FG-16-T02",
    milestone: "FG-16",
    status: "done",
    title: "Expose live pressure renderer telemetry",
    exitProof:
      "FluidWaterRenderer stats and canvas dataset expose bounded-pressure-gradient-live-v1, pressure gain, slope limit, momentum limit, CFL, storage, work, impulse energy, and no-full-grid-readback telemetry",
  },
  {
    id: "FG-16-T03",
    milestone: "FG-16",
    status: "done",
    title: "Verify packaged live pressure renderer evidence",
    exitProof:
      "npm run fluid:live-pressure launches the packaged app, drops the concrete cube, and records active live pressure plus live particle telemetry in docs/evidence/FG-16-live-pressure-2026-06-08.json",
  },
  {
    id: "FG-17-T01",
    milestone: "FG-17",
    status: "done",
    title: "Derive bounded pressure force feedback",
    exitProof:
      "livePressureSummaryFor reports nonzero bounded vertical and horizontal pressure force deltas, pressure grid velocity, and force bounds from live pressure work, impulse, displaced volume, and object motion",
  },
  {
    id: "FG-17-T02",
    milestone: "FG-17",
    status: "done",
    title: "Feed pressure forces into the rigid-body simulation loop",
    exitProof:
      "OceanPhysicsApp combines pressure force deltas with object-grid force deltas in gridCouplingRef and exposes window.__fluidGridCouplingForces for the next fixed step consumed by stepSimulation",
  },
  {
    id: "FG-17-T03",
    milestone: "FG-17",
    status: "done",
    title: "Verify packaged pressure force feedback evidence",
    exitProof:
      "npm run fluid:live-pressure-feedback launches the packaged app, drops the concrete cube, and records active pressure force deltas plus combined consumed grid coupling in docs/evidence/FG-17-pressure-feedback-2026-06-08.json",
  },
  {
    id: "FG-18-T01",
    milestone: "FG-18",
    status: "done",
    title: "Expose live reference outcome snapshots",
    exitProof:
      "OceanPhysicsApp exposes window.__oceanPhysicsSnapshot and window.__oceanPhysicsScenarioControls with live drop, impact, float prediction, damping, sink, and diagnostic values",
  },
  {
    id: "FG-18-T02",
    milestone: "FG-18",
    status: "done",
    title: "Verify packaged live reference outcomes",
    exitProof:
      "npm run fluid:live-reference-outcomes drives the packaged app through concrete, ice, foam, and leaky-drum reference scenarios and compares live outcomes against accepted bands",
  },
  {
    id: "FG-18-T03",
    milestone: "FG-18",
    status: "done",
    title: "Preserve WebGPU telemetry during reference replay",
    exitProof:
      "FG-18 evidence records WebGPU renderer context, bounded pressure feedback, live particles, object-grid coupling, no full-grid readback, and fixed-step frame-loop health",
  },
  {
    id: "FG-19-T01",
    milestone: "FG-19",
    status: "done",
    title: "Separate full diagnostics from per-frame motion snapshots",
    exitProof:
      "OceanPhysicsApp publishes fast motion snapshots every frame while scenario controls can request full prediction and equilibrium snapshots on demand",
  },
  {
    id: "FG-19-T02",
    milestone: "FG-19",
    status: "done",
    title: "Measure packaged display pacing under active fluid workloads",
    exitProof:
      "fluidDisplayPacing.report.ts samples idle, concrete impact, and foam damping in the packaged app with RAF frame timing, long-task, WebGPU renderer, pressure, particle, and coupling telemetry",
  },
  {
    id: "FG-19-T03",
    milestone: "FG-19",
    status: "done",
    title: "Verify smoothness evidence and diagnostic throttling",
    exitProof:
      "npm run fluid:display-pacing passes with worst p95 9.2 ms, p99 9.3 ms, 0.13% dropped-frame ratio, zero long-task duration, and zero dropped simulation debt",
  },
  {
    id: "FG-20-T01",
    milestone: "FG-20",
    status: "done",
    title: "Define ultra-tier resolution scaling report",
    exitProof:
      "fluidResolutionScaling.ts requires standard, high, and ultra evidence with GPU timestamp timing, monotonic cell/storage growth, no full-grid readback, and bounded ultra/high p95 ratios",
  },
  {
    id: "FG-20-T02",
    milestone: "FG-20",
    status: "done",
    title: "Measure packaged standard/high/ultra WebGPU tiers",
    exitProof:
      "fluidResolutionScaling.report.ts launches the packaged app and runs grid, pressure shallow-water, and particle splash benchmarks for standard, high, and ultra tiers",
  },
  {
    id: "FG-20-T03",
    milestone: "FG-20",
    status: "done",
    title: "Verify local ultra-tier scaling evidence",
    exitProof:
      "npm run fluid:resolution-scale passes with ultra 331776 cells, grid p95 0.0903 ms, pressure p95 0.0733 ms, particle p95 0.0288 ms, and 17.97 MiB measured storage",
  },
  {
    id: "FG-21-T01",
    milestone: "FG-21",
    status: "done",
    title: "Add opt-in live renderer tier selection",
    exitProof:
      "Electron passes OCEAN_LAB_FLUID_TIER as a fluidTier query parameter and OceanPhysicsApp routes it through detectFluidCapability without bypassing fallback limits",
  },
  {
    id: "FG-21-T02",
    milestone: "FG-21",
    status: "done",
    title: "Verify packaged ultra renderer activation",
    exitProof:
      "fluidUltraRenderer.report.ts launches the packaged app with OCEAN_LAB_FLUID_TIER=ultra and waits for selected tier ultra, grid 768 x 432, renderer webgpu-grid-primary-v1, and canvas water tier ultra",
  },
  {
    id: "FG-21-T03",
    milestone: "FG-21",
    status: "done",
    title: "Measure ultra live display pacing",
    exitProof:
      "npm run fluid:ultra-renderer passes idle and concrete-impact ultra display pacing with worst p95 9.3 ms, p99 9.4 ms, zero dropped-frame ratio, and zero dropped simulation debt",
  },
  {
    id: "FG-22-T01",
    milestone: "FG-22",
    status: "done",
    title: "Define the ultra reference outcome gate contract",
    exitProof:
      "fluidUltraReferenceOutcomes.ts defines the FG-22 ultra reference outcome gate, required comparison IDs, required categories, and failure checks for tier, grid, telemetry, coupling, and frame-loop health",
  },
  {
    id: "FG-22-T02",
    milestone: "FG-22",
    status: "done",
    title: "Drive live reference scenarios on the ultra renderer",
    exitProof:
      "fluidUltraReferenceOutcomes.report.ts launches the packaged app with OCEAN_LAB_FLUID_TIER=ultra and drives concrete, ice, foam, sink, and leaky-drum live reference scenarios",
  },
  {
    id: "FG-22-T03",
    milestone: "FG-22",
    status: "done",
    title: "Verify ultra live reference evidence",
    exitProof:
      "npm run fluid:ultra-reference-outcomes passes with selected tier ultra, grid 768 x 432, 5 live cases, 10 reference comparisons, active pressure/particles/coupling during concrete impact, and no full-grid readback",
  },
  {
    id: "FG-23-T01",
    milestone: "FG-23",
    status: "done",
    title: "Add adaptive fluid tier selection",
    exitProof:
      "fluidAdaptiveTier.ts parses explicit, calibrated-auto, default-high, and auto-fallback-high modes while preserving explicit user tier overrides",
  },
  {
    id: "FG-23-T02",
    milestone: "FG-23",
    status: "done",
    title: "Compose local GPU headroom into a tier recommendation",
    exitProof:
      "fluidAdaptiveTier.ts recommends ultra only when FG-20 resolution scaling, FG-21 ultra renderer pacing, and FG-22 ultra reference outcomes pass local headroom thresholds",
  },
  {
    id: "FG-23-T03",
    milestone: "FG-23",
    status: "done",
    title: "Verify calibrated-auto packaged runtime selection",
    exitProof:
      "npm run fluid:adaptive-tier passes with recommendation ultra, calibrated-auto runtime mode, selected grid 768 x 432, WebGPU renderer, and committed FG-23 evidence",
  },
  {
    id: "FG-24-T01",
    milestone: "FG-24",
    status: "done",
    title: "Add a persisted calibration storage profile",
    exitProof:
      "electron/storage.cjs allowlists fluid-calibration.v1.json and storage tests cover safe read/write behavior for the fluid calibration profile",
  },
  {
    id: "FG-24-T02",
    milestone: "FG-24",
    status: "done",
    title: "Load saved calibration during packaged startup",
    exitProof:
      "electron/main.cjs reads a passing ocean-fluid-calibration-profile-v1 profile and supplies fluidTier=auto plus calibratedFluidTier unless an explicit environment override is present",
  },
  {
    id: "FG-24-T03",
    milestone: "FG-24",
    status: "done",
    title: "Verify persisted calibration runtime behavior",
    exitProof:
      "npm run fluid:persisted-calibration passes with env calibrated tier absent, profile-selected ultra, main-process profile read, calibrated-auto runtime mode, selected grid 768 x 432, and WebGPU renderer",
  },
  {
    id: "FG-25-T01",
    milestone: "FG-25",
    status: "done",
    title: "Add a reusable calibration profile installer",
    exitProof:
      "fluidInstalledCalibration.ts installs a passing FG-23-derived ocean-fluid-calibration-profile-v1 profile through the desktop storage helper and records a round-trip receipt",
  },
  {
    id: "FG-25-T02",
    milestone: "FG-25",
    status: "done",
    title: "Verify env-free installed-profile reuse after relaunch",
    exitProof:
      "fluidInstalledCalibration.report.ts launches the packaged app twice from the same installed fluid-calibration.v1.json with OCEAN_LAB_FLUID_TIER and OCEAN_LAB_CALIBRATED_FLUID_TIER absent",
  },
  {
    id: "FG-25-T03",
    milestone: "FG-25",
    status: "done",
    title: "Close the installed calibration evidence gate",
    exitProof:
      "npm run fluid:installed-calibration passes with installed tier ultra, reused main-process profile selection, two calibrated-auto runtime probes, selected grid 768 x 432, and WebGPU renderer",
  },
  {
    id: "FG-26-T01",
    milestone: "FG-26",
    status: "done",
    title: "Add installed-profile display pacing validation",
    exitProof:
      "fluidInstalledDisplayPacing.ts wraps the display pacing gate with installed-profile, env-free, calibrated-auto ultra sample provenance checks",
  },
  {
    id: "FG-26-T02",
    milestone: "FG-26",
    status: "done",
    title: "Sample normal installed-calibration startup smoothness",
    exitProof:
      "fluidInstalledDisplayPacing.report.ts installs the calibration profile, launches the packaged app with no fluid-tier env vars, and samples idle, concrete-impact, and foam-damping pacing",
  },
  {
    id: "FG-26-T03",
    milestone: "FG-26",
    status: "done",
    title: "Close the installed display pacing gate",
    exitProof:
      "npm run fluid:installed-display-pacing passes with calibrated-auto ultra samples, selected grid 768 x 432, WebGPU renderer, smooth frame pacing, and committed FG-26 evidence",
  },
  {
    id: "FG-27-T01",
    milestone: "FG-27",
    status: "done",
    title: "Add calibration profile provenance",
    exitProof:
      "fluidPersistedCalibration.ts writes appVersion plus FG-23 source evidence into ocean-fluid-calibration-profile-v1 profiles and validates that provenance",
  },
  {
    id: "FG-27-T02",
    milestone: "FG-27",
    status: "done",
    title: "Reject stale calibration profiles during Electron startup",
    exitProof:
      "electron/main.cjs refuses missing, failed, malformed, or wrong-app-version calibration profiles before setting calibratedFluidTier",
  },
  {
    id: "FG-27-T03",
    milestone: "FG-27",
    status: "done",
    title: "Verify valid and stale profile runtime behavior",
    exitProof:
      "npm run fluid:calibration-freshness passes with a current profile selecting calibrated-auto ultra and a stale app-version profile falling back to default high",
  },
  {
    id: "FG-28-T01",
    milestone: "FG-28",
    status: "done",
    title: "Bind calibration profiles to WebGPU capability provenance",
    exitProof:
      "fluidPersistedCalibration.ts writes FG-01 adapter, feature, limit, backend, status, and fingerprint provenance into ocean-fluid-calibration-profile-v1 profiles",
  },
  {
    id: "FG-28-T02",
    milestone: "FG-28",
    status: "done",
    title: "Downgrade copied calibration profiles at renderer runtime",
    exitProof:
      "OceanPhysicsApp compares the saved calibratedFluidFingerprint with the live WebGPU capability fingerprint and selects calibration-provenance-fallback-high on mismatch",
  },
  {
    id: "FG-28-T03",
    milestone: "FG-28",
    status: "done",
    title: "Verify valid, mismatched, and tampered profile behavior",
    exitProof:
      "npm run fluid:calibration-provenance passes with matching calibrated-auto ultra, copied-profile high fallback, tampered-profile default-high fallback, and committed FG-28 evidence",
  },
  {
    id: "FG-29-T01",
    milestone: "FG-29",
    status: "done",
    title: "Define sustained calibrated workload pacing checks",
    exitProof:
      "fluidSustainedInteractionPacing.ts requires a multi-action mixed-object workload, calibrated-auto ultra samples, WebGPU pressure/particles/coupling telemetry, smooth frame pacing, and zero fixed-step debt",
  },
  {
    id: "FG-29-T02",
    milestone: "FG-29",
    status: "done",
    title: "Drive sustained packaged interaction evidence",
    exitProof:
      "fluidSustainedInteractionPacing.report.ts installs the calibration profile, launches the packaged app with no fluid-tier environment variables, and samples concrete, foam, leaky-drum, and steel-sphere drops in one sustained run",
  },
  {
    id: "FG-29-T03",
    milestone: "FG-29",
    status: "done",
    title: "Close sustained interaction pacing gate",
    exitProof:
      "npm run fluid:sustained-interaction-pacing passes with calibrated-auto ultra, 768 x 432 WebGPU samples, active physics telemetry, smooth sustained pacing, and committed FG-29 evidence",
  },
  {
    id: "FG-30-T01",
    milestone: "FG-30",
    status: "done",
    title: "Discover local cached Electron package artifacts",
    exitProof:
      "electron_zip_cache.mjs finds the exact electron-v42.3.3-darwin-arm64.zip artifact in local Electron cache roots and package_mac.mjs passes electron-zip-dir when present",
  },
  {
    id: "FG-30-T02",
    milestone: "FG-30",
    status: "done",
    title: "Compose cached packaging with sustained calibrated evidence",
    exitProof:
      "fluidPackageReproducibility.report.ts rebuilds the package through scripts/package_mac.mjs, records the cached zip proof, and runs the sustained interaction report against the freshly packaged app",
  },
  {
    id: "FG-30-T03",
    milestone: "FG-30",
    status: "done",
    title: "Close local package reproducibility gate",
    exitProof:
      "npm run fluid:package-reproducibility passes with a local cached Electron zip, packaged app path, calibrated-auto ultra runtime, smooth sustained pacing, and committed FG-30 evidence",
  },
  {
    id: "FG-31-T01",
    milestone: "FG-31",
    status: "done",
    title: "Define live impact energy accounting",
    exitProof:
      "fluidImpactEnergyBudget.ts computes impact kinetic energy and bounded pressure, splash, foam, potential, particle reentry, and mass-ratio channels from FG-22 live ultra telemetry",
  },
  {
    id: "FG-31-T02",
    milestone: "FG-31",
    status: "done",
    title: "Trace impact budget to reference sources",
    exitProof:
      "FG-31 source trace requires the NIST gravity source plus FG-06 calibration and FG-09 solver-architecture evidence through the structured reference dataset",
  },
  {
    id: "FG-31-T03",
    milestone: "FG-31",
    status: "done",
    title: "Close live impact energy budget gate",
    exitProof:
      "npm run fluid:impact-energy-budget passes with ultra 768 x 432 WebGPU telemetry, active pressure/particle/splash/coupling channels, no full-grid readback, and committed FG-31 evidence",
  },
  {
    id: "FG-32-T01",
    milestone: "FG-32",
    status: "done",
    title: "Define post-impact surface recovery metrics",
    exitProof:
      "fluidSurfaceRecovery.ts measures visual luma variance, color-bucket complexity, bright foam fraction, pressure work, foam energy, water-frame delta, fixed-step debt, and no-readback telemetry",
  },
  {
    id: "FG-32-T02",
    milestone: "FG-32",
    status: "done",
    title: "Sample packaged ultra recovery screenshots",
    exitProof:
      "fluidSurfaceRecovery.report.ts launches the packaged ultra renderer, drops an 8 m concrete cube into a 22 m calm tank, and samples five post-impact WebGPU canvas screenshots",
  },
  {
    id: "FG-32-T03",
    milestone: "FG-32",
    status: "done",
    title: "Close live surface recovery damping gate",
    exitProof:
      "npm run fluid:surface-recovery passes with visual stddev, color-bucket, pressure-work, and foam-energy recovery ratios under thresholds plus committed FG-32 evidence",
  },
  {
    id: "FG-33-T01",
    milestone: "FG-33",
    status: "done",
    title: "Define desktop launcher install checks",
    exitProof:
      "fluidDesktopLauncher.ts requires an install root outside the workspace, a Desktop symlink that resolves to the app bundle, codesign verification, clean signing-relevant xattrs, and nonblank WebGPU render evidence",
  },
  {
    id: "FG-33-T02",
    milestone: "FG-33",
    status: "done",
    title: "Install and probe the Desktop launcher target",
    exitProof:
      "fluidDesktopLauncher.report.ts packages to ~/Applications/Ocean Impact Lab Builds, verifies /Users/sasha/Desktop/Ocean Impact Lab.app, and runs fluid_render_probe.mjs through that exact launcher executable with default user data",
  },
  {
    id: "FG-33-T03",
    milestone: "FG-33",
    status: "done",
    title: "Close desktop launcher reproducibility gate",
    exitProof:
      "npm run fluid:desktop-launcher passes with a signed app bundle, clean Desktop symlink target, nonblank/varied WebGPU pixels, and committed FG-33 evidence",
  },
  {
    id: "FG-34-T01",
    milestone: "FG-34",
    status: "done",
    title: "Define default-profile calibration checks",
    exitProof:
      "fluidDefaultProfileCalibration.ts requires real Ocean Impact Lab default storage, a valid FG-23 calibration profile, no fluid-tier environment overrides, calibrated-auto ultra selection, and nonblank WebGPU pixels",
  },
  {
    id: "FG-34-T02",
    milestone: "FG-34",
    status: "done",
    title: "Install calibration into the real desktop profile",
    exitProof:
      "fluidDefaultProfileCalibration.report.ts writes fluid-calibration.v1.json into /Users/sasha/Library/Application Support/Ocean Impact Lab/harborline-game and verifies the profile round-trip",
  },
  {
    id: "FG-34-T03",
    milestone: "FG-34",
    status: "done",
    title: "Close default-profile calibrated Desktop launch gate",
    exitProof:
      "npm run fluid:default-profile-calibration launches /Users/sasha/Desktop/Ocean Impact Lab.app without fluid-tier env overrides and proves calibrated-auto ultra on the 768 x 432 WebGPU renderer",
  },
  {
    id: "FG-35-T01",
    milestone: "FG-35",
    status: "done",
    title: "Define visible Desktop window checks",
    exitProof:
      "fluidDesktopVisibility.ts requires FG-34 calibrated-auto ultra evidence, an installed-bundle process, a visible frontmost Ocean Impact Lab window, and nonblank/varied ocean viewport pixels",
  },
  {
    id: "FG-35-T02",
    milestone: "FG-35",
    status: "done",
    title: "Probe normal macOS Desktop launch visibility",
    exitProof:
      "fluidDesktopVisibility.report.ts opens /Users/sasha/Desktop/Ocean Impact Lab.app through macOS open, foregrounds the app, captures the visible window, and samples the ocean viewport crop",
  },
  {
    id: "FG-35-T03",
    milestone: "FG-35",
    status: "done",
    title: "Close visible calibrated Desktop window gate",
    exitProof:
      "npm run fluid:desktop-visibility passes with the installed calibrated process, a frontmost visible window, and committed nonblack ocean viewport evidence",
  },
  {
    id: "FG-36-T01",
    milestone: "FG-36",
    status: "done",
    title: "Define installed calibrated reference outcome checks",
    exitProof:
      "fluidInstalledReferenceOutcomes.ts wraps the FG-22 reference comparison packet with default-profile, no-env-override, calibrated-auto ultra, Desktop launcher, pressure, particles, coupling, and no-readback checks",
  },
  {
    id: "FG-36-T02",
    milestone: "FG-36",
    status: "done",
    title: "Drive reference outcomes through the installed Desktop profile",
    exitProof:
      "fluidInstalledReferenceOutcomes.report.ts launches /Users/sasha/Desktop/Ocean Impact Lab.app with no fluid-tier or userData env overrides and drives concrete, ice, foam, concrete sink, and leaky-drum scenarios",
  },
  {
    id: "FG-36-T03",
    milestone: "FG-36",
    status: "done",
    title: "Close installed calibrated reference outcome gate",
    exitProof:
      "npm run fluid:installed-reference-outcomes passes with calibrated-auto ultra, five live reference cases, ten comparisons, active WebGPU pressure/particles/coupling, and committed evidence",
  },
  {
    id: "FG-37-T01",
    milestone: "FG-37",
    status: "done",
    title: "Define installed reference pacing envelope checks",
    exitProof:
      "fluidInstalledReferencePacing.ts requires passing FG-36 evidence, no fluid-tier or userData env overrides, calibrated-auto ultra 768 x 432 samples, WebGPU renderer/context, smooth frame pacing, pressure/particle/coupling telemetry where expected, and no full-grid readback",
  },
  {
    id: "FG-37-T02",
    milestone: "FG-37",
    status: "done",
    title: "Measure reference-category pacing through the installed Desktop app",
    exitProof:
      "fluidInstalledReferencePacing.report.ts launches /Users/sasha/Desktop/Ocean Impact Lab.app with no fluid-tier or userData env overrides and samples concrete drop/splash, ice float, foam damping, concrete sink, and leaky-drum sink pacing windows",
  },
  {
    id: "FG-37-T03",
    milestone: "FG-37",
    status: "done",
    title: "Close installed reference pacing envelope gate",
    exitProof:
      "npm run fluid:installed-reference-pacing passes with composed FG-36 reference evidence, calibrated-auto ultra runtime, five reference-category pacing scenarios, smooth p95/p99 frame pacing, active WebGPU telemetry, and committed evidence",
  },
  {
    id: "FG-38-T01",
    milestone: "FG-38",
    status: "done",
    title: "Add benchmark-only explicit high-resolution grid dimensions",
    exitProof:
      "fluidGridGpu, fluidShallowWater, and fluidParticleSplash accept explicit benchmark gridDimensions while production fluidGridTiers and runtime selection remain capped at ultra",
  },
  {
    id: "FG-38-T02",
    milestone: "FG-38",
    status: "done",
    title: "Measure local high-resolution WebGPU headroom",
    exitProof:
      "fluidHighResolutionHeadroom.report.ts launches the packaged app and benchmarks 1024 x 576 and 1280 x 720 WebGPU grid, pressure-gradient shallow-water, and particle-splash workloads with timestamp queries",
  },
  {
    id: "FG-38-T03",
    milestone: "FG-38",
    status: "done",
    title: "Close experimental high-resolution headroom gate",
    exitProof:
      "npm run fluid:high-resolution-headroom passes with benchmark-only grids larger than ultra, bounded p95 GPU timing, bounded wall timing, memory below local storage limits, no full-grid readback, and committed evidence",
  },
  {
    id: "FG-39-T01",
    milestone: "FG-39",
    status: "done",
    title: "Add opt-in live renderer grid override",
    exitProof:
      "electron/main.cjs accepts only benchmark-approved OCEAN_LAB_EXPERIMENTAL_FLUID_GRID values and OceanPhysicsApp passes the parsed runtime grid override into createFluidWaterRenderer",
  },
  {
    id: "FG-39-T02",
    milestone: "FG-39",
    status: "done",
    title: "Measure experimental live high-resolution renderer",
    exitProof:
      "fluidExperimentalLiveGrid.report.ts launches the packaged app with OCEAN_LAB_FLUID_TIER=ultra and OCEAN_LAB_EXPERIMENTAL_FLUID_GRID=1024x576, then waits for the canvas to report a live 1024 x 576 WebGPU grid",
  },
  {
    id: "FG-39-T03",
    milestone: "FG-39",
    status: "done",
    title: "Close experimental live high-resolution grid gate",
    exitProof:
      "npm run fluid:experimental-live-grid passes with smooth idle and concrete-impact display pacing on the live high-resolution grid plus committed FG-39 evidence",
  },
  {
    id: "FG-40-T01",
    milestone: "FG-40",
    status: "done",
    title: "Define experimental high-resolution reference outcome checks",
    exitProof:
      "fluidExperimentalReferenceOutcomes.ts requires capability selection to remain ultra 768 x 432 while the live renderer grid is 1024 x 576 and all reference comparisons, pressure, particle, coupling, frame-loop, and no-readback telemetry pass",
  },
  {
    id: "FG-40-T02",
    milestone: "FG-40",
    status: "done",
    title: "Replay reference outcomes through the experimental live grid",
    exitProof:
      "fluidExperimentalReferenceOutcomes.report.ts launches the packaged app with OCEAN_LAB_FLUID_TIER=ultra and OCEAN_LAB_EXPERIMENTAL_FLUID_GRID=1024x576, then replays concrete drop/splash, ice float, foam damping, concrete sink, and leaky-drum sink reference cases",
  },
  {
    id: "FG-40-T03",
    milestone: "FG-40",
    status: "done",
    title: "Close experimental high-resolution reference outcome gate",
    exitProof:
      "npm run fluid:experimental-reference-outcomes passes with all reference comparison bands, active WebGPU telemetry, fixed-step frame-loop stats, no-readback proof, and committed FG-40 evidence",
  },
  {
    id: "FG-41-T01",
    milestone: "FG-41",
    status: "done",
    title: "Store optional high-resolution runtime-grid calibration",
    exitProof:
      "fluidPersistedCalibration.ts validates an optional runtimeGrid profile field sourced from passing FG-40 evidence while existing tier-only profiles remain valid",
  },
  {
    id: "FG-41-T02",
    milestone: "FG-41",
    status: "done",
    title: "Read persisted runtime grid during packaged startup",
    exitProof:
      "electron/main.cjs reads the stored runtimeGrid profile field and forwards experimentalFluidGrid=1024x576 when no manual grid environment override is present",
  },
  {
    id: "FG-41-T03",
    milestone: "FG-41",
    status: "done",
    title: "Close persisted high-resolution runtime-grid calibration gate",
    exitProof:
      "npm run fluid:high-resolution-calibration passes with a stored FG-40 runtime grid, no fluid/grid env overrides, calibrated-auto ultra capability, and a live 1024 x 576 WebGPU canvas",
  },
  {
    id: "FG-42-T01",
    milestone: "FG-42",
    status: "done",
    title: "Install high-resolution runtime grid into the default Desktop profile",
    exitProof:
      "fluidInstalledHighResolutionReferencePacing.report.ts writes a provenance-valid FG-23 profile with FG-40 runtimeGrid into /Users/sasha/Library/Application Support/Ocean Impact Lab/harborline-game/fluid-calibration.v1.json",
  },
  {
    id: "FG-42-T02",
    milestone: "FG-42",
    status: "done",
    title: "Replay reference outcomes from the installed high-resolution path",
    exitProof:
      "fluidInstalledHighResolutionReferencePacing.report.ts launches /Users/sasha/Desktop/Ocean Impact Lab.app without OCEAN_LAB_FLUID_TIER, OCEAN_LAB_CALIBRATED_FLUID_TIER, OCEAN_LAB_EXPERIMENTAL_FLUID_GRID, or HARBORLINE_USER_DATA_DIR and replays the FG-40 reference cases at live 1024 x 576",
  },
  {
    id: "FG-42-T03",
    milestone: "FG-42",
    status: "done",
    title: "Close installed high-resolution reference pacing gate",
    exitProof:
      "npm run fluid:installed-high-resolution-reference-pacing passes with calibrated-auto ultra, capability grid 768 x 432, live canvas 1024 x 576, five reference pacing scenarios, p99 frame time under 10 ms, active pressure/particles/coupling, and no full-grid readback",
  },
  {
    id: "FG-43-T01",
    milestone: "FG-43",
    status: "done",
    title: "Define the installed high-resolution float/sink envelope gate",
    exitProof:
      "fluidInstalledHighResolutionFloatSinkEnvelope.ts requires every object preset, all three prediction outcomes, default high-resolution storage, calibrated-auto ultra runtime, live 1024 x 576 WebGPU samples, active pressure/particles/coupling, no full-grid readback, and nonblack viewport pixels",
  },
  {
    id: "FG-43-T02",
    milestone: "FG-43",
    status: "done",
    title: "Measure every object preset through the installed high-resolution app",
    exitProof:
      "fluidInstalledHighResolutionFloatSinkEnvelope.report.ts launches /Users/sasha/Desktop/Ocean Impact Lab.app without fluid-tier, grid, or userData env overrides, captures the high-resolution WebGPU canvas, and records float/sink prediction plus live phase evidence for foam, pine, ice, drum, hardwood, concrete, steel, and aluminum presets",
  },
  {
    id: "FG-43-T03",
    milestone: "FG-43",
    status: "done",
    title: "Close installed high-resolution float/sink envelope gate",
    exitProof:
      "npm run fluid:installed-high-resolution-float-sink passes with eight presets, stable floaters, immediate sinkers, accelerated waterlogging threshold proof, nonblank high-resolution viewport pixels, max p99 frame time under 10 ms, and committed FG-43 evidence",
  },
  {
    id: "FG-44-T01",
    milestone: "FG-44",
    status: "done",
    title: "Define installed high-resolution Desktop visibility checks",
    exitProof:
      "fluidInstalledHighResolutionDesktopVisibility.ts requires passing FG-43 high-resolution evidence, default runtime-grid storage, the installed Desktop bundle process, a visible frontmost window, and nonblank varied ocean viewport pixels",
  },
  {
    id: "FG-44-T02",
    milestone: "FG-44",
    status: "done",
    title: "Capture the normal macOS Desktop high-resolution viewport",
    exitProof:
      "fluidInstalledHighResolutionDesktopVisibility.report.ts opens /Users/sasha/Desktop/Ocean Impact Lab.app through macOS open, foregrounds it, screenshots the visible display, crops the ocean viewport, and ties the proof to fresh FG-43 source evidence",
  },
  {
    id: "FG-44-T03",
    milestone: "FG-44",
    status: "done",
    title: "Close installed high-resolution Desktop visibility gate",
    exitProof:
      "npm run fluid:installed-high-resolution-desktop-visibility passes with a normal visible Desktop launch, source FG-43 live 1024 x 576 evidence, and committed nonblack high-resolution viewport evidence",
  },
  {
    id: "FG-45-T01",
    milestone: "FG-45",
    status: "done",
    title: "Define installed high-resolution operator readout checks",
    exitProof:
      "fluidInstalledHighResolutionOperatorReadout.ts requires fresh FG-44 visibility evidence, live 1024 x 576 WebGPU runtime, visible preset and Drop clicks, synchronized Float Result, Float Timing, impact, splash, renderer, and no-readback telemetry for float, sink, and waterlogging outcomes",
  },
  {
    id: "FG-45-T02",
    milestone: "FG-45",
    status: "done",
    title: "Drive operator controls in the installed high-resolution app",
    exitProof:
      "fluidInstalledHighResolutionOperatorReadout.report.ts launches /Users/sasha/Desktop/Ocean Impact Lab.app without fluid-tier, grid, or userData env overrides, clicks the actual preset buttons and Drop control, and scrapes the visible readout panels against live physics snapshots",
  },
  {
    id: "FG-45-T03",
    milestone: "FG-45",
    status: "done",
    title: "Close installed high-resolution operator readout gate",
    exitProof:
      "npm run fluid:installed-high-resolution-operator-readout passes with source FG-44 visible-screen proof, live 1024 x 576 WebGPU runtime, operator-driven float/sink/waterlogging readouts, smooth pacing, and committed FG-45 evidence",
  },
  {
    id: "FG-46-T01",
    milestone: "FG-46",
    status: "done",
    title: "Define installed high-resolution residual budget checks",
    exitProof:
      "fluidInstalledHighResolutionResidualBudget.ts consumes FG-42 and FG-45 evidence, computes normalized residuals plus nearest-bound margins, and rejects missing categories, tolerance-edge comparisons, UI-only readouts, fallback grids, and lost no-readback provenance",
  },
  {
    id: "FG-46-T02",
    milestone: "FG-46",
    status: "done",
    title: "Generate installed high-resolution residual budget evidence",
    exitProof:
      "fluidInstalledHighResolutionResidualBudget.report.ts reads committed FG-42 reference pacing and FG-45 operator readout evidence, writes reports/fluid-installed-high-resolution-residual-budget-latest.json, and summarizes worst residual plus closest margin",
  },
  {
    id: "FG-46-T03",
    milestone: "FG-46",
    status: "done",
    title: "Close installed high-resolution residual budget gate",
    exitProof:
      "npm run fluid:installed-high-resolution-residual-budget passes with 10 structured comparisons across drop, splash, float, sink, and damping, live 1024 x 576 WebGPU provenance, no-readback proof, and committed FG-46 evidence",
  },
];

export function gateForMilestone(milestoneId: FluidGridMilestoneId): FluidGridGate {
  const milestone = fluidGridMilestones.find((entry) => entry.id === milestoneId);
  const gate = fluidGridGates.find((entry) => entry.id === milestone?.gate);
  if (!milestone || !gate) {
    throw new Error(`Missing fluid-grid gate for ${milestoneId}`);
  }
  return gate;
}

export function tasksForMilestone(milestoneId: FluidGridMilestoneId): FluidGridTask[] {
  return fluidGridTasks.filter((task) => task.milestone === milestoneId);
}
