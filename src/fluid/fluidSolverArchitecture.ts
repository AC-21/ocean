export type FluidSolverArchitectureGate = "G-FG-09";

export type FluidSolverReferenceId =
  | "stam-1999-stable-fluids"
  | "bridson-fedkiw-muller-2006-course"
  | "chentanez-muller-2010-heightfield-particles"
  | "macklin-muller-2013-position-based-fluids"
  | "brodtkorb-saetra-altinakar-2012-gpu-shallow-water"
  | "kellomaki-2014-rigid-body-water";

export type FluidSolverOptionId =
  | "gpu-heightfield-only"
  | "full-3d-eulerian"
  | "particle-only-pbf-sph"
  | "stable-fluids-eulerian"
  | "hybrid-heightfield-particles";

export type FluidSolverDecisionStatus = "recommended" | "rejected" | "deferred";

export type FluidSolverScore = {
  localGpuFit: number;
  frameBudgetFit: number;
  physicalDefensibility: number;
  splashDetail: number;
  calibrationFit: number;
  implementationTractability: number;
};

export type FluidSolverReference = {
  id: FluidSolverReferenceId;
  title: string;
  authors: string;
  year: number;
  url: string;
  sourceType: "paper" | "course-notes";
  primary: true;
  relevance: string;
};

export type FluidSolverOption = {
  id: FluidSolverOptionId;
  title: string;
  status: FluidSolverDecisionStatus;
  score: FluidSolverScore;
  totalScore: number;
  evidenceReferenceIds: FluidSolverReferenceId[];
  advantages: string[];
  risks: string[];
  decisionReason: string;
};

export type FluidSolverStageId =
  | "surface-grid"
  | "rigid-body-coupling"
  | "particle-splash-layer"
  | "bounded-readback"
  | "calibration-loop";

export type FluidSolverStage = {
  id: FluidSolverStageId;
  title: string;
  implementationTarget: "webgpu-compute" | "cpu-reference" | "hybrid";
  acceptanceEvidence: string;
};

export type FluidSolverNextMilestone = {
  id: "FG-10" | "FG-11" | "FG-12" | "FG-13";
  gate: "G-FG-10" | "G-FG-11" | "G-FG-12" | "G-FG-13";
  title: string;
  exitEvidence: string;
};

export type FluidSolverDecisionReport = {
  gate: FluidSolverArchitectureGate;
  generatedAt: string;
  pass: boolean;
  recommendedOptionId: FluidSolverOptionId;
  recommendation: string;
  rejectionSummary: Record<Exclude<FluidSolverOptionId, "hybrid-heightfield-particles">, string>;
  primaryReferences: FluidSolverReference[];
  options: FluidSolverOption[];
  solverStages: FluidSolverStage[];
  nextMilestones: FluidSolverNextMilestone[];
  failures: string[];
};

export const fluidSolverReferences: FluidSolverReference[] = [
  {
    id: "stam-1999-stable-fluids",
    title: "Stable Fluids",
    authors: "Jos Stam",
    year: 1999,
    url: "https://graphics.stanford.edu/courses/cs448-01-spring/papers/stam.pdf",
    sourceType: "paper",
    primary: true,
    relevance: "Establishes the semi-Lagrangian stable-solver family and its useful stability/large-timestep tradeoff, but not a complete free-surface ocean impact model.",
  },
  {
    id: "bridson-fedkiw-muller-2006-course",
    title: "Fluid Simulation, SIGGRAPH 2006 Course Notes",
    authors: "Robert Bridson, Ronald Fedkiw, Matthias Muller-Fischer, Eran Guendelman",
    year: 2006,
    url: "https://www.cs.ubc.ca/~rbridson/fluidsimulation/2006/fluids_notes.pdf",
    sourceType: "course-notes",
    primary: true,
    relevance: "Frames full 3D incompressible flow, free surfaces, particle-in-cell methods, and solid-fluid coupling as the physically richer but heavier target.",
  },
  {
    id: "chentanez-muller-2010-heightfield-particles",
    title: "Real-time Simulation of Large Bodies of Water with Small Scale Details",
    authors: "Nuttapong Chentanez and Matthias Muller",
    year: 2010,
    url: "https://matthias-research.github.io/pages/publications/hfFluid.pdf",
    sourceType: "paper",
    primary: true,
    relevance: "Directly supports the chosen hybrid: broad heightfield water, two-way rigid-body coupling, and particles for spray, splash, and foam.",
  },
  {
    id: "macklin-muller-2013-position-based-fluids",
    title: "Position Based Fluids",
    authors: "Miles Macklin and Matthias Muller",
    year: 2013,
    url: "https://mmacklin.com/pbf_sig_preprint.pdf",
    sourceType: "paper",
    primary: true,
    relevance: "Gives a robust real-time particle-fluid option for localized splash detail, but particle-only ocean surfaces remain too costly for broad water state.",
  },
  {
    id: "brodtkorb-saetra-altinakar-2012-gpu-shallow-water",
    title: "Efficient Shallow Water Simulations on GPUs: Implementation, Visualization, Verification, and Validation",
    authors: "Andre R. Brodtkorb, Martin L. Saetra, Mustafa S. Altinakar",
    year: 2012,
    url: "https://brodtkorb.org/files/publications/brodtkorb_gs11.pdf",
    sourceType: "paper",
    primary: true,
    relevance: "Shows shallow-water schemes map well to GPUs and can be verified/validated, which matches the local high-resolution grid direction.",
  },
  {
    id: "kellomaki-2014-rigid-body-water",
    title: "Rigid Body Interaction for Large-Scale Real-Time Water Simulation",
    authors: "Tommi Kellomaki",
    year: 2014,
    url: "https://onlinelibrary.wiley.com/doi/10.1155/2014/580154",
    sourceType: "paper",
    primary: true,
    relevance: "Keeps rigid-body interaction with large real-time water explicit in the architecture decision instead of treating drops as a render-only effect.",
  },
];

