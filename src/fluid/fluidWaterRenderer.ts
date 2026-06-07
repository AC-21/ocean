import { createFluidGridStepPlan, fluidGridStepShader, type FluidGridStepPlan } from "./fluidGridGpu";
import {
  gridObjectCouplingFor,
  type FluidGridObjectCoupling,
  type FluidGridObjectCouplingBounds,
  type FluidGridObjectCouplingSample,
  type FluidGridObjectCouplingSummary,
} from "./fluidGridCoupling";
import {
  gridSplashCouplingFor,
  nextSplashMemory,
  type FluidGridSplashCoupling,
  type FluidGridSplashMemory,
  type FluidGridSplashSample,
  type FluidGridSplashSummary,
} from "./fluidGridSplash";
import type { FluidGridTierId } from "./fluidGridContract";

export type FluidWaterShape = "box" | "horizontalCylinder" | "sphere" | "verticalCylinder";

export type FluidWaterRenderInput = {
  buoyancyN: number;
  currentSpeedMps: number;
  displacedVolumeM3: number;
  displacedVolumeRateM3ps: number;
  dragForceXN: number;
  dragForceYN: number;
  ejectedWaterKg: number;
  froudeNumber: number;
  gravityMps2: number;
  impactStrength: number;
  massKg: number;
  netForceN: number;
  objectAngleRad: number;
  objectCenterXPx: number;
  objectCenterYPx: number;
  objectDepthM: number;
  objectHalfHeightPx: number;
  objectHalfWidthPx: number;
  objectHeightM: number;
  objectVxMps: number;
  objectVyMps: number;
  objectWidthM: number;
  scalePxPerM: number;
  shape: FluidWaterShape;
  slamForceN: number;
  sprayParticleCount: number;
  sprayReentryCount: number;
  sprayReentryEnergyJ: number;
  sprayReentryMassKg: number;
  splashEnergyJ: number;
  splashHeightM: number;
  submergedFraction: number;
  surfaceTensionNpm: number;
  surfaceYPx: number;
  timeS: number;
  waterDensityKgM3: number;
  waterDepthM: number;
  weberNumber: number;
  waveHeightM: number;
};

export type FluidWaterRenderStats = {
  context: "webgpu";
  frameCount: number;
  gridCellsX: number;
  gridCellsY: number;
  lastCoupling: FluidGridObjectCouplingSummary | null;
  lastSplash: FluidGridSplashSummary | null;
  renderer: "webgpu-grid-primary-v1";
  tier: FluidGridTierId;
};

type GpuLike = {
  getPreferredCanvasFormat?: () => string;
  requestAdapter: (options?: { powerPreference?: "high-performance" | "low-power" }) => Promise<AdapterLike | null>;
};

type AdapterLike = {
  requestDevice: () => Promise<DeviceLike>;
};

type DeviceLike = {
  createBindGroup: (descriptor: unknown) => unknown;
  createBindGroupLayout: (descriptor: unknown) => unknown;
  createBuffer: (descriptor: { size: number; usage: number }) => BufferLike;
  createCommandEncoder: () => CommandEncoderLike;
  createComputePipeline: (descriptor: unknown) => unknown;
  createPipelineLayout: (descriptor: unknown) => unknown;
  createRenderPipeline: (descriptor: unknown) => unknown;
  createShaderModule: (descriptor: { code: string }) => unknown;
  destroy?: () => void;
  queue: {
    submit: (commandBuffers: unknown[]) => void;
    writeBuffer: (buffer: BufferLike, bufferOffset: number, data: Float32Array) => void;
  };
};

type BufferLike = {
  destroy?: () => void;
};

type CanvasContextLike = {
  configure: (descriptor: unknown) => void;
  getCurrentTexture: () => { createView: () => unknown };
};

type CommandEncoderLike = {
  beginComputePass: () => ComputePassLike;
  beginRenderPass: (descriptor: unknown) => RenderPassLike;
  finish: () => unknown;
};

type ComputePassLike = {
  dispatchWorkgroups: (x: number, y: number) => void;
  end: () => void;
  setBindGroup: (index: number, bindGroup: unknown) => void;
  setPipeline: (pipeline: unknown) => void;
};

