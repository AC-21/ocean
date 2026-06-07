import { gridForTier, type FluidCapabilityReport } from "./webgpuCapability";
import type { FluidGridTierId } from "./fluidGridContract";

export type FluidGridBufferRole = "height" | "heightScratch" | "velocity" | "foam" | "obstacle" | "depth" | "impulse";

export type FluidGridStepPlan = {
  bytesPerField: number;
  bufferRoles: FluidGridBufferRole[];
  cellCount: number;
  cellSizeM: number;
  cellsX: number;
  cellsY: number;
  cfl: number;
  dispatchX: number;
  dispatchY: number;
  dtS: number;
  estimatedStorageBytes: number;
  steps: number;
  tier: FluidGridTierId;
  waveSpeedMps: number;
  workgroupSizeX: number;
  workgroupSizeY: number;
};

export type FluidGridBenchmarkReport = {
  backend: "webgpu-compute";
  capability: Pick<FluidCapabilityReport, "adapterName" | "features" | "limits" | "status"> | null;
  generatedAt: string;
  noFullGridReadbackPerFrame: boolean;
  pass: boolean;
  plan: FluidGridStepPlan;
  readback: {
    maxAbsFoam: number;
    maxAbsHeightM: number;
    maxAbsVelocityMps: number;
    meanAbsHeightM: number;
    sampledAfterSteps: number;
  };
  stepTiming: {
    averageStepMs: number;
    totalMs: number;
  };
  threshold: {
    maxAverageStepMs: number;
    maxCfl: number;
    minNonzeroHeightM: number;
  };
};

export type FluidGridBenchmarkOptions = {
  capability?: FluidCapabilityReport | null;
  cellSizeM?: number;
  generatedAt?: string;
  maxAverageStepMs?: number;
  maxCfl?: number;
  minNonzeroHeightM?: number;
  steps?: number;
  tier?: FluidGridTierId;
  waveSpeedMps?: number;
};

type GpuLike = {
  requestAdapter: (options?: { powerPreference?: "high-performance" | "low-power" }) => Promise<AdapterLike | null>;
};

type AdapterLike = {
  requestDevice: () => Promise<DeviceLike>;
};

