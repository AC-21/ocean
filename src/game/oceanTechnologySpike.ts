import { clamp } from "./math";
import { createOceanPhysicsSpikeReport, type OceanPhysicsSpikeReport } from "./oceanPhysicsSpike";
import {
  createOceanVisualCalibrationReport,
  type OceanBenchmarkEvidence,
  type OceanVisualCalibrationReport,
} from "./oceanVisualCalibration";

export type OceanTechnologyCandidateId =
  | "pixi-analytic-current"
  | "narrow-oceanfield-extension"
  | "rigid-body-physics-package"
  | "three-water-renderer"
  | "fluid-solver-package";

export type OceanTechnologyRecommendation =
  | "extend-oceanfield-no-package"
  | "install-narrow-physics-package"
  | "run-renderer-migration-spike"
  | "rework-current-evidence";

export type OceanTechnologySpikeOptions = {
  benchmark?: OceanBenchmarkEvidence;
  days?: number;
  generatedAt?: string;
  physics?: OceanPhysicsSpikeReport;
  visual?: OceanVisualCalibrationReport;
};

export type OceanTechnologyGate = {
  pass: boolean;
  metric: number | string;
  threshold: string;
};

export type OceanTechnologyScore = {
  measuredProof: number;
  buoyancyResponse: number;
  wakeBehavior: number;
  waveResponse: number;
  visualQuality: number;
  routeReadability: number;
  gpuBudget: number;
  integrationSafety: number;
  riskPenalty: number;
  total: number;
};

export type OceanTechnologyCandidate = {
  id: OceanTechnologyCandidateId;
  label: string;
  packageClass: "none" | "targeted-model-work" | "rigid-body-2d" | "renderer-water" | "fluid-simulation";
  dependencyImpact: "none" | "optional-new-package" | "new-renderer-stack" | "new-simulation-stack";
  intendedValue: string;
  bestUse: string;
  blockers: string[];
  score: OceanTechnologyScore;
};

export type OceanTechnologySpikeReport = {
  schema: 1;
  generatedAt: string;
  oceanFieldId: string;
  inputs: {
    physicsDecision: OceanPhysicsSpikeReport["decision"]["recommendation"];
    visualDecision: OceanVisualCalibrationReport["decision"]["recommendation"];
    benchmarkStatus: OceanBenchmarkEvidence["status"];
    benchmarkSource: string | null;
    benchmarkRenderers: string[];
    physicsGpuCostStatus: OceanPhysicsSpikeReport["gpuCost"]["status"];
  };
  gates: {
    waveSampling: OceanTechnologyGate;
    shipResponse: OceanTechnologyGate;
    wakeSignals: OceanTechnologyGate;
    visualCalibration: OceanTechnologyGate;
    routeReadability: OceanTechnologyGate;
    gpuBudget: OceanTechnologyGate;
    singleRendererFit: OceanTechnologyGate;
    allCoreGates: OceanTechnologyGate;
  };
  candidates: OceanTechnologyCandidate[];
  winner: OceanTechnologyCandidate;
  bestExternalPackage: OceanTechnologyCandidate;
  packageComparison: {
    bestNoDependencyScore: number;
    bestExternalPackageScore: number;
    externalPackageMateriallyImproves: boolean;
    scoreMarginForCurrentPath: number;
  };
  decision: {
    recommendation: OceanTechnologyRecommendation;
    verdict: "continue" | "defer-package" | "migrate-spike" | "hold";
    reason: string;
  };
  nextSteps: string[];
};

const materialImprovementMargin = 0.35;

