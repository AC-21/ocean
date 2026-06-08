import { gridForTier, type FluidCapabilityReport } from "./webgpuCapability";
import type { FluidGridTierId } from "./fluidGridContract";

export type ShallowWaterBufferRole = "height" | "heightScratch" | "momentumX" | "momentumXScratch" | "momentumY" | "momentumYScratch" | "dryMask";
export type ShallowWaterSolverId = "conservative-shallow-water-v1" | "bounded-pressure-gradient-v1";

export type ShallowWaterStepPlan = {
  bytesPerField: number;
  bufferRoles: ShallowWaterBufferRole[];
  cellAreaM2: number;
  cellCount: number;
  cellSizeM: number;
  cellsX: number;
  cellsY: number;
  cfl: number;
  damping: number;
  dispatchX: number;
  dispatchY: number;
  dtS: number;
  estimatedStorageBytes: number;
  gravityMps2: number;
  maxMomentumPerDepthMps: number;
  maxDepthM: number;
  minDepthM: number;
  pressureGain: number;
  pressureGradient: boolean;
  slopeLimit: number;
  solver: ShallowWaterSolverId;
  steps: number;
  tier: FluidGridTierId;
  waveSpeedMps: number;
  workgroupSizeX: number;
  workgroupSizeY: number;
};

export type ShallowWaterPressureDiagnostics = {
  active: boolean;
  energyRelativeDrift: number;
  finalEnergyJ: number;
  finalKineticEnergyJ: number;
  finalPotentialEnergyJ: number;
  initialEnergyJ: number;
  initialKineticEnergyJ: number;
  initialPotentialEnergyJ: number;
  maxSurfaceSlope: number;
  meanSurfaceSlope: number;
  momentumGrowthRatio: number;
  pressureGain: number;
  pressureWorkEstimateJ: number;
  slopeLimit: number;
  slopeLimitedCells: number;
};

export type ShallowWaterDiagnostics = {
  dryCellsWithWater: number;
  finalDryCellCount: number;
  finalMassM3: number;
  finalMomentumAbsM3ps: number;
  initialDryCellCount: number;
  initialMassM3: number;
  initialMomentumAbsM3ps: number;
  massRelativeDrift: number;
  maxDepthM: number;
  minDepthM: number;
  momentumDampingRatio: number;
  negativeDepthCells: number;
  pressure: ShallowWaterPressureDiagnostics;
  wetCellCount: number;
};

export type ShallowWaterTiming = {
  averageStepMs: number;
  totalMs: number;
};

export type ShallowWaterGpuTiming = {
  averageStepMs: number | null;
  maxStepMs: number | null;
  minStepMs: number | null;
  p95StepMs: number | null;
  sampleCount: number;
  timestampQueryEnabled: boolean;
};

export type ShallowWaterBenchmarkThreshold = {
  maxAverageStepMs: number;
  maxCfl: number;
  maxDryCellsWithWater: number;
  maxMassRelativeDrift: number;
  maxNegativeDepthCells: number;
  maxPressureEnergyRelativeDrift: number;
  maxPressureMomentumGrowthRatio: number;
  maxP95GpuStepMs: number;
  maxWetDryCellDelta: number;
  minMomentumDampingRatio: number;
  minPressureSlopeLimitedCells: number;
  minPressureWorkEstimateJ: number;
};

export type ShallowWaterBenchmarkReport = {
  backend: "webgpu-compute";
  capability: Pick<FluidCapabilityReport, "adapterName" | "features" | "limits" | "status"> | null;
  diagnostics: ShallowWaterDiagnostics;
  generatedAt: string;
  gpuTiming: ShallowWaterGpuTiming;
  noFullGridReadbackPerFrame: boolean;
  pass: boolean;
  plan: ShallowWaterStepPlan;
  solver: ShallowWaterSolverId;
  stepTiming: ShallowWaterTiming;
  threshold: ShallowWaterBenchmarkThreshold;
};

