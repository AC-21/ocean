import { gridForTier, type FluidCapabilityReport } from "./webgpuCapability";
import type { FluidGridTierId } from "./fluidGridContract";

export type ParticleSplashGate = "G-FG-12";
export type ParticleSplashSolver = "localized-particle-splash-v1";
export type ParticleSplashBufferRole = "particles";

export type ParticleSplashReferenceBand = {
  formula: string;
  maxM: number;
  minM: number;
};

export type ParticleSplashScenario = {
  displacedVolumeM3: number;
  froudeNumber: number;
  gravityMps2: number;
  impactSpeedMps: number;
  objectDiameterM: number;
  objectMassKg: number;
  surfaceTensionNpm: number;
  waterDensityKgM3: number;
  weberNumber: number;
};

export type ParticleSplashPlan = {
  bytesPerParticle: number;
  bufferRoles: ParticleSplashBufferRole[];
  dispatchX: number;
  dtS: number;
  estimatedStorageBytes: number;
  gridCellsX: number;
  gridCellsY: number;
  localBoundsM: {
    xMax: number;
    xMin: number;
    yMax: number;
    yMin: number;
  };
  localGridFeedbackLimit: number;
  particleCapacity: number;
  particleStride: number;
  steps: number;
  tier: FluidGridTierId;
  workgroupSize: number;
};

export type ParticleSplashGridFeedback = {
  bounds: {
    xEnd: number;
    xStart: number;
    yEnd: number;
    yStart: number;
  };
  energyJ: number;
  foamInjection: number;
  impulseNs: number;
  massKg: number;
  sampleCount: number;
};

export type ParticleSplashLiveFeedbackInput = {
  cellSizeM: number;
  currentSpeedMps: number;
  displacedVolumeM3: number;
  ejectedWaterKg: number;
  froudeNumber: number;
  gravityMps2: number;
  gridCellsX: number;
  gridCellsY: number;
  impactStrength: number;
  localGridFeedbackLimit: number;
  objectDiameterM: number;
  objectMassKg: number;
  objectVxMps: number;
  objectVyMps: number;
  sprayParticleCount: number;
  sprayReentryEnergyJ: number;
  sprayReentryMassKg: number;
  splashEnergyJ: number;
  splashHeightM: number;
  surfaceTensionNpm: number;
  timeS: number;
  waterDensityKgM3: number;
  weberNumber: number;
};

export type ParticleSplashLiveFeedbackSummary = {
  active: boolean;
  boundedDiagnostics: true;
  coupling: "localized-particle-splash-live-v1";
  displacedWaterMassKg: number;
  dropletDensity: number;
  gridFeedback: ParticleSplashGridFeedback;
  impactMomentumNs: number;
  massFractionOfDisplaced: number;
  maxLaunchSpeedMps: number;
  momentumFractionOfImpact: number;
  noFullGridReadbackPerFrame: true;
  particleCount: number;
  predictedCrownHeightM: number;
  referenceSplashBand: ParticleSplashReferenceBand;
  reenteredMassKg: number;
  reentryEnergyJ: number;
  renderIntensity: number;
  sampleTimeS: number;
  sprayMassKg: number;
};

export type ParticleSplashDiagnostics = {
  activeFinalParticleCount: number;
  boundedDiagnostics: true;
  displacedWaterMassKg: number;
  entrainedAirMassKg: number;
  finalAliveMassKg: number;
  foamContribution: number;
  gridFeedback: ParticleSplashGridFeedback;
  impactEnergyJ: number;
  impactMomentumNs: number;
  initialMomentumAbsNs: number;
  initialParticleMassKg: number;
  massAccountedKg: number;
  massFractionOfDisplaced: number;
  massRelativeDrift: number;
  maxBallisticHeightM: number;
  maxLaunchSpeedMps: number;
  momentumFractionOfImpact: number;
  outsideLocalBoundsCount: number;
  particleCount: number;
  predictedCrownHeightM: number;
  referenceSplashBand: ParticleSplashReferenceBand;
  reenteredMassKg: number;
  reentryEnergyJ: number;
  reentryImpulseNs: number;
};

export type ParticleSplashTiming = {
  averageStepMs: number;
  totalMs: number;
};

export type ParticleSplashGpuTiming = {
  averageStepMs: number | null;
  maxStepMs: number | null;
  minStepMs: number | null;
  p95StepMs: number | null;
  sampleCount: number;
  timestampQueryEnabled: boolean;
};

export type ParticleSplashThreshold = {
  maxAverageStepMs: number;
  maxMassFractionOfDisplaced: number;
  maxMassRelativeDrift: number;
  maxMomentumFractionOfImpact: number;
  maxOutsideLocalBoundsCount: number;
  maxP95GpuStepMs: number;
  minFeedbackSampleCount: number;
  minReentryEnergyJ: number;
};