type DeviceLike = {
  createBindGroup: (descriptor: unknown) => unknown;
  createBindGroupLayout: (descriptor: unknown) => unknown;
  createBuffer: (descriptor: { mappedAtCreation?: boolean; size: number; usage: number }) => BufferLike;
  createCommandEncoder: () => CommandEncoderLike;
  createComputePipeline: (descriptor: unknown) => unknown;
  createPipelineLayout: (descriptor: unknown) => unknown;
  createShaderModule: (descriptor: { code: string }) => unknown;
  destroy?: () => void;
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

type CommandEncoderLike = {
  beginComputePass: () => ComputePassLike;
  copyBufferToBuffer: (source: BufferLike, sourceOffset: number, destination: BufferLike, destinationOffset: number, size: number) => void;
  finish: () => unknown;
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
  storage: 0x0080,
  uniform: 0x0040,
};
const mapModeRead = 0x0001;
const shaderStageCompute = 0x0004;
const bytesPerValue = 4;
const workgroupSizeX = 8;
const workgroupSizeY = 8;
const defaultCellSizeM = 0.05;
const defaultWaveSpeedMps = 2.4;
const defaultDtS = 1 / 120;

export const fluidGridBufferRoles: FluidGridBufferRole[] = ["height", "heightScratch", "velocity", "foam", "obstacle", "depth", "impulse"];

export function createFluidGridStepPlan(options: FluidGridBenchmarkOptions = {}): FluidGridStepPlan {
  const tier = options.tier ?? "standard";
  const grid = gridForTier(tier);
  const cellCount = grid.cellsX * grid.cellsY;
  const cellSizeM = options.cellSizeM ?? defaultCellSizeM;
  const waveSpeedMps = options.waveSpeedMps ?? defaultWaveSpeedMps;
  const dtS = defaultDtS;
  const cfl = waveSpeedMps * dtS * Math.SQRT2 / cellSizeM;
  const bytesPerField = cellCount * bytesPerValue;
  return {
    bytesPerField,
    bufferRoles: fluidGridBufferRoles,
    cellCount,
    cellSizeM,
    cellsX: grid.cellsX,
    cellsY: grid.cellsY,
    cfl,
    dispatchX: Math.ceil(grid.cellsX / workgroupSizeX),
    dispatchY: Math.ceil(grid.cellsY / workgroupSizeY),
    dtS,
    estimatedStorageBytes: bytesPerField * fluidGridBufferRoles.length,
    steps: options.steps ?? 120,
    tier,
    waveSpeedMps,
    workgroupSizeX,
    workgroupSizeY,
  };
}

export async function runFluidGridBenchmark(options: FluidGridBenchmarkOptions = {}): Promise<FluidGridBenchmarkReport> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const gpu = browserGpu();
  if (!gpu) {
    throw new Error("navigator.gpu is unavailable; run npm run fluid:capability before GPU grid benchmarking.");
  }
  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("WebGPU adapter is unavailable for fluid grid benchmark.");

  const device = await adapter.requestDevice();
  const plan = createFluidGridStepPlan(options);
  const threshold = {
    maxAverageStepMs: options.maxAverageStepMs ?? 4,
    maxCfl: options.maxCfl ?? 0.7,
    minNonzeroHeightM: options.minNonzeroHeightM ?? 0.0001,
  };
  const buffers: BufferLike[] = [];

  try {
    const initial = seededGridFields(plan);
    const height = storageBuffer(device, initial.height, buffers);
    const heightScratch = storageBuffer(device, initial.heightScratch, buffers);
    const velocity = storageBuffer(device, initial.velocity, buffers);
    const foam = storageBuffer(device, initial.foam, buffers);
    const obstacle = storageBuffer(device, initial.obstacle, buffers);
    const depth = storageBuffer(device, initial.depth, buffers);
    const impulse = storageBuffer(device, initial.impulse, buffers);
    const uniform = uniformBuffer(device, uniformValues(plan), buffers);
    const readHeight = readBuffer(device, plan.bytesPerField, buffers);
    const readVelocity = readBuffer(device, plan.bytesPerField, buffers);
    const readFoam = readBuffer(device, plan.bytesPerField, buffers);

    const shader = device.createShaderModule({ code: fluidGridStepShader });
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        storageBinding(0, "read-only-storage"),
        storageBinding(1, "storage"),
        storageBinding(2, "storage"),
        storageBinding(3, "storage"),
        storageBinding(4, "read-only-storage"),
        storageBinding(5, "read-only-storage"),
        storageBinding(6, "storage"),
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
      entries: bindEntries(height, heightScratch, velocity, foam, obstacle, depth, impulse, uniform),
    });
    const bindB = device.createBindGroup({
      layout: bindGroupLayout,
      entries: bindEntries(heightScratch, height, velocity, foam, obstacle, depth, impulse, uniform),
    });

    const encoder = device.createCommandEncoder();
    for (let step = 0; step < plan.steps; step += 1) {
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, step % 2 === 0 ? bindA : bindB);
      pass.dispatchWorkgroups(plan.dispatchX, plan.dispatchY);
      pass.end();
    }
    const finalHeight = plan.steps % 2 === 0 ? height : heightScratch;
    encoder.copyBufferToBuffer(finalHeight, 0, readHeight, 0, plan.bytesPerField);
    encoder.copyBufferToBuffer(velocity, 0, readVelocity, 0, plan.bytesPerField);
    encoder.copyBufferToBuffer(foam, 0, readFoam, 0, plan.bytesPerField);

    const startedAt = performance.now();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    const totalMs = performance.now() - startedAt;
    const [heightValues, velocityValues, foamValues] = await Promise.all([
      mappedFloat32(readHeight, plan.cellCount),
      mappedFloat32(readVelocity, plan.cellCount),
      mappedFloat32(readFoam, plan.cellCount),
    ]);
    const summary = summarizeReadback(heightValues, velocityValues, foamValues);
    const averageStepMs = totalMs / Math.max(1, plan.steps);
    const pass = averageStepMs <= threshold.maxAverageStepMs && plan.cfl <= threshold.maxCfl && summary.maxAbsHeightM >= threshold.minNonzeroHeightM;

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
      generatedAt,
      noFullGridReadbackPerFrame: true,
      pass,
      plan,
      readback: {
        ...summary,
        sampledAfterSteps: plan.steps,
      },
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