export type ShallowWaterBenchmarkOptions = {
  capability?: FluidCapabilityReport | null;
  cellSizeM?: number;
  generatedAt?: string;
  gridDimensions?: {
    cellsX: number;
    cellsY: number;
  };
  maxAverageStepMs?: number;
  maxCfl?: number;
  maxMassRelativeDrift?: number;
  maxP95GpuStepMs?: number;
  pressureGain?: number;
  pressureGradient?: boolean;
  requestGpuTimestamps?: boolean;
  slopeLimit?: number;
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
  dispatchWorkgroups: (x: number, y: number) => void;
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
const workgroupSizeX = 8;
const workgroupSizeY = 8;
const defaultCellSizeM = 0.08;
const defaultDtS = 1 / 120;
const defaultDamping = 0.992;
const defaultGravityMps2 = 9.80665;
const defaultMaxDepthM = 1.15;
const defaultMinDepthM = 0.001;
const defaultPressureGain = 0.06;
const defaultSlopeLimit = 0.34;
const defaultMaxMomentumPerDepthMps = 1.15;
const waterDensityKgM3 = 997;

export const shallowWaterBufferRoles: ShallowWaterBufferRole[] = [
  "height",
  "heightScratch",
  "momentumX",
  "momentumXScratch",
  "momentumY",
  "momentumYScratch",
  "dryMask",
];

export function createShallowWaterStepPlan(options: ShallowWaterBenchmarkOptions = {}): ShallowWaterStepPlan {
  const tier = options.tier ?? "standard";
  const grid = options.gridDimensions ?? gridForTier(tier);
  const cellCount = grid.cellsX * grid.cellsY;
  const cellSizeM = options.cellSizeM ?? defaultCellSizeM;
  const pressureGradient = options.pressureGradient === true;
  const gravityMps2 = defaultGravityMps2;
  const maxDepthM = defaultMaxDepthM;
  const waveSpeedMps = Math.sqrt(gravityMps2 * maxDepthM);
  const dtS = defaultDtS;
  const cfl = (waveSpeedMps * dtS * Math.SQRT2) / cellSizeM;
  const bytesPerField = cellCount * bytesPerValue;
  return {
    bytesPerField,
    bufferRoles: shallowWaterBufferRoles,
    cellAreaM2: cellSizeM * cellSizeM,
    cellCount,
    cellSizeM,
    cellsX: grid.cellsX,
    cellsY: grid.cellsY,
    cfl,
    damping: defaultDamping,
    dispatchX: Math.ceil(grid.cellsX / workgroupSizeX),
    dispatchY: Math.ceil(grid.cellsY / workgroupSizeY),
    dtS,
    estimatedStorageBytes: bytesPerField * shallowWaterBufferRoles.length,
    gravityMps2,
    maxMomentumPerDepthMps: defaultMaxMomentumPerDepthMps,
    maxDepthM,
    minDepthM: defaultMinDepthM,
    pressureGain: pressureGradient ? options.pressureGain ?? defaultPressureGain : 0,
    pressureGradient,
    slopeLimit: options.slopeLimit ?? defaultSlopeLimit,
    solver: pressureGradient ? "bounded-pressure-gradient-v1" : "conservative-shallow-water-v1",
    steps: options.steps ?? 96,
    tier,
    waveSpeedMps,
    workgroupSizeX,
    workgroupSizeY,
  };
}

export async function runShallowWaterBenchmark(options: ShallowWaterBenchmarkOptions = {}): Promise<ShallowWaterBenchmarkReport> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const gpu = browserGpu();
  if (!gpu) {
    throw new Error("navigator.gpu is unavailable; run npm run fluid:capability before shallow-water benchmarking.");
  }
  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("WebGPU adapter is unavailable for shallow-water benchmark.");

  const plan = createShallowWaterStepPlan(options);
  const adapterFeatures = new Set(iterableToStrings(adapter.features));
  const wantsGpuTimestamps = options.requestGpuTimestamps === true && adapterFeatures.has("timestamp-query");
  const device = await adapter.requestDevice(wantsGpuTimestamps ? { requiredFeatures: ["timestamp-query"] } : undefined);
  const deviceFeatures = new Set(iterableToStrings(device.features));
  const timestampQueryEnabled =
    wantsGpuTimestamps &&
    deviceFeatures.has("timestamp-query") &&
    typeof device.createQuerySet === "function";
  const threshold: ShallowWaterBenchmarkThreshold = {
    maxAverageStepMs: options.maxAverageStepMs ?? 4,
    maxCfl: options.maxCfl ?? 0.58,
    maxDryCellsWithWater: 0,
    maxMassRelativeDrift: options.maxMassRelativeDrift ?? 0.004,
    maxNegativeDepthCells: 0,
    maxPressureEnergyRelativeDrift: 0.08,
    maxPressureMomentumGrowthRatio: 2.1,
    maxP95GpuStepMs: options.maxP95GpuStepMs ?? 0.65,
    maxWetDryCellDelta: 0,
    minMomentumDampingRatio: 0.08,
    minPressureSlopeLimitedCells: plan.pressureGradient ? 1 : 0,
    minPressureWorkEstimateJ: plan.pressureGradient ? 0.05 : 0,
  };
  const buffers: BufferLike[] = [];

  try {
    const initial = seededShallowWaterFields(plan);
    const initialDiagnostics = summarizeShallowWaterFields(plan, initial.height, initial.momentumX, initial.momentumY, initial.dryMask, null);
    const height = storageBuffer(device, initial.height, buffers);
    const heightScratch = storageBuffer(device, initial.heightScratch, buffers);
    const momentumX = storageBuffer(device, initial.momentumX, buffers);
    const momentumXScratch = storageBuffer(device, initial.momentumXScratch, buffers);
    const momentumY = storageBuffer(device, initial.momentumY, buffers);
    const momentumYScratch = storageBuffer(device, initial.momentumYScratch, buffers);
    const dryMask = storageBuffer(device, initial.dryMask, buffers);
    const uniform = uniformBuffer(device, uniformValues(plan), buffers);
    const readHeight = readBuffer(device, plan.bytesPerField, buffers);
    const readMomentumX = readBuffer(device, plan.bytesPerField, buffers);
    const readMomentumY = readBuffer(device, plan.bytesPerField, buffers);
    const timestampCount = timestampQueryEnabled ? plan.steps * 2 : 0;
    const querySet = timestampQueryEnabled ? device.createQuerySet?.({ count: timestampCount, type: "timestamp" }) ?? null : null;
    const timestampResolve = querySet ? queryResolveBuffer(device, timestampCount, buffers) : null;
    const timestampRead = querySet ? readBuffer(device, timestampCount * 8, buffers) : null;

    const shader = device.createShaderModule({ code: shallowWaterStepShader });
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        storageBinding(0, "read-only-storage"),
        storageBinding(1, "storage"),
        storageBinding(2, "read-only-storage"),
        storageBinding(3, "storage"),
        storageBinding(4, "read-only-storage"),
        storageBinding(5, "storage"),
        storageBinding(6, "read-only-storage"),
        { binding: 7, visibility: shaderStageCompute, buffer: { type: "uniform" } },
      ],
    });
    const pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: {
        module: shader,
        entryPoint: "main",
      },
    });
    const bindA = device.createBindGroup({
      layout: bindGroupLayout,
      entries: bindEntries(height, heightScratch, momentumX, momentumXScratch, momentumY, momentumYScratch, dryMask, uniform),
    });
    const bindB = device.createBindGroup({
      layout: bindGroupLayout,
      entries: bindEntries(heightScratch, height, momentumXScratch, momentumX, momentumYScratch, momentumY, dryMask, uniform),
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
      pass.setBindGroup(0, step % 2 === 0 ? bindA : bindB);
      pass.dispatchWorkgroups(plan.dispatchX, plan.dispatchY);
      pass.end();
    }

    const finalHeight = plan.steps % 2 === 0 ? height : heightScratch;
    const finalMomentumX = plan.steps % 2 === 0 ? momentumX : momentumXScratch;
    const finalMomentumY = plan.steps % 2 === 0 ? momentumY : momentumYScratch;
    encoder.copyBufferToBuffer(finalHeight, 0, readHeight, 0, plan.bytesPerField);
    encoder.copyBufferToBuffer(finalMomentumX, 0, readMomentumX, 0, plan.bytesPerField);
    encoder.copyBufferToBuffer(finalMomentumY, 0, readMomentumY, 0, plan.bytesPerField);
    if (querySet && timestampResolve && timestampRead && encoder.resolveQuerySet) {
      encoder.resolveQuerySet(querySet, 0, timestampCount, timestampResolve, 0);
      encoder.copyBufferToBuffer(timestampResolve, 0, timestampRead, 0, timestampCount * 8);
    }

    const startedAt = performance.now();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    const totalMs = performance.now() - startedAt;
    const [heightValues, momentumXValues, momentumYValues] = await Promise.all([
      mappedFloat32(readHeight, plan.cellCount),
      mappedFloat32(readMomentumX, plan.cellCount),
      mappedFloat32(readMomentumY, plan.cellCount),
    ]);
    const gpuTiming = timestampRead
      ? summarizeGpuTimestampPairs(await mappedBigUint64(timestampRead, timestampCount))
      : emptyGpuTiming(false);
    const diagnostics = summarizeShallowWaterFields(plan, heightValues, momentumXValues, momentumYValues, initial.dryMask, initialDiagnostics);
    const averageStepMs = totalMs / Math.max(1, plan.steps);
    const gpuP95 = gpuTiming.p95StepMs ?? 0;
    const pass =
      averageStepMs <= threshold.maxAverageStepMs &&
      (gpuTiming.p95StepMs === null || gpuP95 <= threshold.maxP95GpuStepMs) &&
      plan.cfl <= threshold.maxCfl &&
      diagnostics.massRelativeDrift <= threshold.maxMassRelativeDrift &&
      diagnostics.negativeDepthCells <= threshold.maxNegativeDepthCells &&
      diagnostics.dryCellsWithWater <= threshold.maxDryCellsWithWater &&
      Math.abs(diagnostics.finalDryCellCount - diagnostics.initialDryCellCount) <= threshold.maxWetDryCellDelta &&
      diagnostics.momentumDampingRatio >= threshold.minMomentumDampingRatio &&
      (plan.pressureGradient ? diagnostics.pressure.momentumGrowthRatio < threshold.maxPressureMomentumGrowthRatio : diagnostics.momentumDampingRatio < 1) &&
      pressureDiagnosticsPass(diagnostics.pressure, threshold, plan);

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
      solver: plan.solver,
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

export const shallowWaterStepShader = `
struct Params {
  width: f32,
  height: f32,
  dt: f32,
  cellSize: f32,
  gravity: f32,
  damping: f32,
  minDepth: f32,
  pressureGain: f32,
  slopeLimit: f32,
  maxMomentumPerDepth: f32,
};

@group(0) @binding(0) var<storage, read> hIn: array<f32>;
@group(0) @binding(1) var<storage, read_write> hOut: array<f32>;
@group(0) @binding(2) var<storage, read> mxIn: array<f32>;
@group(0) @binding(3) var<storage, read_write> mxOut: array<f32>;
@group(0) @binding(4) var<storage, read> myIn: array<f32>;
@group(0) @binding(5) var<storage, read_write> myOut: array<f32>;
@group(0) @binding(6) var<storage, read> dryMask: array<f32>;
@group(0) @binding(7) var<uniform> params: Params;

fn at(x: u32, y: u32, width: u32) -> u32 {
  return y * width + x;
}

@compute @workgroup_size(${workgroupSizeX}, ${workgroupSizeY}, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let width = u32(params.width);
  let height = u32(params.height);
  if (id.x >= width || id.y >= height) {
    return;
  }

  let index = at(id.x, id.y, width);
  let blocked = dryMask[index] > 0.5;
  if (blocked) {
    hOut[index] = 0.0;
    mxOut[index] = 0.0;
    myOut[index] = 0.0;
    return;
  }

  let xL = max(id.x, 1u) - 1u;
  let xR = min(id.x + 1u, width - 1u);
  let yD = max(id.y, 1u) - 1u;
  let yU = min(id.y + 1u, height - 1u);
  let left = at(xL, id.y, width);
  let right = at(xR, id.y, width);
  let down = at(id.x, yD, width);
  let up = at(id.x, yU, width);

  let h = max(0.0, hIn[index]);
  let hLeft = select(max(0.0, hIn[left]), 0.0, dryMask[left] > 0.5);
  let hRight = select(max(0.0, hIn[right]), 0.0, dryMask[right] > 0.5);
  let hDown = select(max(0.0, hIn[down]), 0.0, dryMask[down] > 0.5);
  let hUp = select(max(0.0, hIn[up]), 0.0, dryMask[up] > 0.5);
  let fluxR = select(0.5 * (mxIn[index] + mxIn[right]), 0.0, dryMask[right] > 0.5);
  let fluxL = select(0.5 * (mxIn[left] + mxIn[index]), 0.0, dryMask[left] > 0.5);
  let fluxU = select(0.5 * (myIn[index] + myIn[up]), 0.0, dryMask[up] > 0.5);
  let fluxD = select(0.5 * (myIn[down] + myIn[index]), 0.0, dryMask[down] > 0.5);
  let dFluxX = (fluxR - fluxL) / params.cellSize;
  let dFluxY = (fluxU - fluxD) / params.cellSize;
  var nextH = h - params.dt * (dFluxX + dFluxY);
  nextH = max(0.0, nextH);

  let surfaceGradX = clamp((hRight - hLeft) / (2.0 * params.cellSize), -params.slopeLimit, params.slopeLimit);
  let surfaceGradY = clamp((hUp - hDown) / (2.0 * params.cellSize), -params.slopeLimit, params.slopeLimit);
  let wetDepth = max(params.minDepth, h);
  var nextMx = (mxIn[index] - params.dt * params.gravity * wetDepth * surfaceGradX * params.pressureGain) * params.damping;
  var nextMy = (myIn[index] - params.dt * params.gravity * wetDepth * surfaceGradY * params.pressureGain) * params.damping;
  let momentumLimit = max(params.minDepth, nextH) * params.maxMomentumPerDepth;
  let momentumLength = length(vec2<f32>(nextMx, nextMy));
  if (momentumLength > momentumLimit) {
    let limitScale = momentumLimit / max(momentumLength, 0.000001);
    nextMx = nextMx * limitScale;
    nextMy = nextMy * limitScale;
  }

  if (nextH <= params.minDepth) {
    nextMx = 0.0;
    nextMy = 0.0;
  }

  hOut[index] = nextH;
  mxOut[index] = nextMx;
  myOut[index] = nextMy;
}
`;

export function seededShallowWaterFields(plan: ShallowWaterStepPlan) {
  const height = new Float32Array(plan.cellCount);
  const heightScratch = new Float32Array(plan.cellCount);
  const momentumX = new Float32Array(plan.cellCount);
  const momentumXScratch = new Float32Array(plan.cellCount);
  const momentumY = new Float32Array(plan.cellCount);
  const momentumYScratch = new Float32Array(plan.cellCount);
  const dryMask = new Float32Array(plan.cellCount);
  const centerX = plan.cellsX * 0.5;
  const centerY = plan.cellsY * 0.48;
  const radius = Math.max(8, Math.min(plan.cellsX, plan.cellsY) * 0.08);
  const islandX = plan.cellsX * 0.67;
  const islandY = plan.cellsY * 0.5;
  const islandRadius = Math.max(4, Math.min(plan.cellsX, plan.cellsY) * 0.035);

  for (let y = 0; y < plan.cellsY; y += 1) {
    for (let x = 0; x < plan.cellsX; x += 1) {
      const index = y * plan.cellsX + x;
      const edge = x === 0 || y === 0 || x === plan.cellsX - 1 || y === plan.cellsY - 1;
      const islandDistance = Math.hypot(x - islandX, y - islandY);
      const dry = edge || islandDistance <= islandRadius;
      dryMask[index] = dry ? 1 : 0;
      if (dry) continue;

      const slopeDepth = 0.72 + 0.32 * (y / Math.max(1, plan.cellsY - 1));
      const dx = (x - centerX) / radius;
      const dy = (y - centerY) / radius;
      const gaussian = Math.exp(-(dx * dx + dy * dy));
      const swirl = Math.exp(-0.5 * (dx * dx + dy * dy));
      height[index] = slopeDepth + 0.055 * gaussian;
      momentumX[index] = 0.008 * height[index] * (-dy) * swirl;
      momentumY[index] = 0.006 * height[index] * dx * swirl;
    }
  }

  return { dryMask, height, heightScratch, momentumX, momentumXScratch, momentumY, momentumYScratch };
}

export function summarizeShallowWaterFields(
  plan: ShallowWaterStepPlan,
  height: Float32Array,
  momentumX: Float32Array,
  momentumY: Float32Array,
  dryMask: Float32Array,
  initial: Pick<ShallowWaterDiagnostics, "initialDryCellCount" | "initialMassM3" | "initialMomentumAbsM3ps" | "pressure"> | null
): ShallowWaterDiagnostics {
  let dryCellsWithWater = 0;
  let dryCellCount = 0;
  let massM3 = 0;
  let maxDepthM = 0;
  let minDepthM = Number.POSITIVE_INFINITY;
  let momentumAbsM3ps = 0;
  let negativeDepthCells = 0;
  let wetCellCount = 0;

  for (let index = 0; index < height.length; index += 1) {
    const h = height[index];
    const dry = dryMask[index] > 0.5;
    if (dry) {
      dryCellCount += 1;
      if (Math.abs(h) > 1e-5 || Math.abs(momentumX[index]) > 1e-5 || Math.abs(momentumY[index]) > 1e-5) dryCellsWithWater += 1;
      continue;
    }
    if (h < -1e-6) negativeDepthCells += 1;
    const depth = Math.max(0, h);
    if (depth > 1e-6) wetCellCount += 1;
    massM3 += depth * plan.cellAreaM2;
    maxDepthM = Math.max(maxDepthM, depth);
    minDepthM = Math.min(minDepthM, depth);
    momentumAbsM3ps += Math.hypot(momentumX[index], momentumY[index]) * plan.cellAreaM2;
  }

  const initialMassM3 = initial?.initialMassM3 ?? massM3;
  const initialMomentumAbsM3ps = initial?.initialMomentumAbsM3ps ?? momentumAbsM3ps;
  const pressure = pressureDiagnosticsFor(plan, height, momentumX, momentumY, dryMask, initial?.pressure ?? null, momentumAbsM3ps, initialMomentumAbsM3ps);
  return {
    dryCellsWithWater,
    finalDryCellCount: dryCellCount,
    finalMassM3: massM3,
    finalMomentumAbsM3ps: momentumAbsM3ps,
    initialDryCellCount: initial?.initialDryCellCount ?? dryCellCount,
    initialMassM3,
    initialMomentumAbsM3ps,
    massRelativeDrift: Math.abs(massM3 - initialMassM3) / Math.max(1e-6, initialMassM3),
    maxDepthM,
    minDepthM: Number.isFinite(minDepthM) ? minDepthM : 0,
    momentumDampingRatio: momentumAbsM3ps / Math.max(1e-6, initialMomentumAbsM3ps),
    negativeDepthCells,
    pressure,
    wetCellCount,
  };
}

function pressureDiagnosticsFor(
  plan: ShallowWaterStepPlan,
  height: Float32Array,
  momentumX: Float32Array,
  momentumY: Float32Array,
  dryMask: Float32Array,
  initial: ShallowWaterPressureDiagnostics | null,
  momentumAbsM3ps: number,
  initialMomentumAbsM3ps: number
): ShallowWaterPressureDiagnostics {
  let kineticEnergyJ = 0;
  let maxSurfaceSlope = 0;
  let potentialEnergyJ = 0;
  let slopeLimitedCells = 0;
  let slopeSum = 0;
  let slopeWorkSum = 0;
  let waterVolumeM3 = 0;
  let wetCellCount = 0;

  for (let y = 0; y < plan.cellsY; y += 1) {
    for (let x = 0; x < plan.cellsX; x += 1) {
      const index = y * plan.cellsX + x;
      if (dryMask[index] > 0.5) continue;
      const depth = Math.max(0, height[index]);
      if (depth <= 1e-6) continue;
      const left = wetHeightAt(plan, height, dryMask, Math.max(0, x - 1), y);
      const right = wetHeightAt(plan, height, dryMask, Math.min(plan.cellsX - 1, x + 1), y);
      const down = wetHeightAt(plan, height, dryMask, x, Math.max(0, y - 1));
      const up = wetHeightAt(plan, height, dryMask, x, Math.min(plan.cellsY - 1, y + 1));
      const gradX = (right - left) / (2 * plan.cellSizeM);
      const gradY = (up - down) / (2 * plan.cellSizeM);
      const limitedGradX = clamp(gradX, -plan.slopeLimit, plan.slopeLimit);
      const limitedGradY = clamp(gradY, -plan.slopeLimit, plan.slopeLimit);
      const surfaceSlope = Math.hypot(gradX, gradY);
      const limitedSlope = Math.hypot(limitedGradX, limitedGradY);
      if (Math.abs(gradX) > plan.slopeLimit || Math.abs(gradY) > plan.slopeLimit) slopeLimitedCells += 1;
      maxSurfaceSlope = Math.max(maxSurfaceSlope, surfaceSlope);
      slopeSum += surfaceSlope;
      slopeWorkSum += limitedSlope * depth;
      waterVolumeM3 += depth * plan.cellAreaM2;
      kineticEnergyJ +=
        0.5 *
        waterDensityKgM3 *
        plan.cellAreaM2 *
        ((momentumX[index] * momentumX[index] + momentumY[index] * momentumY[index]) / Math.max(depth, plan.minDepthM));
      potentialEnergyJ += 0.5 * waterDensityKgM3 * plan.gravityMps2 * plan.cellAreaM2 * depth * depth;
      wetCellCount += 1;
    }
  }

  const finalEnergyJ = kineticEnergyJ + potentialEnergyJ;
  const initialEnergyJ = initial?.initialEnergyJ ?? finalEnergyJ;
  const initialKineticEnergyJ = initial?.initialKineticEnergyJ ?? kineticEnergyJ;
  const initialPotentialEnergyJ = initial?.initialPotentialEnergyJ ?? potentialEnergyJ;
  // The seeded ocean is nearly still, so pressure momentum is bounded against a depth-speed budget instead of raw final/initial growth.
  const momentumBudgetM3ps = Math.max(initialMomentumAbsM3ps, waterVolumeM3 * plan.maxMomentumPerDepthMps * 0.1);
  const pressureWorkEstimateJ = plan.pressureGradient
    ? plan.pressureGain * waterDensityKgM3 * plan.gravityMps2 * plan.cellAreaM2 * plan.dtS * plan.steps * slopeWorkSum
    : 0;
  return {
    active: plan.pressureGradient,
    energyRelativeDrift: Math.abs(finalEnergyJ - initialEnergyJ) / Math.max(1e-6, initialEnergyJ),
    finalEnergyJ,
    finalKineticEnergyJ: kineticEnergyJ,
    finalPotentialEnergyJ: potentialEnergyJ,
    initialEnergyJ,
    initialKineticEnergyJ,
    initialPotentialEnergyJ,
    maxSurfaceSlope,
    meanSurfaceSlope: slopeSum / Math.max(1, wetCellCount),
    momentumGrowthRatio: momentumAbsM3ps / Math.max(1e-6, momentumBudgetM3ps),
    pressureGain: plan.pressureGain,
    pressureWorkEstimateJ,
    slopeLimit: plan.slopeLimit,
    slopeLimitedCells,
  };
}

function pressureDiagnosticsPass(
  pressure: ShallowWaterPressureDiagnostics,
  threshold: ShallowWaterBenchmarkThreshold,
  plan: ShallowWaterStepPlan
): boolean {
  if (!plan.pressureGradient) return true;
  return (
    pressure.active &&
    pressure.pressureGain > 0 &&
    pressure.pressureWorkEstimateJ >= threshold.minPressureWorkEstimateJ &&
    pressure.slopeLimitedCells >= threshold.minPressureSlopeLimitedCells &&
    pressure.energyRelativeDrift <= threshold.maxPressureEnergyRelativeDrift &&
    pressure.momentumGrowthRatio <= threshold.maxPressureMomentumGrowthRatio
  );
}

function wetHeightAt(plan: ShallowWaterStepPlan, height: Float32Array, dryMask: Float32Array, x: number, y: number): number {
  const index = y * plan.cellsX + x;
  return dryMask[index] > 0.5 ? 0 : Math.max(0, height[index]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

function browserGpu(): GpuLike | null {
  const maybeNavigator = typeof navigator === "undefined" ? null : (navigator as unknown as { gpu?: GpuLike });
  return maybeNavigator?.gpu ?? null;
}

function storageBinding(binding: number, type: "read-only-storage" | "storage") {
  return { binding, visibility: shaderStageCompute, buffer: { type } };
}

function bindEntries(
  height: BufferLike,
  heightScratch: BufferLike,
  momentumX: BufferLike,
  momentumXScratch: BufferLike,
  momentumY: BufferLike,
  momentumYScratch: BufferLike,
  dryMask: BufferLike,
  uniform: BufferLike
) {
  return [height, heightScratch, momentumX, momentumXScratch, momentumY, momentumYScratch, dryMask, uniform].map((buffer, binding) => ({
    binding,
    resource: { buffer },
  }));
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

function uniformValues(plan: ShallowWaterStepPlan): Float32Array {
  return new Float32Array([
    plan.cellsX,
    plan.cellsY,
    plan.dtS,
    plan.cellSizeM,
    plan.gravityMps2,
    plan.damping,
    plan.minDepthM,
    plan.pressureGain,
    plan.slopeLimit,
    plan.maxMomentumPerDepthMps,
  ]);
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

function summarizeGpuTimestampPairs(values: BigUint64Array): ShallowWaterGpuTiming {
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

function emptyGpuTiming(timestampQueryEnabled: boolean): ShallowWaterGpuTiming {
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

function iterableToStrings(values: Iterable<unknown> | undefined): string[] {
  if (!values) return [];
  return Array.from(values).filter((value): value is string => typeof value === "string" && value.length > 0);
}