type RenderPassLike = {
  draw: (vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number) => void;
  end: () => void;
  setBindGroup: (index: number, bindGroup: unknown) => void;
  setPipeline: (pipeline: unknown) => void;
};

const bufferUsage = {
  copyDst: 0x0008,
  copySrc: 0x0004,
  storage: 0x0080,
  uniform: 0x0040,
};
const shaderStage = {
  compute: 0x0004,
  fragment: 0x0002,
  vertex: 0x0001,
};
const textureUsageRenderAttachment = 0x0010;
const bytesPerValue = 4;

export async function createFluidWaterRenderer(canvas: HTMLCanvasElement, tier: FluidGridTierId): Promise<FluidWaterRenderer> {
  const gpu = browserGpu();
  if (!gpu) throw new Error("navigator.gpu is unavailable for WebGPU water rendering.");
  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("WebGPU adapter is unavailable for water rendering.");
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu") as CanvasContextLike | null;
  if (!context) throw new Error("Canvas did not provide a webgpu context.");
  const format = gpu.getPreferredCanvasFormat?.() ?? "bgra8unorm";
  return new FluidWaterRenderer(canvas, context, device, format, tier);
}

export class FluidWaterRenderer {
  private readonly buffers: BufferLike[] = [];
  private readonly computeBindA: unknown;
  private readonly computeBindB: unknown;
  private readonly computePipeline: unknown;
  private readonly baseDepth: Float32Array;
  private readonly baseObstacle: Float32Array;
  private readonly depth: BufferLike;
  private readonly height: BufferLike;
  private readonly heightScratch: BufferLike;
  private readonly foam: BufferLike;
  private readonly impulse: BufferLike;
  private readonly obstacle: BufferLike;
  private readonly plan: FluidGridStepPlan;
  private readonly renderBindA: unknown;
  private readonly renderBindB: unknown;
  private readonly renderPipeline: unknown;
  private readonly renderUniform: BufferLike;
  private readonly stepUniform: BufferLike;
  private destroyed = false;
  private frameCount = 0;
  private lastCoupling: FluidGridObjectCouplingSummary | null = null;
  private lastCouplingBounds: FluidGridObjectCouplingBounds | null = null;
  private lastSplash: FluidGridSplashSummary | null = null;
  private splashMemory: FluidGridSplashMemory = { accumulatedReentryEnergyJ: 0, accumulatedReentryMassKg: 0, peakFoamEnergyJ: 0 };
  private stepIndex = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasContextLike,
    private readonly device: DeviceLike,
    private readonly format: string,
    tier: FluidGridTierId
  ) {
    this.plan = createFluidGridStepPlan({ tier, steps: 1 });
    const seeded = seededRendererFields(this.plan);
    this.height = this.storageBuffer(seeded.height);
    this.heightScratch = this.storageBuffer(seeded.heightScratch);
    const velocity = this.storageBuffer(seeded.velocity);
    this.foam = this.storageBuffer(seeded.foam);
    this.baseObstacle = seeded.obstacle.slice();
    this.baseDepth = seeded.depth.slice();
    this.obstacle = this.storageBuffer(seeded.obstacle);
    this.depth = this.storageBuffer(seeded.depth);
    this.impulse = this.storageBuffer(seeded.impulse);
    this.stepUniform = this.uniformBuffer(stepUniformValues(this.plan));
    this.renderUniform = this.uniformBuffer(new Float32Array(32));

    const computeLayout = this.device.createBindGroupLayout({
      entries: [
        storageBinding(0, "read-only-storage", shaderStage.compute),
        storageBinding(1, "storage", shaderStage.compute),
        storageBinding(2, "storage", shaderStage.compute),
        storageBinding(3, "storage", shaderStage.compute),
        storageBinding(4, "read-only-storage", shaderStage.compute),
        storageBinding(5, "read-only-storage", shaderStage.compute),
        storageBinding(6, "storage", shaderStage.compute),
        { binding: 7, visibility: shaderStage.compute, buffer: { type: "uniform" } },
      ],
    });
    this.computePipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [computeLayout] }),
      compute: {
        module: this.device.createShaderModule({ code: fluidGridStepShader }),
        entryPoint: "main",
      },
    });
    this.computeBindA = this.device.createBindGroup({
      layout: computeLayout,
      entries: bindEntries(this.height, this.heightScratch, velocity, this.foam, this.obstacle, this.depth, this.impulse, this.stepUniform),
    });
    this.computeBindB = this.device.createBindGroup({
      layout: computeLayout,
      entries: bindEntries(this.heightScratch, this.height, velocity, this.foam, this.obstacle, this.depth, this.impulse, this.stepUniform),
    });

    const renderLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: shaderStage.vertex | shaderStage.fragment, buffer: { type: "uniform" } },
        storageBinding(1, "read-only-storage", shaderStage.fragment),
        storageBinding(2, "read-only-storage", shaderStage.fragment),
      ],
    });
    this.renderPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
      vertex: {
        module: this.device.createShaderModule({ code: fluidWaterRenderShader }),
        entryPoint: "vertexMain",
      },
      fragment: {
        module: this.device.createShaderModule({ code: fluidWaterRenderShader }),
        entryPoint: "fragmentMain",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });
    this.renderBindA = this.device.createBindGroup({
      layout: renderLayout,
      entries: [
        { binding: 0, resource: { buffer: this.renderUniform } },
        { binding: 1, resource: { buffer: this.height } },
        { binding: 2, resource: { buffer: this.foam } },
      ],
    });
    this.renderBindB = this.device.createBindGroup({
      layout: renderLayout,
      entries: [
        { binding: 0, resource: { buffer: this.renderUniform } },
        { binding: 1, resource: { buffer: this.heightScratch } },
        { binding: 2, resource: { buffer: this.foam } },
      ],
    });
    this.setCanvasTelemetry("ready");
  }

  render(input: FluidWaterRenderInput): FluidWaterRenderStats {
    if (this.destroyed) throw new Error("Cannot render with a destroyed WebGPU water renderer.");
    const size = resizeCanvas(this.canvas);
    this.context.configure({
      alphaMode: "opaque",
      device: this.device,
      format: this.format,
      usage: textureUsageRenderAttachment,
    });
    this.writeObjectCoupling(input, size);
    this.device.queue.writeBuffer(this.renderUniform, 0, renderUniformValues(input, this.plan, size, this.lastSplash));
    const encoder = this.device.createCommandEncoder();
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.stepIndex % 2 === 0 ? this.computeBindA : this.computeBindB);
    computePass.dispatchWorkgroups(this.plan.dispatchX, this.plan.dispatchY);
    computePass.end();

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          clearValue: { a: 1, b: 0.22, g: 0.28, r: 0.78 },
          loadOp: "clear",
          storeOp: "store",
          view: this.context.getCurrentTexture().createView(),
        },
      ],
    });
    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.stepIndex % 2 === 0 ? this.renderBindB : this.renderBindA);
    renderPass.draw(3, 1, 0, 0);
    renderPass.end();
    this.device.queue.submit([encoder.finish()]);
    this.stepIndex += 1;
    this.frameCount += 1;
    this.setCanvasTelemetry("rendered");
    return this.stats();
  }

  stats(): FluidWaterRenderStats {
    return {
      context: "webgpu",
      frameCount: this.frameCount,
      gridCellsX: this.plan.cellsX,
      gridCellsY: this.plan.cellsY,
      lastCoupling: this.lastCoupling,
      lastSplash: this.lastSplash,
      renderer: "webgpu-grid-primary-v1",
      tier: this.plan.tier,
    };
  }

  destroy() {
    this.destroyed = true;
    for (const buffer of this.buffers) buffer.destroy?.();
    this.device.destroy?.();
  }

  private storageBuffer(values: Float32Array): BufferLike {
    const buffer = this.device.createBuffer({
      size: values.byteLength,
      usage: bufferUsage.storage | bufferUsage.copyDst | bufferUsage.copySrc,
    });
    this.device.queue.writeBuffer(buffer, 0, values);
    this.buffers.push(buffer);
    return buffer;
  }

  private uniformBuffer(values: Float32Array): BufferLike {
    const buffer = this.device.createBuffer({
      size: values.byteLength,
      usage: bufferUsage.uniform | bufferUsage.copyDst,
    });
    this.device.queue.writeBuffer(buffer, 0, values);
    this.buffers.push(buffer);
    return buffer;
  }

  private writeObjectCoupling(input: FluidWaterRenderInput, size: { ratio: number; width: number; height: number }) {
    if (this.lastCouplingBounds) {
      this.restoreBaseRows(this.lastCouplingBounds);
      this.lastCouplingBounds = null;
    }

    const coupling = gridObjectCouplingFor({
      ...input,
      canvasHeightPx: size.height / size.ratio,
      canvasWidthPx: size.width / size.ratio,
      plan: this.plan,
    });
    this.lastCoupling = coupling.summary;
    const splash = gridSplashCouplingFor(
      splashInputFor(input, this.plan),
      coupling.summary,
      coupling.samples,
      this.splashMemory
    );
    this.lastSplash = splash.summary;
    this.splashMemory = nextSplashMemory(this.splashMemory, splash.summary);
    if ((!coupling.summary.active || coupling.samples.length === 0) && (!splash.summary.active || splash.samples.length === 0)) return;

    this.writeCouplingAndSplashRows(coupling, splash);
    this.lastCouplingBounds = coupling.summary.active ? coupling.summary.bounds : null;
  }

  private restoreBaseRows(bounds: FluidGridObjectCouplingBounds) {
    for (let y = bounds.yStart; y <= bounds.yEnd; y += 1) {
      const start = y * this.plan.cellsX + bounds.xStart;
      const end = y * this.plan.cellsX + bounds.xEnd + 1;
      const offset = start * bytesPerValue;
      this.device.queue.writeBuffer(this.depth, offset, this.baseDepth.subarray(start, end));
      this.device.queue.writeBuffer(this.obstacle, offset, this.baseObstacle.subarray(start, end));
    }
  }

  private writeCouplingAndSplashRows(coupling: FluidGridObjectCoupling, splash: FluidGridSplashCoupling) {
    const couplingRows = couplingSamplesByRow(coupling.samples);
    const splashRows = splashSamplesByRow(splash.samples);
    const bounds = unionBounds(coupling.summary.active ? coupling.summary.bounds : null, splash.summary.active ? splash.summary.bounds : null);
    if (!bounds) return;
    const width = bounds.xEnd - bounds.xStart + 1;
    for (let y = bounds.yStart; y <= bounds.yEnd; y += 1) {
      const start = y * this.plan.cellsX + bounds.xStart;
      const end = start + width;
      const offset = start * bytesPerValue;
      const depthRow = new Float32Array(this.baseDepth.subarray(start, end));
      const foamRow = new Float32Array(width);
      const obstacleRow = new Float32Array(this.baseObstacle.subarray(start, end));
      const impulseRow = new Float32Array(width);

      for (const sample of couplingRows.get(y) ?? []) {
        const column = sample.x - bounds.xStart;
        depthRow[column] = Math.min(depthRow[column], this.baseDepth[start + column] * sample.depthScale);
        obstacleRow[column] = Math.max(obstacleRow[column], sample.obstacle);
        impulseRow[column] = Math.max(impulseRow[column], sample.impulseMps);
      }
      for (const sample of splashRows.get(y) ?? []) {
        const column = sample.x - bounds.xStart;
        foamRow[column] = Math.max(foamRow[column], sample.foam);
        impulseRow[column] = Math.max(impulseRow[column], sample.impulseMps);
      }

      this.device.queue.writeBuffer(this.depth, offset, depthRow);
      this.device.queue.writeBuffer(this.foam, offset, foamRow);
      this.device.queue.writeBuffer(this.obstacle, offset, obstacleRow);
      this.device.queue.writeBuffer(this.impulse, offset, impulseRow);
    }
  }

  private setCanvasTelemetry(status: "ready" | "rendered") {
    const coupling = this.lastCoupling;
    const splash = this.lastSplash;
    this.canvas.dataset.waterRenderer = "webgpu-grid-primary-v1";
    this.canvas.dataset.waterContext = "webgpu";
    this.canvas.dataset.waterGrid = `${this.plan.cellsX}x${this.plan.cellsY}`;
    this.canvas.dataset.waterTier = this.plan.tier;
    this.canvas.dataset.waterFrames = String(this.frameCount);
    this.canvas.dataset.waterStatus = status;
    this.canvas.dataset.waterCoupling = coupling?.coupling ?? "object-grid-v1";
    this.canvas.dataset.waterCouplingActive = String(coupling?.active ?? false);
    this.canvas.dataset.waterCouplingCells = String(coupling?.footprintCells ?? 0);
    this.canvas.dataset.waterCouplingForce = String(Math.round(coupling?.forceDeltaN ?? 0));
    this.canvas.dataset.waterCouplingImpulse = String(Number((coupling?.impulseMagnitude ?? 0).toFixed(6)));
    this.canvas.dataset.waterCouplingSamples = String(coupling?.gridSampleCount ?? 0);
    this.canvas.dataset.waterSplash = splash?.coupling ?? "grid-splash-v1";
    this.canvas.dataset.waterSplashActive = String(splash?.active ?? false);
    this.canvas.dataset.waterSplashCrown = String(Number((splash?.crownHeightM ?? 0).toFixed(4)));
    this.canvas.dataset.waterSplashFoamCells = String(splash?.foamCells ?? 0);
    this.canvas.dataset.waterSplashFoamEnergy = String(Number((splash?.foamEnergyJ ?? 0).toFixed(4)));
    this.canvas.dataset.waterSplashGridEnergy = String(Number((splash?.gridEnergyJ ?? 0).toFixed(4)));
    this.canvas.dataset.waterSplashReentryEnergy = String(Number((splash?.accumulatedReentryEnergyJ ?? 0).toFixed(6)));
    this.canvas.dataset.waterSplashSpray = String(splash?.sprayDropletCount ?? 0);
  }
}