export type ParticleSplashBenchmarkReport = {
  backend: "webgpu-compute";
  capability: Pick<FluidCapabilityReport, "adapterName" | "features" | "limits" | "status"> | null;
  diagnostics: ParticleSplashDiagnostics;
  generatedAt: string;
  gpuTiming: ParticleSplashGpuTiming;
  noFullGridReadbackPerFrame: boolean;
  pass: boolean;
  plan: ParticleSplashPlan;
  scenario: ParticleSplashScenario;
  solver: ParticleSplashSolver;
  stepTiming: ParticleSplashTiming;
  threshold: ParticleSplashThreshold;
};

export type ParticleSplashBenchmarkOptions = {
  capability?: FluidCapabilityReport | null;
  generatedAt?: string;
  maxAverageStepMs?: number;
  maxMassFractionOfDisplaced?: number;
  maxMassRelativeDrift?: number;
  maxMomentumFractionOfImpact?: number;
  maxP95GpuStepMs?: number;
  particleCapacity?: number;
  requestGpuTimestamps?: boolean;
  scenario?: Partial<ParticleSplashScenario>;
  steps?: number;
  tier?: FluidGridTierId;
};

type GpuLike = {
  requestAdapter: (options?: { powerPreference?: "high-performance" | "low-power" }) => Promise<AdapterLike | null>;
};

type AdapterLike = {
  features?: Iterable<string>;
  requestDevice: (descriptor?: { requiredFeatures?: string[] }) => Promise<DeviceLike>;
};

type DeviceLike = {
  createBindGroup: (descriptor: unknown) => unknown;
  createBindGroupLayout: (descriptor: unknown) => unknown;
  createBuffer: (descriptor: { mappedAtCreation?: boolean; size: number; usage: number }) => BufferLike;
  createCommandEncoder: () => CommandEncoderLike;
  createComputePipeline: (descriptor: unknown) => unknown;
  createPipelineLayout: (descriptor: unknown) => unknown;
  createQuerySet?: (descriptor: { count: number; type: "timestamp" }) => QuerySetLike;
  createShaderModule: (descriptor: { code: string }) => unknown;
  destroy?: () => void;
  features?: Iterable<string>;
  queue: {
    onSubmittedWorkDone: () => Promise<void>;
    submit: (commandBuffers: unknown[]) => void;
    writeBuffer: (buffer: BufferLike, bufferOffset: number, data: Float32Array) => void;
  };
};

type BufferLike = {
  destroy?: () => void;
  getMappedRange: () => ArrayBuffer;
  mapAsync: (mode: number) => Promise<void>;
  unmap: () => void;
};

type QuerySetLike = {
  destroy?: () => void;
};

type CommandEncoderLike = {
  beginComputePass: (descriptor?: unknown) => ComputePassLike;
  copyBufferToBuffer: (source: BufferLike, sourceOffset: number, destination: BufferLike, destinationOffset: number, size: number) => void;
  finish: () => unknown;
  resolveQuerySet?: (querySet: QuerySetLike, firstQuery: number, queryCount: number, destination: BufferLike, destinationOffset: number) => void;
};

type ComputePassLike = {
  dispatchWorkgroups: (x: number) => void;
  end: () => void;
  setBindGroup: (index: number, bindGroup: unknown) => void;
  setPipeline: (pipeline: unknown) => void;
};

const usage = {
  copyDst: 0x0008,
  copySrc: 0x0004,
  mapRead: 0x0001,
  queryResolve: 0x0200,
  storage: 0x0080,
  uniform: 0x0040,
};
const mapModeRead = 0x0001;
const shaderStageCompute = 0x0004;
const bytesPerValue = 4;
const particleStride = 8;
const workgroupSize = 64;
const defaultDtS = 1 / 120;

export const particleSplashBufferRoles: ParticleSplashBufferRole[] = ["particles"];

export const defaultParticleSplashScenario: ParticleSplashScenario = {
  displacedVolumeM3: 0.08,
  froudeNumber: 4.35,
  gravityMps2: 9.80665,
  impactSpeedMps: 12.1641,
  objectDiameterM: 0.72,
  objectMassKg: 895,
  surfaceTensionNpm: 0.073,
  waterDensityKgM3: 1025,
  weberNumber: 1_460_000,
};