function scoreTotal(score: FluidSolverScore): number {
  return Object.values(score).reduce((sum, value) => sum + value, 0);
}

function option(input: Omit<FluidSolverOption, "totalScore">): FluidSolverOption {
  return { ...input, totalScore: scoreTotal(input.score) };
}

export const fluidSolverOptions: FluidSolverOption[] = [
  option({
    id: "gpu-heightfield-only",
    title: "GPU shallow-water/heightfield only",
    status: "deferred",
    score: {
      localGpuFit: 5,
      frameBudgetFit: 5,
      physicalDefensibility: 4,
      splashDetail: 2,
      calibrationFit: 4,
      implementationTractability: 4,
    },
    evidenceReferenceIds: ["chentanez-muller-2010-heightfield-particles", "brodtkorb-saetra-altinakar-2012-gpu-shallow-water"],
    advantages: [
      "Best fit for broad surface waves, wet/dry regions, bounded GPU buffers, and high-resolution local grids.",
      "Can keep mass, momentum, CFL, and boundary diagnostics in a compact WebGPU compute contract.",
    ],
    risks: [
      "Breaking waves, object-entry crowns, spray sheets, droplets, and entrained air need sub-grid detail.",
      "A pure heightfield can look clean while under-representing violent impact events.",
    ],
    decisionReason: "Use this as the broad-surface core, but not as the whole simulator because splash realism needs a local particle layer.",
  }),
  option({
    id: "full-3d-eulerian",
    title: "Full 3D Eulerian free-surface CFD grid",
    status: "rejected",
    score: {
      localGpuFit: 1,
      frameBudgetFit: 1,
      physicalDefensibility: 5,
      splashDetail: 5,
      calibrationFit: 5,
      implementationTractability: 1,
    },
    evidenceReferenceIds: ["bridson-fedkiw-muller-2006-course"],
    advantages: [
      "Strongest long-term physical model for volumetric free surfaces, pressure projection, and solid-fluid coupling.",
      "Best theoretical path for entrainment and complex overturning flows if hardware and implementation budget were much larger.",
    ],
    risks: [
      "Too much memory, pressure-solve complexity, and validation scope for the immediate local desktop milestone.",
      "Would slow the program before the current WebGPU heightfield/coupling/calibration gates are mature.",
    ],
    decisionReason: "Keep as a research horizon, not the immediate production path for this local interactive simulator.",
  }),
  option({
    id: "particle-only-pbf-sph",
    title: "Particle-only SPH/PBF water",
    status: "rejected",
    score: {
      localGpuFit: 2,
      frameBudgetFit: 2,
      physicalDefensibility: 4,
      splashDetail: 5,
      calibrationFit: 3,
      implementationTractability: 2,
    },
    evidenceReferenceIds: ["macklin-muller-2013-position-based-fluids", "bridson-fedkiw-muller-2006-course"],
    advantages: [
      "Excellent match for local spray, splashes, sheets, and flexible impact detail.",
      "PBF gives a robust real-time incompressibility tradeoff for localized particle volumes.",
    ],
    risks: [
      "Broad ocean coverage would need too many particles or too much spatial hashing work for the current frame budget.",
      "Calibration of float duration and long-wave damping is harder without a compact Eulerian surface state.",
    ],
    decisionReason: "Use particles locally for impact detail, but reject particle-only water as the broad ocean representation.",
  }),
  option({
    id: "stable-fluids-eulerian",
    title: "Stable-Fluids-style semi-Lagrangian Eulerian solver",
    status: "rejected",
    score: {
      localGpuFit: 4,
      frameBudgetFit: 4,
      physicalDefensibility: 3,
      splashDetail: 2,
      calibrationFit: 2,
      implementationTractability: 4,
    },
    evidenceReferenceIds: ["stam-1999-stable-fluids", "bridson-fedkiw-muller-2006-course"],
    advantages: [
      "Stable, approachable, and useful for velocity/advection thinking.",
      "A good implementation reference for bounded timesteps and projection-style solver decomposition.",
    ],
    risks: [
      "Dissipation and free-surface limitations make it a poor immediate fit for splash height, float/sink duration, and impact recovery calibration.",
      "It is too easy to land a visually plausible flow that does not conserve the quantities the simulator must measure.",
    ],
    decisionReason: "Keep solver ideas where useful, but reject it as the production architecture for near-real ocean impact behavior.",
  }),
  option({
    id: "hybrid-heightfield-particles",
    title: "Hybrid GPU heightfield/free-surface grid plus local particle splash layer",
    status: "recommended",
    score: {
      localGpuFit: 5,
      frameBudgetFit: 4,
      physicalDefensibility: 4,
      splashDetail: 5,
      calibrationFit: 5,
      implementationTractability: 4,
    },
    evidenceReferenceIds: [
      "chentanez-muller-2010-heightfield-particles",
      "brodtkorb-saetra-altinakar-2012-gpu-shallow-water",
      "macklin-muller-2013-position-based-fluids",
      "bridson-fedkiw-muller-2006-course",
      "kellomaki-2014-rigid-body-water",
    ],
    advantages: [
      "Matches the local WebGPU budget: broad water stays in compact grid buffers while splash detail is spawned only near energetic impacts.",
      "Keeps rigid-body coupling, mass/momentum accounting, frame pacing, and calibration evidence in the existing gate structure.",
      "Aligns with the real-time large-water/small-detail architecture demonstrated by heightfield-plus-particle research.",
    ],
    risks: [
      "Requires careful mass and momentum exchange between grid and particles to avoid visual-only spray.",
      "Needs reference-case calibration so particle counts and damping do not become hand-tuned effects.",
    ],
    decisionReason: "Select as the immediate production architecture because it is the best compromise between local GPU performance and physically defensible impact detail.",
  }),
];