export function createOceanTechnologySpikeReport(options: OceanTechnologySpikeOptions = {}): OceanTechnologySpikeReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const physics = options.physics ?? createOceanPhysicsSpikeReport({ days: options.days ?? 60, generatedAt });
  const visual = options.visual ?? createOceanVisualCalibrationReport({ benchmark: options.benchmark, generatedAt });
  const gates = summarizeGates(physics, visual);
  const candidates = createCandidates(physics, visual, gates).sort((left, right) => right.score.total - left.score.total);
  const winner = candidates[0];
  const bestExternalPackage = candidates.filter((candidate) => candidate.dependencyImpact !== "none")[0];
  const bestNoDependencyScore = candidates.filter((candidate) => candidate.dependencyImpact === "none")[0].score.total;
  const bestExternalPackageScore = bestExternalPackage.score.total;
  const externalPackageMateriallyImproves = bestExternalPackageScore > bestNoDependencyScore + materialImprovementMargin;
  const scoreMarginForCurrentPath = round(bestNoDependencyScore - bestExternalPackageScore, 3);

  return {
    schema: 1,
    generatedAt,
    oceanFieldId: physics.oceanFieldId,
    inputs: {
      physicsDecision: physics.decision.recommendation,
      visualDecision: visual.decision.recommendation,
      benchmarkStatus: visual.liveMapSurface.status,
      benchmarkSource: visual.liveMapSurface.source,
      benchmarkRenderers: visual.liveMapSurface.renderers,
      physicsGpuCostStatus: physics.gpuCost.status,
    },
    gates,
    candidates,
    winner,
    bestExternalPackage,
    packageComparison: {
      bestNoDependencyScore,
      bestExternalPackageScore,
      externalPackageMateriallyImproves,
      scoreMarginForCurrentPath,
    },
    decision: decide(gates, winner, bestExternalPackage, externalPackageMateriallyImproves),
    nextSteps: nextStepsFor(gates, winner),
  };
}

function summarizeGates(
  physics: OceanPhysicsSpikeReport,
  visual: OceanVisualCalibrationReport
): OceanTechnologySpikeReport["gates"] {
  const wakeMetric = round((physics.currentAndFreight.followingRouteCount + physics.currentAndFreight.contraryRouteCount) / 2, 1);
  const visualPass = visual.decision.recommendation === "calibrated-pixi-water";
  const gpuPass = visual.liveMapSurface.status === "passed" && (visual.liveMapSurface.minAverageFps ?? 0) >= 24;
  const singleRendererPass =
    visual.liveMapSurface.renderers.includes("shader-mesh-v2") && visual.liveMapSurface.renderers.includes("low-power-graphics-v2");
  const gates = {
    waveSampling: gate(physics.waveSampling.pass, rangeText(physics.waveSampling.peakWaveHeightRange), "varied route waves and peak waves above 4"),
    shipResponse: gate(physics.shipResponse.pass, physics.shipResponse.responseLift, "response lift at least 0.08"),
    wakeSignals: gate(physics.currentAndFreight.pass && wakeMetric > 100, wakeMetric, "following and contrary current sets feed wake/route behavior"),
    visualCalibration: gate(visualPass, visual.decision.recommendation, "calibrated-pixi-water"),
    routeReadability: gate(
      physics.routeReadability.pass && visual.routeRiskReadability.pass,
      `${physics.routeReadability.seaStateLabels.length} sea labels, ${visual.routeRiskReadability.riskSpread} visual spread`,
      "route labels and visual risk spread stay readable"
    ),
    gpuBudget: gate(gpuPass, visual.liveMapSurface.minAverageFps ?? "missing", "live benchmark passed with min average FPS >= 24"),
    singleRendererFit: gate(singleRendererPass, visual.liveMapSurface.renderers.join(", ") || "missing", "Pixi shader and low-power renderers both verified"),
    allCoreGates: gate(false, "pending", "all production water evidence gates pass"),
  };
  gates.allCoreGates = gate(
    Object.entries(gates)
      .filter(([key]) => key !== "allCoreGates")
      .every(([, value]) => value.pass),
    Object.entries(gates)
      .filter(([key]) => key !== "allCoreGates")
      .filter(([, value]) => !value.pass)
      .map(([key]) => key)
      .join(", ") || "all passed",
    "wave, ship, wake, visual, route, GPU, and renderer-fit gates pass"
  );
  return gates;
}