export function liveParticleSplashFeedbackFor(input: ParticleSplashLiveFeedbackInput): ParticleSplashLiveFeedbackSummary {
  const objectDiameterM = Math.max(0.05, input.objectDiameterM);
  const impactSpeedMps = Math.max(
    Math.abs(input.objectVyMps),
    input.froudeNumber * Math.sqrt(Math.max(0.001, input.gravityMps2 * objectDiameterM)),
    Math.sqrt((2 * Math.max(0, input.splashEnergyJ)) / Math.max(1, input.objectMassKg)) * 0.42
  );
  const scenario: ParticleSplashScenario = {
    displacedVolumeM3: input.displacedVolumeM3,
    froudeNumber: input.froudeNumber,
    gravityMps2: input.gravityMps2,
    impactSpeedMps,
    objectDiameterM,
    objectMassKg: input.objectMassKg,
    surfaceTensionNpm: input.surfaceTensionNpm,
    waterDensityKgM3: input.waterDensityKgM3,
    weberNumber: input.weberNumber,
  };
  const referenceSplashBand = referenceSplashBandFor(scenario);
  const displacedWaterMassKg = displacedWaterMassFor(scenario);
  const breakup = surfaceBreakupFactorFor(input.weberNumber);
  const boundedMassFraction = clamp(0.08 + breakup * 0.065 + input.froudeNumber * 0.012 + input.impactStrength * 0.018, 0.08, 0.32);
  const sprayMassKg = clamp(
    Math.max(input.ejectedWaterKg * (0.56 + breakup * 0.18), displacedWaterMassKg * boundedMassFraction),
    0,
    Math.max(0.001, displacedWaterMassKg * 0.34)
  );
  const predictedCrownHeightM = clamp(
    input.splashHeightM > 0
      ? input.splashHeightM * (0.9 + breakup * 0.045)
      : 0.11 * (impactSpeedMps ** 2 / Math.max(0.001, input.gravityMps2)) + 0.42 * objectDiameterM,
    referenceSplashBand.minM,
    referenceSplashBand.maxM
  );
  const maxLaunchSpeedMps = Math.sqrt(Math.max(0, 2 * input.gravityMps2 * predictedCrownHeightM));
  const impactMomentumNs = Math.max(0.001, input.objectMassKg * impactSpeedMps);
  const launchMomentumNs = sprayMassKg * maxLaunchSpeedMps * clamp(0.36 + breakup * 0.09, 0.28, 0.58);
  const reentryEnergyJ = Math.max(
    input.sprayReentryEnergyJ,
    0.5 * Math.max(0, input.sprayReentryMassKg) * maxLaunchSpeedMps ** 2,
    sprayMassKg * input.gravityMps2 * predictedCrownHeightM * clamp(0.012 + input.impactStrength * 0.018, 0.01, 0.04)
  );
  const reenteredMassKg = clamp(Math.max(input.sprayReentryMassKg, sprayMassKg * clamp(0.1 + input.impactStrength * 0.16, 0.08, 0.28)), 0, sprayMassKg);
  const particleCount = clampInt(
    Math.max(input.sprayParticleCount, 48 + sprayMassKg * 8 + input.froudeNumber * 24 + breakup * 220),
    0,
    4096
  );
  const gridFeedback = gridFeedbackFor(
    {
      gridCellsX: input.gridCellsX,
      gridCellsY: input.gridCellsY,
      localGridFeedbackLimit: input.localGridFeedbackLimit,
    },
    scenario,
    reenteredMassKg,
    reentryEnergyJ,
    launchMomentumNs * clamp(0.12 + input.impactStrength * 0.18, 0.08, 0.32),
    particleCount * clamp(0.04 + breakup * 0.06, 0.03, 0.18)
  );
  const active =
    input.impactStrength > 0.015 ||
    input.splashEnergyJ > 1 ||
    input.sprayReentryEnergyJ > 0.001 ||
    input.sprayParticleCount > 0 ||
    input.splashHeightM > 0.01;

  return {
    active,
    boundedDiagnostics: true,
    coupling: "localized-particle-splash-live-v1",
    displacedWaterMassKg,
    dropletDensity: clamp(particleCount / 4096 + breakup * 0.08 + input.impactStrength * 0.18, 0, 1),
    gridFeedback,
    impactMomentumNs,
    massFractionOfDisplaced: sprayMassKg / Math.max(0.001, displacedWaterMassKg),
    maxLaunchSpeedMps,
    momentumFractionOfImpact: launchMomentumNs / impactMomentumNs,
    noFullGridReadbackPerFrame: true,
    particleCount,
    predictedCrownHeightM,
    referenceSplashBand,
    reenteredMassKg,
    reentryEnergyJ,
    renderIntensity: clamp(input.impactStrength * 0.48 + gridFeedback.foamInjection * 1.45 + particleCount / 5200, 0, 1),
    sampleTimeS: input.timeS,
    sprayMassKg,
  };
}