function couplingSamplesByRow(samples: FluidGridObjectCouplingSample[]): Map<number, FluidGridObjectCouplingSample[]> {
  const rows = new Map<number, FluidGridObjectCouplingSample[]>();
  for (const sample of samples) {
    const row = rows.get(sample.y);
    if (row) row.push(sample);
    else rows.set(sample.y, [sample]);
  }
  return rows;
}

function splashSamplesByRow(samples: FluidGridSplashSample[]): Map<number, FluidGridSplashSample[]> {
  const rows = new Map<number, FluidGridSplashSample[]>();
  for (const sample of samples) {
    const row = rows.get(sample.y);
    if (row) row.push(sample);
    else rows.set(sample.y, [sample]);
  }
  return rows;
}

function unionBounds(left: FluidGridObjectCouplingBounds | null, right: FluidGridObjectCouplingBounds | null): FluidGridObjectCouplingBounds | null {
  if (!left) return right;
  if (!right) return left;
  return {
    xStart: Math.min(left.xStart, right.xStart),
    xEnd: Math.max(left.xEnd, right.xEnd),
    yStart: Math.min(left.yStart, right.yStart),
    yEnd: Math.max(left.yEnd, right.yEnd),
  };
}

export function legacyCanvasWaterTelemetry(canvas: HTMLCanvasElement, reason: string) {
  canvas.dataset.waterRenderer = "legacy-canvas-diagnostic-v1";
  canvas.dataset.waterContext = "2d";
  canvas.dataset.waterFallbackReason = reason;
  canvas.dataset.waterStatus = "fallback";
}