export const fluidSolverStages: FluidSolverStage[] = [
  {
    id: "surface-grid",
    title: "GPU shallow-water/free-surface grid owns broad water state",
    implementationTarget: "webgpu-compute",
    acceptanceEvidence: "height, velocity, depth, impulse, obstacle, and foam buffers step without full-grid readback and expose CFL/mass/momentum diagnostics",
  },
  {
    id: "rigid-body-coupling",
    title: "Dropped bodies exchange momentum with bounded grid regions",
    implementationTarget: "hybrid",
    acceptanceEvidence: "object footprint, displaced volume, slam impulse, drag, added mass, and damping feed both rigid-body motion and local fluid state",
  },
  {
    id: "particle-splash-layer",
    title: "Localized particles represent spray, foam, sheets, and entrained air",
    implementationTarget: "hybrid",
    acceptanceEvidence: "particles spawn only from energetic grid/body events, carry bounded mass/momentum, and write reentry energy back into the grid",
  },
  {
    id: "bounded-readback",
    title: "Diagnostics remain bounded while rendering reads GPU state directly",
    implementationTarget: "webgpu-compute",
    acceptanceEvidence: "reports include timestamp-query timing, local frame pacing, and small diagnostic samples rather than per-frame full-grid copies",
  },
  {
    id: "calibration-loop",
    title: "Reference cases drive solver constants before visual polish",
    implementationTarget: "cpu-reference",
    acceptanceEvidence: "drop, splash-height, float/sink, damping, and recovery cases pass accepted error bounds against curated references",
  },
];