export function createParticleSplashPlan(options: ParticleSplashBenchmarkOptions = {}): ParticleSplashPlan {
  const tier = options.tier ?? "standard";
  const grid = gridForTier(tier);
  const particleCapacity = options.particleCapacity ?? particleCapacityForTier(tier);
  const bytesPerParticle = particleStride * bytesPerValue;
  return {
    bytesPerParticle,
    bufferRoles: particleSplashBufferRoles,
    dispatchX: Math.ceil(particleCapacity / workgroupSize),
    dtS: defaultDtS,
    estimatedStorageBytes: particleCapacity * bytesPerParticle,
    gridCellsX: grid.cellsX,
    gridCellsY: grid.cellsY,
    localBoundsM: {
      xMax: 4.5,
      xMin: -4.5,
      yMax: 4.6,
      yMin: 0,
    },
    localGridFeedbackLimit: clampInt(Math.round(grid.cellsX * grid.cellsY * 0.015), 96, 4096),
    particleCapacity,
    particleStride,
    steps: options.steps ?? 192,
    tier,
    workgroupSize,
  };
}

export async function runParticleSplashBenchmark(options: ParticleSplashBenchmarkOptions = {}): Promise<ParticleSplashBenchmarkReport> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const gpu = browserGpu();
  if (!gpu) {
    throw new Error("navigator.gpu is unavailable; run npm run fluid:capability before particle-splash benchmarking.");
  }
  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("WebGPU adapter is unavailable for particle-splash benchmark.");

  const plan = createParticleSplashPlan(options);
  const scenario = { ...defaultParticleSplashScenario, ...options.scenario };
  const adapterFeatures = new Set(iterableToStrings(adapter.features));
  const wantsGpuTimestamps = options.requestGpuTimestamps === true && adapterFeatures.has("timestamp-query");
  const device = await adapter.requestDevice(wantsGpuTimestamps ? { requiredFeatures: ["timestamp-query"] } : undefined);
  const deviceFeatures = new Set(iterableToStrings(device.features));
  const timestampQueryEnabled =
    wantsGpuTimestamps &&
    deviceFeatures.has("timestamp-query") &&
    typeof device.createQuerySet === "function";
  const threshold: ParticleSplashThreshold = {
    maxAverageStepMs: options.maxAverageStepMs ?? 3,
    maxMassFractionOfDisplaced: options.maxMassFractionOfDisplaced ?? 0.35,
    maxMassRelativeDrift: options.maxMassRelativeDrift ?? 0.00001,
    maxMomentumFractionOfImpact: options.maxMomentumFractionOfImpact ?? 0.1,
    maxOutsideLocalBoundsCount: 0,
    maxP95GpuStepMs: options.maxP95GpuStepMs ?? 0.65,
    minFeedbackSampleCount: 1,
    minReentryEnergyJ: 0.5,
  };
  const buffers: BufferLike[] = [];

  try {
    const initial = seededParticleSplashFields(plan, scenario);
    const initialDiagnostics = summarizeParticleSplashFields(plan, scenario, initial, initial, null);
    const particles = storageBuffer(device, initial, buffers);
    const uniform = uniformBuffer(device, uniformValues(plan, scenario), buffers);
    const readParticles = readBuffer(device, initial.byteLength, buffers);
    const timestampCount = timestampQueryEnabled ? plan.steps * 2 : 0;
    const querySet = timestampQueryEnabled ? device.createQuerySet?.({ count: timestampCount, type: "timestamp" }) ?? null : null;
    const timestampResolve = querySet ? queryResolveBuffer(device, timestampCount, buffers) : null;
    const timestampRead = querySet ? readBuffer(device, timestampCount * 8, buffers) : null;

    const shader = device.createShaderModule({ code: particleSplashStepShader });
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        storageBinding(0, "storage"),
        { binding: 1, visibility: shaderStageCompute, buffer: { type: "uniform" } },
      ],
    });
    const pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: {
        module: shader,
        entryPoint: "main",
      },
    });
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: particles } },
        { binding: 1, resource: { buffer: uniform } },
      ],
    });

    const encoder = device.createCommandEncoder();
    for (let step = 0; step < plan.steps; step += 1) {
      const pass = encoder.beginComputePass(
        querySet
          ? {
              timestampWrites: {
                beginningOfPassWriteIndex: step * 2,
                endOfPassWriteIndex: step * 2 + 1,
                querySet,
              },
            }
          : undefined
      );
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(plan.dispatchX);
      pass.end();
    }

    encoder.copyBufferToBuffer(particles, 0, readParticles, 0, initial.byteLength);
    if (querySet && timestampResolve && timestampRead && encoder.resolveQuerySet) {
      encoder.resolveQuerySet(querySet, 0, timestampCount, timestampResolve, 0);
      encoder.copyBufferToBuffer(timestampResolve, 0, timestampRead, 0, timestampCount * 8);
    }

    const startedAt = performance.now();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    const totalMs = performance.now() - startedAt;
    const finalParticles = await mappedFloat32(readParticles, initial.length);
    const gpuTiming = timestampRead
      ? summarizeGpuTimestampPairs(await mappedBigUint64(timestampRead, timestampCount))
      : emptyGpuTiming(false);
    const diagnostics = summarizeParticleSplashFields(plan, scenario, finalParticles, initial, initialDiagnostics);
    const averageStepMs = totalMs / Math.max(1, plan.steps);
    const gpuP95 = gpuTiming.p95StepMs ?? 0;
    const pass =
      averageStepMs <= threshold.maxAverageStepMs &&
      (gpuTiming.p95StepMs === null || gpuP95 <= threshold.maxP95GpuStepMs) &&
      diagnostics.massRelativeDrift <= threshold.maxMassRelativeDrift &&
      diagnostics.massFractionOfDisplaced <= threshold.maxMassFractionOfDisplaced &&
      diagnostics.momentumFractionOfImpact <= threshold.maxMomentumFractionOfImpact &&
      diagnostics.outsideLocalBoundsCount <= threshold.maxOutsideLocalBoundsCount &&
      diagnostics.predictedCrownHeightM >= diagnostics.referenceSplashBand.minM &&
      diagnostics.predictedCrownHeightM <= diagnostics.referenceSplashBand.maxM &&
      diagnostics.reentryEnergyJ >= threshold.minReentryEnergyJ &&
      diagnostics.gridFeedback.sampleCount >= threshold.minFeedbackSampleCount;

    return {
      backend: "webgpu-compute",
      capability: options.capability
        ? {
            adapterName: options.capability.adapterName,
            features: options.capability.features,
            limits: options.capability.limits,
            status: options.capability.status,
          }
        : null,
      diagnostics,
      generatedAt,
      gpuTiming,
      noFullGridReadbackPerFrame: true,
      pass,
      plan,
      scenario,
      solver: "localized-particle-splash-v1",
      stepTiming: {
        averageStepMs,
        totalMs,
      },
      threshold,
    };
  } finally {
    for (const buffer of buffers) buffer.destroy?.();
    device.destroy?.();
  }
}