export const fluidWaterRenderShader = `
struct RenderParams {
  canvas: vec4<f32>,
  object0: vec4<f32>,
  object1: vec4<f32>,
  water0: vec4<f32>,
  grid0: vec4<f32>,
  grid1: vec4<f32>,
  splash0: vec4<f32>,
  splash1: vec4<f32>,
};

@group(0) @binding(0) var<uniform> params: RenderParams;
@group(0) @binding(1) var<storage, read> heightGrid: array<f32>;
@group(0) @binding(2) var<storage, read> foamGrid: array<f32>;

struct VertexOut {
  @builtin(position) position: vec4<f32>,
};

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOut {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );
  var out: VertexOut;
  out.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
  return out;
}

@fragment
fn fragmentMain(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  let width = max(params.canvas.x, 1.0);
  let height = max(params.canvas.y, 1.0);
  let surfaceBase = params.canvas.z;
  let time = params.canvas.w;
  let uv = vec2<f32>(position.x / width, position.y / height);
  let gridWidth = max(u32(params.grid0.x), 1u);
  let gridHeight = max(u32(params.grid0.y), 1u);
  let gridX = min(u32(uv.x * f32(gridWidth)), gridWidth - 1u);
  let gridY = min(u32(0.48 * f32(gridHeight) + sin(uv.x * 9.0 + time) * 5.0), gridHeight - 1u);
  let gridIndex = gridY * gridWidth + gridX;
  let gridHeightM = heightGrid[gridIndex];
  let foam = clamp(foamGrid[gridIndex], 0.0, 1.0);
  let waveHeight = params.water0.x;
  let current = params.water0.y;
  let impact = params.water0.z;
  let surface = surfaceBase -
    gridHeightM * params.grid0.z -
    sin(uv.x * 24.0 + time * (1.4 + current * 0.25)) * waveHeight * params.grid0.z * 0.055 -
    sin(uv.x * 55.0 - time * 1.9) * waveHeight * params.grid0.z * 0.018;
  let sprayColor = sprayAt(position.xy, surface);

  let objectColor = objectAt(position.xy, surface);
  if (objectColor.a > 0.0 && position.y < surface + 8.0) {
    return vec4(mix(objectColor.rgb, sprayColor.rgb, sprayColor.a * 0.38), objectColor.a);
  }

  if (position.y < surface) {
    let sky = mix(vec3<f32>(0.82, 0.91, 0.92), vec3<f32>(0.94, 0.87, 0.72), uv.y);
    let glare = smoothstep(0.17, 0.0, distance(uv, vec2<f32>(0.72, 0.18))) * 0.22;
    return vec4<f32>(mix(sky + glare, sprayColor.rgb, sprayColor.a), 1.0);
  }

  let depth = clamp((position.y - surface) / max(1.0, height - surface), 0.0, 1.0);
  let waveShade = sin(uv.x * 95.0 + gridHeightM * 80.0 + time * 0.9) * 0.035;
  let shallow = vec3<f32>(0.08, 0.48, 0.57);
  let deep = vec3<f32>(0.015, 0.13, 0.19);
  var color = mix(shallow, deep, depth) + waveShade;
  let foamLine = smoothstep(0.018, 0.0, abs(position.y - surface) / height);
  color = mix(color, vec3<f32>(0.82, 0.96, 0.94), clamp(foam * 0.65 + foamLine * 0.28 + impact * foamLine * 0.22, 0.0, 0.8));
  let caustic = sin((uv.x + uv.y) * 90.0 + time * 2.0) * sin(uv.x * 33.0 - time) * 0.025;
  color += caustic * (1.0 - depth);

  if (objectColor.a > 0.0) {
    color = mix(color, objectColor.rgb, objectColor.a * 0.58);
  }
  color = mix(color, sprayColor.rgb, sprayColor.a * 0.52);

  return vec4<f32>(clamp(color, vec3<f32>(0.0), vec3<f32>(1.0)), 1.0);
}

fn sprayAt(pixel: vec2<f32>, surface: f32) -> vec4<f32> {
  let intensity = clamp(params.splash1.x, 0.0, 1.0);
  if (intensity <= 0.001) {
    return vec4<f32>(0.0);
  }
  let center = vec2<f32>(params.splash0.x, surface);
  let radius = max(params.splash0.z, 1.0);
  let crownHeight = max(params.splash0.w, 1.0);
  let age = params.splash1.y;
  let dropletDensity = clamp(params.splash1.z, 0.0, 1.0);
  let reentry = clamp(params.splash1.w, 0.0, 1.0);
  let local = pixel - center;
  let x = abs(local.x) / radius;
  let crownY = -crownHeight * max(0.0, 1.0 - x * x) + sin(x * 18.0 + age * 10.0) * 3.0;
  let crown = smoothstep(1.18, 0.0, x) * smoothstep(18.0, 0.0, abs(local.y - crownY));
  let verticalBand = smoothstep(-crownHeight * 1.28, -4.0, local.y) * (1.0 - smoothstep(12.0, 36.0, local.y));
  let plume = smoothstep(1.34, 0.0, x) * verticalBand;
  let cell = floor((pixel + vec2<f32>(age * 31.0, -age * 46.0)) * 0.085);
  let dropletNoise = hash2(cell);
  let droplet = step(1.0 - dropletDensity * intensity * 0.34, dropletNoise) * plume;
  let reentryMist = reentry * smoothstep(1.15, 0.0, x) * smoothstep(26.0, 0.0, abs(local.y - 4.0));
  let alpha = clamp((crown * 0.78 + plume * 0.16 + droplet * 0.58 + reentryMist * 0.34) * intensity, 0.0, 0.88);
  let color = mix(vec3<f32>(0.76, 0.94, 0.92), vec3<f32>(0.94, 1.0, 0.98), clamp(crown + droplet, 0.0, 1.0));
  return vec4<f32>(color, alpha);
}

fn hash2(cell: vec2<f32>) -> f32 {
  return fract(sin(dot(cell, vec2<f32>(127.1, 311.7))) * 43758.5453123);
}

fn objectAt(pixel: vec2<f32>, surface: f32) -> vec4<f32> {
  let center = params.object0.xy;
  let halfSize = max(params.object0.zw, vec2<f32>(2.0));
  let angle = params.object1.x;
  let shape = params.object1.y;
  let submerged = clamp(params.object1.z, 0.0, 1.0);
  let shifted = pixel - center;
  let c = cos(-angle);
  let s = sin(-angle);
  let local = vec2<f32>(shifted.x * c - shifted.y * s, shifted.x * s + shifted.y * c) / halfSize;
  var inside = false;
  if (shape < 0.5) {
    inside = abs(local.x) <= 1.0 && abs(local.y) <= 1.0;
  } else if (shape < 1.5) {
    inside = local.x * local.x + local.y * local.y <= 1.0;
  } else {
    inside = abs(local.x) <= 0.72 && local.y * local.y <= 1.0;
  }
  if (!inside) {
    return vec4<f32>(0.0);
  }
  let wet = smoothstep(surface - 6.0, surface + 28.0, pixel.y) * submerged;
  let lit = 0.7 + 0.3 * clamp(-local.y + 0.4, 0.0, 1.0);
  let dryColor = vec3<f32>(0.63, 0.58, 0.45) * lit;
  let wetColor = vec3<f32>(0.29, 0.39, 0.37) * lit;
  return vec4<f32>(mix(dryColor, wetColor, wet), 0.96);
}
`;