export const fluidSolverNextMilestones: FluidSolverNextMilestone[] = [
  {
    id: "FG-10",
    gate: "G-FG-10",
    title: "Reference dataset ingestion and measurement harness",
    exitEvidence: "reference drop/float/splash cases have source metadata, units, measurement uncertainty, and replayable expected bands",
  },
  {
    id: "FG-11",
    gate: "G-FG-11",
    title: "Conservative GPU shallow-water upgrade",
    exitEvidence: "heightfield stepping tracks mass, momentum, wet/dry boundaries, CFL, damping, and local GPU timing at calibrated grid tiers",
  },
  {
    id: "FG-12",
    gate: "G-FG-12",
    title: "Localized particle splash and spray layer",
    exitEvidence: "impact-generated particles carry bounded mass/momentum, match splash reference bands, and write secondary reentry into the grid",
  },
  {
    id: "FG-13",
    gate: "G-FG-13",
    title: "Coupled solver calibration against reference cases",
    exitEvidence: "drop speed, splash crown, float/sink duration, damping, and surface recovery pass reference gates on the packaged local app",
  },
];

export function createFluidSolverDecisionReport(generatedAt = new Date().toISOString()): FluidSolverDecisionReport {
  const recommendedOption = fluidSolverOptions.find((entry) => entry.status === "recommended");
  const rejectedOptions = fluidSolverOptions.filter((entry) => entry.status === "rejected");
  const rejectionSummary = {
    "gpu-heightfield-only": fluidSolverOptions.find((entry) => entry.id === "gpu-heightfield-only")?.decisionReason ?? "",
    "full-3d-eulerian": fluidSolverOptions.find((entry) => entry.id === "full-3d-eulerian")?.decisionReason ?? "",
    "particle-only-pbf-sph": fluidSolverOptions.find((entry) => entry.id === "particle-only-pbf-sph")?.decisionReason ?? "",
    "stable-fluids-eulerian": fluidSolverOptions.find((entry) => entry.id === "stable-fluids-eulerian")?.decisionReason ?? "",
  };
  const failures = validateFluidSolverDecision(recommendedOption?.id ?? null, rejectedOptions);

  return {
    gate: "G-FG-09",
    generatedAt,
    pass: failures.length === 0,
    recommendedOptionId: recommendedOption?.id ?? "gpu-heightfield-only",
    recommendation:
      "Build the immediate production solver as a hybrid-heightfield-particles architecture: WebGPU shallow-water/free-surface grid for broad water state, localized particle splash/spray/foam for high-energy impacts, and CPU reference fixtures for calibration.",
    rejectionSummary,
    primaryReferences: fluidSolverReferences,
    options: fluidSolverOptions,
    solverStages: fluidSolverStages,
    nextMilestones: fluidSolverNextMilestones,
    failures,
  };
}

function validateFluidSolverDecision(recommendedOptionId: FluidSolverOptionId | null, rejectedOptions: FluidSolverOption[]): string[] {
  const failures: string[] = [];
  const requiredRejectedOptions: FluidSolverOptionId[] = ["full-3d-eulerian", "particle-only-pbf-sph", "stable-fluids-eulerian"];
  const requiredStageIds: FluidSolverStageId[] = ["surface-grid", "rigid-body-coupling", "particle-splash-layer", "bounded-readback", "calibration-loop"];

  if (recommendedOptionId !== "hybrid-heightfield-particles") {
    failures.push(`recommended option must be hybrid-heightfield-particles, got ${recommendedOptionId ?? "missing"}`);
  }

  if (fluidSolverReferences.length < 5 || fluidSolverReferences.some((entry) => !entry.primary || !entry.url.startsWith("https://"))) {
    failures.push("at least five primary HTTPS solver references are required");
  }

  for (const optionId of requiredRejectedOptions) {
    const rejected = rejectedOptions.find((entry) => entry.id === optionId);
    if (!rejected || rejected.decisionReason.length < 40) failures.push(`${optionId} must be rejected with a decision reason`);
  }

  for (const stageId of requiredStageIds) {
    if (!fluidSolverStages.some((entry) => entry.id === stageId)) failures.push(`missing solver stage ${stageId}`);
  }

  if (fluidSolverNextMilestones.length < 4 || fluidSolverNextMilestones.some((entry) => !entry.gate.startsWith("G-FG-"))) {
    failures.push("next solver milestones must name follow-on gates");
  }

  return failures;
}