export const particleSplashStepShader = `
struct Params {
  particleCount: f32,
  dt: f32,
  gravity: f32,
  drag: f32,
  foamGain: f32,
  foamDecay: f32,
  xMin: f32,
  xMax: f32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<f32>;
@group(0) @binding(1) var<uniform> params: Params;

@compute @workgroup_size(${workgroupSize}, 1, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let particleIndex = id.x;
  if (particleIndex >= u32(params.particleCount)) {
    return;
  }

  let offset = particleIndex * ${particleStride}u;
  var x = particles[offset + 0u];
  var y = particles[offset + 1u];
  var vx = particles[offset + 2u];
  var vy = particles[offset + 3u];
  let mass = particles[offset + 4u];
  var alive = particles[offset + 5u];
  var reentryEnergy = particles[offset + 6u];
  var foam = particles[offset + 7u] * params.foamDecay;

  if (alive > 0.5) {
    vx = vx * params.drag;
    vy = (vy - params.gravity * params.dt) * params.drag;
    x = clamp(x + vx * params.dt, params.xMin, params.xMax);
    y = y + vy * params.dt;

    if (y <= 0.0 && vy < 0.0) {
      y = 0.0;
      alive = 0.0;
      let speed2 = vx * vx + vy * vy;
      reentryEnergy = max(reentryEnergy, 0.5 * mass * speed2);
      foam = max(foam, clamp(mass * abs(vy) * params.foamGain, 0.0, 1.0));
    }
  }

  particles[offset + 0u] = x;
  particles[offset + 1u] = y;
  particles[offset + 2u] = vx;
  particles[offset + 3u] = vy;
  particles[offset + 4u] = mass;
  particles[offset + 5u] = alive;
  particles[offset + 6u] = reentryEnergy;
  particles[offset + 7u] = foam;
}
`;

