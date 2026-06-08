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
  | "FG-15";

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
  | "G-FG-15";

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