export const fluidGridStepShader = `
struct Params {
  width: f32,
  height: f32,
  dt: f32,
  damping: f32,
  waveSpeed: f32,
  cellSize: f32,
  impulseGain: f32,
  foamDecay: f32,
};

@group(0) @binding(0) var<storage, read> heightIn: array<f32>;
@group(0) @binding(1) var<storage, read_write> heightOut: array<f32>;
@group(0) @binding(2) var<storage, read_write> velocity: array<f32>;
@group(0) @binding(3) var<storage, read_write> foam: array<f32>;
@group(0) @binding(4) var<storage, read> obstacle: array<f32>;
@group(0) @binding(5) var<storage, read> depth: array<f32>;
@group(0) @binding(6) var<storage, read_write> impulse: array<f32>;
@group(0) @binding(7) var<uniform> params: Params;

@compute @workgroup_size(${workgroupSizeX}, ${workgroupSizeY}, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let width = u32(params.width);
  let height = u32(params.height);
  if (id.x >= width || id.y >= height) {
    return;
  }

  let index = id.y * width + id.x;
  let blocked = obstacle[index] > 0.5;
  if (blocked) {
    heightOut[index] = 0.0;
    velocity[index] = 0.0;
    foam[index] = 0.0;
    impulse[index] = 0.0;
    return;
  }

  let center = heightIn[index];
  let left = heightIn[id.y * width + max(id.x, 1u) - 1u];
  let right = heightIn[id.y * width + min(id.x + 1u, width - 1u)];
  let down = heightIn[(max(id.y, 1u) - 1u) * width + id.x];
  let up = heightIn[min(id.y + 1u, height - 1u) * width + id.x];
  let localDepth = clamp(depth[index], 0.05, 1.0);
  let localSpeed = params.waveSpeed * sqrt(localDepth);
  let laplacian = (left + right + up + down - 4.0 * center) / max(0.0001, params.cellSize * params.cellSize);
  let kicked = impulse[index] * params.impulseGain;
  let nextVelocity = (velocity[index] + (localSpeed * localSpeed * laplacian + kicked) * params.dt) * params.damping;
  let nextHeight = center + nextVelocity * params.dt;
  heightOut[index] = nextHeight;
  velocity[index] = nextVelocity;
  foam[index] = max(foam[index] * params.foamDecay, abs(kicked) * 0.015);
  impulse[index] = 0.0;
}
`;

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
  velocity: BufferLike,
  foam: BufferLike,
  obstacle: BufferLike,
  depth: BufferLike,
  impulse: BufferLike,
  uniform: BufferLike
) {
  return [height, heightScratch, velocity, foam, obstacle, depth, impulse, uniform].map((buffer, binding) => ({
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

function uniformValues(plan: FluidGridStepPlan): Float32Array {
  return new Float32Array([plan.cellsX, plan.cellsY, plan.dtS, 0.992, plan.waveSpeedMps, plan.cellSizeM, 18, 0.988]);
}

function seededGridFields(plan: FluidGridStepPlan) {
  const height = new Float32Array(plan.cellCount);
  const heightScratch = new Float32Array(plan.cellCount);
  const velocity = new Float32Array(plan.cellCount);
  const foam = new Float32Array(plan.cellCount);
  const obstacle = new Float32Array(plan.cellCount);
  const depth = new Float32Array(plan.cellCount);
  const impulse = new Float32Array(plan.cellCount);
  const centerX = plan.cellsX * 0.5;
  const centerY = plan.cellsY * 0.48;
  const radius = Math.max(6, Math.min(plan.cellsX, plan.cellsY) * 0.055);

  for (let y = 0; y < plan.cellsY; y += 1) {
    for (let x = 0; x < plan.cellsX; x += 1) {
      const index = y * plan.cellsX + x;
      const edge = x === 0 || y === 0 || x === plan.cellsX - 1 || y === plan.cellsY - 1;
      obstacle[index] = edge ? 1 : 0;
      depth[index] = edge ? 0 : 0.62 + 0.38 * (y / Math.max(1, plan.cellsY - 1));
      const dx = (x - centerX) / radius;
      const dy = (y - centerY) / radius;
      const gaussian = Math.exp(-(dx * dx + dy * dy));
      height[index] = 0.025 * gaussian;
      impulse[index] = 0.8 * gaussian;
    }
  }

  return { depth, foam, height, heightScratch, impulse, obstacle, velocity };
}

async function mappedFloat32(buffer: BufferLike, length: number): Promise<Float32Array> {
  await buffer.mapAsync(mapModeRead);
  const copy = new Float32Array(buffer.getMappedRange()).slice(0, length);
  buffer.unmap();
  return copy;
}

function summarizeReadback(height: Float32Array, velocity: Float32Array, foam: Float32Array) {
  let maxAbsHeightM = 0;
  let maxAbsVelocityMps = 0;
  let maxAbsFoam = 0;
  let totalAbsHeight = 0;
  for (let index = 0; index < height.length; index += 1) {
    const absHeight = Math.abs(height[index]);
    totalAbsHeight += absHeight;
    maxAbsHeightM = Math.max(maxAbsHeightM, absHeight);
    maxAbsVelocityMps = Math.max(maxAbsVelocityMps, Math.abs(velocity[index]));
    maxAbsFoam = Math.max(maxAbsFoam, Math.abs(foam[index]));
  }
  return {
    maxAbsFoam,
    maxAbsHeightM,
    maxAbsVelocityMps,
    meanAbsHeightM: totalAbsHeight / Math.max(1, height.length),
  };
}