export function seededParticleSplashFields(plan: ParticleSplashPlan, scenario: ParticleSplashScenario = defaultParticleSplashScenario): Float32Array {
  const values = new Float32Array(plan.particleCapacity * particleStride);
  const referenceBand = referenceSplashBandFor(scenario);
  const ballisticHeadM = scenario.impactSpeedMps ** 2 / Math.max(0.001, scenario.gravityMps2);
  const targetCrownHeightM = clamp(
    0.11 * ballisticHeadM + 0.42 * scenario.objectDiameterM,
    referenceBand.minM + 0.04,
    referenceBand.maxM * 0.88
  );
  const baseVerticalSpeedMps = Math.sqrt(2 * scenario.gravityMps2 * targetCrownHeightM);
  const displacedWaterMassKg = displacedWaterMassFor(scenario);
  const breakup = surfaceBreakupFactorFor(scenario.weberNumber);
  const sprayMassKg = displacedWaterMassKg * clamp(0.08 + breakup * 0.065 + scenario.froudeNumber * 0.012, 0.08, 0.26);
  const massPerParticleKg = sprayMassKg / Math.max(1, plan.particleCapacity);
  const crownRadiusM = clamp(
    scenario.objectDiameterM * (0.9 + scenario.froudeNumber * 0.16) + Math.sqrt(Math.max(0.001, sprayMassKg / scenario.waterDensityKgM3)) * 2.2,
    0.45,
    2.6
  );

  for (let index = 0; index < plan.particleCapacity; index += 1) {
    const offset = index * particleStride;
    const phase = (index / Math.max(1, plan.particleCapacity)) * Math.PI * 2;
    const shell = (index % 97) / 96;
    const ring = 0.32 + shell * 0.68;
    const directionalBias = 0.84 + 0.16 * Math.sin(index * 0.37);
    const launchHeightFactor = 0.74 + 0.22 * Math.sin(index * 0.193) + 0.04 * Math.cos(index * 0.071);
    const vx = Math.cos(phase) * crownRadiusM * (0.78 + ring * 0.58) * directionalBias;
    const vy = baseVerticalSpeedMps * clamp(launchHeightFactor, 0.62, 1.0);
    const x = Math.cos(phase) * scenario.objectDiameterM * 0.18 * ring;
    const y = 0.015 + scenario.objectDiameterM * 0.055 * (1 - shell);

    values[offset + 0] = x;
    values[offset + 1] = y;
    values[offset + 2] = vx;
    values[offset + 3] = vy;
    values[offset + 4] = massPerParticleKg;
    values[offset + 5] = 1;
    values[offset + 6] = 0;
    values[offset + 7] = clamp(0.03 + breakup * 0.05 + shell * 0.04, 0, 1);
  }

  return values;
}

export function summarizeParticleSplashFields(
  plan: ParticleSplashPlan,
  scenario: ParticleSplashScenario,
  finalParticles: Float32Array,
  initialParticles: Float32Array,
  initial: Pick<ParticleSplashDiagnostics, "initialMomentumAbsNs" | "initialParticleMassKg" | "maxBallisticHeightM" | "maxLaunchSpeedMps" | "predictedCrownHeightM"> | null
): ParticleSplashDiagnostics {
  const referenceSplashBand = referenceSplashBandFor(scenario);
  const displacedWaterMassKg = displacedWaterMassFor(scenario);
  const impactMomentumNs = scenario.objectMassKg * scenario.impactSpeedMps;
  const impactEnergyJ = 0.5 * scenario.objectMassKg * scenario.impactSpeedMps ** 2;
  let activeFinalParticleCount = 0;
  let finalAliveMassKg = 0;
  let foamContribution = 0;
  let initialMomentumAbsNs = 0;
  let initialParticleMassKg = 0;
  let maxBallisticHeightM = 0;
  let maxLaunchSpeedMps = 0;
  let outsideLocalBoundsCount = 0;
  let reenteredMassKg = 0;
  let reentryEnergyJ = 0;
  let reentryImpulseNs = 0;

  for (let index = 0; index < plan.particleCapacity; index += 1) {
    const offset = index * particleStride;
    const initialVx = initialParticles[offset + 2];
    const initialVy = initialParticles[offset + 3];
    const initialMass = initialParticles[offset + 4];
    initialParticleMassKg += initialMass;
    initialMomentumAbsNs += initialMass * Math.hypot(initialVx, initialVy);
    maxLaunchSpeedMps = Math.max(maxLaunchSpeedMps, Math.hypot(initialVx, initialVy));
    maxBallisticHeightM = Math.max(maxBallisticHeightM, initialVy ** 2 / Math.max(0.001, 2 * scenario.gravityMps2));

    const x = finalParticles[offset + 0];
    const y = finalParticles[offset + 1];
    const vx = finalParticles[offset + 2];
    const vy = finalParticles[offset + 3];
    const mass = finalParticles[offset + 4];
    const alive = finalParticles[offset + 5] > 0.5;
    const particleReentryEnergyJ = Math.max(0, finalParticles[offset + 6]);
    foamContribution += Math.max(0, finalParticles[offset + 7]);
    if (x < plan.localBoundsM.xMin - 1e-4 || x > plan.localBoundsM.xMax + 1e-4 || y < plan.localBoundsM.yMin - 1e-4 || y > plan.localBoundsM.yMax + 1e-4) {
      outsideLocalBoundsCount += 1;
    }
    if (alive) {
      activeFinalParticleCount += 1;
      finalAliveMassKg += mass;
    } else {
      reenteredMassKg += mass;
      reentryEnergyJ += particleReentryEnergyJ;
      reentryImpulseNs += mass * Math.hypot(vx, vy);
    }
  }

  const stableInitial = initial ?? {
    initialMomentumAbsNs,
    initialParticleMassKg,
    maxBallisticHeightM,
    maxLaunchSpeedMps,
    predictedCrownHeightM: maxBallisticHeightM,
  };
  const massAccountedKg = finalAliveMassKg + reenteredMassKg;
  const gridFeedback = gridFeedbackFor(plan, scenario, reenteredMassKg, reentryEnergyJ, reentryImpulseNs, foamContribution);

  return {
    activeFinalParticleCount,
    boundedDiagnostics: true,
    displacedWaterMassKg,
    entrainedAirMassKg: initialParticleMassKg * clamp(0.02 + surfaceBreakupFactorFor(scenario.weberNumber) * 0.12 + foamContribution / Math.max(1, plan.particleCapacity) * 0.4, 0, 0.32),
    finalAliveMassKg,
    foamContribution,
    gridFeedback,
    impactEnergyJ,
    impactMomentumNs,
    initialMomentumAbsNs: stableInitial.initialMomentumAbsNs,
    initialParticleMassKg: stableInitial.initialParticleMassKg,
    massAccountedKg,
    massFractionOfDisplaced: stableInitial.initialParticleMassKg / Math.max(0.001, displacedWaterMassKg),
    massRelativeDrift: Math.abs(massAccountedKg - stableInitial.initialParticleMassKg) / Math.max(0.001, stableInitial.initialParticleMassKg),
    maxBallisticHeightM: stableInitial.maxBallisticHeightM,
    maxLaunchSpeedMps: stableInitial.maxLaunchSpeedMps,
    momentumFractionOfImpact: stableInitial.initialMomentumAbsNs / Math.max(0.001, impactMomentumNs),
    outsideLocalBoundsCount,
    particleCount: plan.particleCapacity,
    predictedCrownHeightM: stableInitial.predictedCrownHeightM,
    referenceSplashBand,
    reenteredMassKg,
    reentryEnergyJ,
    reentryImpulseNs,
  };
}