function createCandidates(
  physics: OceanPhysicsSpikeReport,
  visual: OceanVisualCalibrationReport,
  gates: OceanTechnologySpikeReport["gates"]
): OceanTechnologyCandidate[] {
  const measuredProof = gates.allCoreGates.pass ? 1 : 0.42;
  const buoyancy = gates.shipResponse.pass ? normalize(physics.shipResponse.responseLift, 0.08, 0.72) : 0.24;
  const wave = gates.waveSampling.pass ? 0.95 : 0.25;
  const visualQuality = visual.decision.recommendation === "calibrated-pixi-water" ? 0.95 : visual.palette.tealGrayPass ? 0.68 : 0.25;
  const route = gates.routeReadability.pass ? 1 : 0.28;
  const gpu = gates.gpuBudget.pass ? 0.88 : 0.22;
  const wake = gates.wakeSignals.pass && visual.routeRiskReadability.pass ? 0.68 : 0.24;

  return [
    candidate({
      id: "pixi-analytic-current",
      label: "Current Pixi/OceanField path",
      packageClass: "none",
      dependencyImpact: "none",
      intendedValue: "Keep gameplay, route math, ship motion, and water rendering on one deterministic ocean field.",
      bestUse: "Vertical-slice production while economy, contracts, crew, saves, and playtesting continue.",
      blockers: ["Wake trails are still analytic and short-lived rather than persistent foam history."],
      score: score({
        measuredProof,
        buoyancyResponse: buoyancy,
        wakeBehavior: wake,
        waveResponse: wave,
        visualQuality,
        routeReadability: route,
        gpuBudget: gpu,
        integrationSafety: 1,
        riskPenalty: 0.05,
      }),
    }),
    candidate({
      id: "narrow-oceanfield-extension",
      label: "Extend OceanField with targeted buoyancy and wakes",
      packageClass: "targeted-model-work",
      dependencyImpact: "none",
      intendedValue: "Add persistent route wake ribbons, hull-mass response curves, and cargo-dependent slamming on the existing field.",
      bestUse: "Next production step if the player needs more physical water feel without a renderer migration.",
      blockers: ["Needs focused tuning and browser proof after final ship sprites and route art settle."],
      score: score({
        measuredProof: gates.allCoreGates.pass ? 0.92 : 0.36,
        buoyancyResponse: clamp(buoyancy + 0.08, 0, 1),
        wakeBehavior: gates.wakeSignals.pass ? 0.95 : 0.42,
        waveResponse: wave,
        visualQuality: clamp(visualQuality + 0.05, 0, 1),
        routeReadability: route,
        gpuBudget: clamp(gpu - 0.05, 0, 1),
        integrationSafety: 0.88,
        riskPenalty: 0.16,
      }),
    }),
    candidate({
      id: "rigid-body-physics-package",
      label: "2D rigid-body physics package",
      packageClass: "rigid-body-2d",
      dependencyImpact: "optional-new-package",
      intendedValue: "Use rigid bodies for collisions, impulses, and simple constraints.",
      bestUse: "A different feature set with physical docks, debris, or arcade collisions.",
      blockers: [
        "Rigid-body motion does not create an ocean surface, wave field, currents, or route-readable sea state by itself.",
        "Adds a second simulation clock for limited benefit on a strategy map.",
      ],
      score: score({
        measuredProof: 0.28,
        buoyancyResponse: 0.35,
        wakeBehavior: 0.18,
        waveResponse: 0.2,
        visualQuality: 0.12,
        routeReadability: 0.65,
        gpuBudget: 0.78,
        integrationSafety: 0.55,
        riskPenalty: 0.55,
      }),
    }),
    candidate({
      id: "three-water-renderer",
      label: "3D reflective water renderer",
      packageClass: "renderer-water",
      dependencyImpact: "new-renderer-stack",
      intendedValue: "Add reflective/refraction-style water with a 3D camera and renderer.",
      bestUse: "A later visual spike if approved water references demand perspective reflections Pixi cannot reach.",
      blockers: [
        "Creates renderer, pointer, z-order, screenshot, resize, and low-power sync work before solving a proven blocker.",
        "Can make route heat, labels, ports, and generated sprites harder to read on a dense trading map.",
      ],
      score: score({
        measuredProof: 0.3,
        buoyancyResponse: 0.22,
        wakeBehavior: 0.55,
        waveResponse: 0.55,
        visualQuality: 1,
        routeReadability: 0.55,
        gpuBudget: 0.42,
        integrationSafety: 0.28,
        riskPenalty: 0.85,
      }),
    }),
    candidate({
      id: "fluid-solver-package",
      label: "GPU or fluid-simulation water package",
      packageClass: "fluid-simulation",
      dependencyImpact: "new-simulation-stack",
      intendedValue: "Simulate richer wakes, flow, and wave interaction from a heavier water model.",
      bestUse: "A sailing simulation where water behavior is the primary interaction loop.",
      blockers: [
        "Highest GPU and tuning risk for a map where the route decision must stay legible.",
        "Would need new deterministic hooks so route ETA, risk, markets, and save/replay behavior remain stable.",
      ],
      score: score({
        measuredProof: 0.18,
        buoyancyResponse: 1,
        wakeBehavior: 1,
        waveResponse: 1,
        visualQuality: 0.8,
        routeReadability: 0.5,
        gpuBudget: 0.25,
        integrationSafety: 0.22,
        riskPenalty: 1,
      }),
    }),
  ];
}