function browserGpu(): GpuLike | null {
  const maybeNavigator = typeof navigator === "undefined" ? null : (navigator as unknown as { gpu?: GpuLike });
  return maybeNavigator?.gpu ?? null;
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { height, ratio, width };
}

function seededRendererFields(plan: FluidGridStepPlan) {
  const height = new Float32Array(plan.cellCount);
  const heightScratch = new Float32Array(plan.cellCount);
  const velocity = new Float32Array(plan.cellCount);
  const foam = new Float32Array(plan.cellCount);
  const obstacle = new Float32Array(plan.cellCount);
  const depth = new Float32Array(plan.cellCount);
  const impulse = new Float32Array(plan.cellCount);
  const centerX = plan.cellsX * 0.52;
  const centerY = plan.cellsY * 0.48;
  const radius = Math.max(8, Math.min(plan.cellsX, plan.cellsY) * 0.08);

  for (let y = 0; y < plan.cellsY; y += 1) {
    for (let x = 0; x < plan.cellsX; x += 1) {
      const index = y * plan.cellsX + x;
      const edge = x === 0 || y === 0 || x === plan.cellsX - 1 || y === plan.cellsY - 1;
      obstacle[index] = edge ? 1 : 0;
      depth[index] = edge ? 0 : 0.58 + 0.42 * (y / Math.max(1, plan.cellsY - 1));
      const dx = (x - centerX) / radius;
      const dy = (y - centerY) / radius;
      const wake = Math.exp(-(dx * dx + dy * dy));
      const ripple = Math.sin(x * 0.17) * Math.sin(y * 0.09) * 0.006;
      height[index] = wake * 0.026 + ripple;
      impulse[index] = wake * 0.45;
      foam[index] = wake * 0.05;
    }
  }

  return { depth, foam, height, heightScratch, impulse, obstacle, velocity };
}