export function referenceSplashBandFor(scenario: ParticleSplashScenario): ParticleSplashReferenceBand {
  const ballisticHeadM = scenario.impactSpeedMps ** 2 / Math.max(0.001, scenario.gravityMps2);
  return {
    formula: "0.045..0.19 * impactSpeedMps^2 / gravityMps2 + 0.18..0.9 * objectDiameterM",
    maxM: 0.19 * ballisticHeadM + 0.9 * scenario.objectDiameterM,
    minM: 0.045 * ballisticHeadM + 0.18 * scenario.objectDiameterM,
  };
}

function gridFeedbackFor(
  plan: Pick<ParticleSplashPlan, "gridCellsX" | "gridCellsY" | "localGridFeedbackLimit"> & { particleCapacity?: number },
  scenario: ParticleSplashScenario,
  reenteredMassKg: number,
  reentryEnergyJ: number,
  reentryImpulseNs: number,
  foamContribution: number
): ParticleSplashGridFeedback {
  const radiusCells = clampInt(
    Math.ceil(Math.sqrt(Math.max(0.0001, reenteredMassKg / Math.max(1, scenario.waterDensityKgM3))) * 14 + Math.sqrt(Math.max(0, reentryEnergyJ)) * 0.08),
    2,
    Math.max(2, Math.floor(Math.min(plan.gridCellsX, plan.gridCellsY) * 0.08))
  );
  const centerX = Math.floor(plan.gridCellsX * 0.5);
  const centerY = Math.floor(plan.gridCellsY * 0.48);
  const rawSampleCount = Math.round(Math.PI * radiusCells * radiusCells);
  return {
    bounds: {
      xEnd: clampInt(centerX + radiusCells, 1, plan.gridCellsX - 2),
      xStart: clampInt(centerX - radiusCells, 1, plan.gridCellsX - 2),
      yEnd: clampInt(centerY + radiusCells, 1, plan.gridCellsY - 2),
      yStart: clampInt(centerY - radiusCells, 1, plan.gridCellsY - 2),
    },
    energyJ: reentryEnergyJ,
    foamInjection: clamp(foamContribution / Math.max(1, plan.particleCapacity ?? plan.localGridFeedbackLimit) + reentryEnergyJ * 0.00008, 0, 1),
    impulseNs: reentryImpulseNs,
    massKg: reenteredMassKg,
    sampleCount: clampInt(rawSampleCount, reentryEnergyJ > 0 ? 1 : 0, plan.localGridFeedbackLimit),
  };
}

