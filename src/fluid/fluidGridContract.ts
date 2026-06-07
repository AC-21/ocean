export type FluidBackendKind = "webgpu-compute" | "cpu-deterministic-test" | "legacy-canvas-diagnostic";

export type FluidGridMilestoneId = "FG-00" | "FG-01" | "FG-02" | "FG-03" | "FG-04" | "FG-05" | "FG-06";

export type FluidGridGateId = "G-FG-00" | "G-FG-01" | "G-FG-02" | "G-FG-03" | "G-FG-04" | "G-FG-05" | "G-FG-06";

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
    evidence: "calibration packet",
    passBar: "reference cases match accepted error bounds for impact speed, splash height, damping, and float duration",
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
    status: "planned",
    title: "Calibrate against reference drop cases",
    exitProof: "calibration packet closes accepted error bounds for splash, damping, float time, and sink time",
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