function stepUniformValues(plan: FluidGridStepPlan): Float32Array {
  return new Float32Array([plan.cellsX, plan.cellsY, plan.dtS, 0.994, plan.waveSpeedMps, plan.cellSizeM, 12, 0.992]);
}

function renderUniformValues(
  input: FluidWaterRenderInput,
  plan: FluidGridStepPlan,
  size: { ratio: number; width: number; height: number },
  splash: FluidGridSplashSummary | null
): Float32Array {
  const ratio = size.ratio;
  const splashIntensity = clamp((splash?.foamInjection ?? 0) * 0.82 + input.impactStrength * 0.34, 0, 1);
  const splashAgeS = splash?.active ? Math.max(0, input.timeS - splash.sampleTimeS) + (1 - input.impactStrength) * 0.55 : 0;
  const splashRadiusPx = Math.max(0, (splash?.crownRadiusM ?? 0) * input.scalePxPerM * ratio);
  const splashHeightPx = Math.max(0, (splash?.crownHeightM ?? 0) * input.scalePxPerM * ratio);
  return new Float32Array([
    size.width,
    size.height,
    input.surfaceYPx * ratio,
    input.timeS,
    input.objectCenterXPx * ratio,
    input.objectCenterYPx * ratio,
    Math.max(2, input.objectHalfWidthPx * ratio),
    Math.max(2, input.objectHalfHeightPx * ratio),
    input.objectAngleRad,
    shapeCode(input.shape),
    input.submergedFraction,
    0,
    input.waveHeightM,
    input.currentSpeedMps,
    input.impactStrength,
    input.waterDepthM,
    plan.cellsX,
    plan.cellsY,
    Math.max(8, 42 * ratio),
    plan.cellSizeM,
    plan.tier === "high" ? 2 : plan.tier === "standard" ? 1 : 0,
    plan.cfl,
    plan.estimatedStorageBytes,
    0,
    input.objectCenterXPx * ratio,
    input.surfaceYPx * ratio,
    splashRadiusPx,
    splashHeightPx,
    splashIntensity,
    splashAgeS,
    clamp((splash?.sprayDropletCount ?? 0) / 280, 0, 1),
    clamp((splash?.accumulatedReentryEnergyJ ?? 0) / 80, 0, 1),
  ]);
}