function decide(
  gates: OceanTechnologySpikeReport["gates"],
  winner: OceanTechnologyCandidate,
  bestExternalPackage: OceanTechnologyCandidate,
  externalPackageMateriallyImproves: boolean
): OceanTechnologySpikeReport["decision"] {
  if (!gates.allCoreGates.pass) {
    return {
      recommendation: "rework-current-evidence",
      verdict: "hold",
      reason: `Do not choose engine technology yet; missing gates: ${String(gates.allCoreGates.metric)}.`,
    };
  }

  if (externalPackageMateriallyImproves && bestExternalPackage.packageClass === "renderer-water") {
    return {
      recommendation: "run-renderer-migration-spike",
      verdict: "migrate-spike",
      reason: `${bestExternalPackage.label} materially beats the current path, so prove renderer/input/GPU alignment before migration.`,
    };
  }

  if (externalPackageMateriallyImproves) {
    return {
      recommendation: "install-narrow-physics-package",
      verdict: "continue",
      reason: `${bestExternalPackage.label} materially beats the no-dependency path while keeping current route and GPU gates green.`,
    };
  }

  return {
    recommendation: "extend-oceanfield-no-package",
    verdict: winner.dependencyImpact === "none" ? "continue" : "defer-package",
    reason:
      "No external package materially beats the measured Pixi/OceanField path. Extend the existing ocean model for persistent wakes and richer hull response before adding another renderer or simulation stack.",
  };
}

function nextStepsFor(gates: OceanTechnologySpikeReport["gates"], winner: OceanTechnologyCandidate) {
  if (!gates.allCoreGates.pass) {
    return [
      "Refresh npm run ocean:benchmark and rerun the visual, physics, and technology spike gates.",
      "Only compare packages after the current renderer has live GPU, route-readability, and visual-calibration evidence.",
    ];
  }
  if (winner.id === "narrow-oceanfield-extension") {
    return [
      "Add persistent wake ribbons and ship-class response curves inside OceanField and MapScene.",
      "Retune route labels after wake trails are visible so water never hides the trade decision.",
      "Rerun npm run ocean:benchmark, npm run ocean:visual-calibration, npm run ocean:physics-spike, and npm run ocean:technology-spike.",
    ];
  }
  return [
    "Write the winning package spike as a branch-level prototype with side-by-side screenshots.",
    "Require route readability, low-power, pointer alignment, save/replay, and browser smoke proof before adopting it.",
  ];
}

function candidate(candidateValue: Omit<OceanTechnologyCandidate, "score"> & { score: OceanTechnologyScore }): OceanTechnologyCandidate {
  return candidateValue;
}

function score(values: Omit<OceanTechnologyScore, "total">): OceanTechnologyScore {
  const total =
    values.measuredProof * 1.1 +
    values.buoyancyResponse * 0.9 +
    values.wakeBehavior * 1.2 +
    values.waveResponse * 0.9 +
    values.visualQuality +
    values.routeReadability * 1.3 +
    values.gpuBudget * 1.1 +
    values.integrationSafety -
    values.riskPenalty;
  return {
    ...values,
    total: round(total, 3),
  };
}

function gate(pass: boolean, metric: number | string, threshold: string): OceanTechnologyGate {
  return { pass, metric, threshold };
}

function normalize(value: number, min: number, max: number) {
  return clamp((value - min) / (max - min), 0, 1);
}

function rangeText(range: { min: number; max: number }) {
  return `${range.min}..${range.max}`;
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