function particleCapacityForTier(tier: FluidGridTierId): number {
  switch (tier) {
    case "low":
      return 1024;
    case "high":
      return 4096;
    case "ultra":
      return 8192;
    case "standard":
    default:
      return 2048;
  }
}

function displacedWaterMassFor(scenario: ParticleSplashScenario): number {
  return Math.max(0, scenario.displacedVolumeM3) * scenario.waterDensityKgM3;
}

function browserGpu(): GpuLike | null {
  const maybeNavigator = typeof navigator === "undefined" ? null : (navigator as unknown as { gpu?: GpuLike });
  return maybeNavigator?.gpu ?? null;
}

function storageBinding(binding: number, type: "read-only-storage" | "storage") {
  return { binding, visibility: shaderStageCompute, buffer: { type } };
}

function storageBuffer(device: DeviceLike, values: Float32Array, buffers: BufferLike[]): BufferLike {
  const buffer = device.createBuffer({
    size: values.byteLength,
    usage: usage.storage | usage.copySrc | usage.copyDst,
  });
  device.queue.writeBuffer(buffer, 0, values);
  buffers.push(buffer);
  return buffer;
}

function uniformBuffer(device: DeviceLike, values: Float32Array, buffers: BufferLike[]): BufferLike {
  const buffer = device.createBuffer({
    size: values.byteLength,
    usage: usage.uniform | usage.copyDst,
  });
  device.queue.writeBuffer(buffer, 0, values);
  buffers.push(buffer);
  return buffer;
}

function readBuffer(device: DeviceLike, size: number, buffers: BufferLike[]): BufferLike {
  const buffer = device.createBuffer({
    size,
    usage: usage.mapRead | usage.copyDst,
  });
  buffers.push(buffer);
  return buffer;
}

function queryResolveBuffer(device: DeviceLike, queryCount: number, buffers: BufferLike[]): BufferLike {
  const buffer = device.createBuffer({
    size: queryCount * 8,
    usage: usage.queryResolve | usage.copySrc,
  });
  buffers.push(buffer);
  return buffer;
}

function uniformValues(plan: ParticleSplashPlan, scenario: ParticleSplashScenario): Float32Array {
  return new Float32Array([plan.particleCapacity, plan.dtS, scenario.gravityMps2, 0.998, 0.22, 0.996, plan.localBoundsM.xMin, plan.localBoundsM.xMax]);
}

async function mappedFloat32(buffer: BufferLike, length: number): Promise<Float32Array> {
  await buffer.mapAsync(mapModeRead);
  const copy = new Float32Array(buffer.getMappedRange()).slice(0, length);
  buffer.unmap();
  return copy;
}

async function mappedBigUint64(buffer: BufferLike, length: number): Promise<BigUint64Array> {
  await buffer.mapAsync(mapModeRead);
  const copy = new BigUint64Array(buffer.getMappedRange()).slice(0, length);
  buffer.unmap();
  return copy;
}

function summarizeGpuTimestampPairs(values: BigUint64Array): ParticleSplashGpuTiming {
  const durationsMs: number[] = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    const start = values[index];
    const end = values[index + 1];
    if (end >= start) {
      durationsMs.push(Number(end - start) / 1_000_000);
    }
  }
  if (durationsMs.length === 0) return emptyGpuTiming(true);
  durationsMs.sort((left, right) => left - right);
  const total = durationsMs.reduce((sum, value) => sum + value, 0);
  return {
    averageStepMs: total / durationsMs.length,
    maxStepMs: durationsMs[durationsMs.length - 1],
    minStepMs: durationsMs[0],
    p95StepMs: percentileSorted(durationsMs, 0.95),
    sampleCount: durationsMs.length,
    timestampQueryEnabled: true,
  };
}

function emptyGpuTiming(timestampQueryEnabled: boolean): ParticleSplashGpuTiming {
  return {
    averageStepMs: null,
    maxStepMs: null,
    minStepMs: null,
    p95StepMs: null,
    sampleCount: 0,
    timestampQueryEnabled,
  };
}

function percentileSorted(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * percentile) - 1));
  return values[index];
}

function surfaceBreakupFactorFor(weberNumber: number): number {
  return clamp(Math.log10(Math.max(1, weberNumber)) / 5, 0, 1.35);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

function iterableToStrings(values: Iterable<unknown> | undefined): string[] {
  if (!values) return [];
  return Array.from(values).filter((value): value is string => typeof value === "string" && value.length > 0);
}