function splashInputFor(input: FluidWaterRenderInput, plan: FluidGridStepPlan) {
  return {
    currentSpeedMps: input.currentSpeedMps,
    ejectedWaterKg: input.ejectedWaterKg,
    froudeNumber: input.froudeNumber,
    gravityMps2: input.gravityMps2,
    impactStrength: input.impactStrength,
    objectVxMps: input.objectVxMps,
    objectVyMps: input.objectVyMps,
    plan,
    sprayParticleCount: input.sprayParticleCount,
    sprayReentryCount: input.sprayReentryCount,
    sprayReentryEnergyJ: input.sprayReentryEnergyJ,
    sprayReentryMassKg: input.sprayReentryMassKg,
    splashEnergyJ: input.splashEnergyJ,
    splashHeightM: input.splashHeightM,
    surfaceTensionNpm: input.surfaceTensionNpm,
    timeS: input.timeS,
    waterDensityKgM3: input.waterDensityKgM3,
    weberNumber: input.weberNumber,
  };
}

function shapeCode(shape: FluidWaterShape) {
  switch (shape) {
    case "sphere":
      return 1;
    case "horizontalCylinder":
    case "verticalCylinder":
      return 2;
    case "box":
    default:
      return 0;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

function storageBinding(binding: number, type: "read-only-storage" | "storage", visibility: number) {
  return { binding, visibility, buffer: { type } };
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
