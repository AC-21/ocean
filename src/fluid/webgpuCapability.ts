import {
  fluidGridTiers,
  productionFluidCapability,
  type FluidBackendKind,
  type FluidGridTier,
  type FluidGridTierId,
} from "./fluidGridContract";

export type FluidCapabilityStatus = "checking" | "webgpu-ready" | "fallback";

export type FluidCapabilityLimits = {
  maxBufferSize: number | null;
  maxComputeInvocationsPerWorkgroup: number | null;
  maxComputeWorkgroupSizeX: number | null;
  maxComputeWorkgroupSizeY: number | null;
  maxComputeWorkgroupsPerDimension: number | null;
  maxStorageBufferBindingSize: number | null;
};

export type FluidCapabilityGrid = {
  cellsX: number;
  cellsY: number;
  estimatedBytes: number;
  tier: FluidGridTierId;
};

export type FluidCapabilityReport = {
  adapterInfo: string | null;
  adapterName: string | null;
  backend: FluidBackendKind;
  fallbackReason: string | null;
  features: string[];
  forbiddenProductionRenderers: string[];
  generatedAt: string;
  grid: FluidCapabilityGrid;
  limits: FluidCapabilityLimits;
  requiredBrowserApis: string[];
  selectedTier: FluidGridTierId;
  status: FluidCapabilityStatus;
};

export type FluidCapabilityProvenance = {
  adapterInfo: string | null;
  backend: FluidBackendKind;
  features: string[];
  fingerprint: string;
  limits: FluidCapabilityLimits;
  status: FluidCapabilityStatus;
};

export type WebGpuDeviceLike = {
  features?: Iterable<string>;
  limits?: Partial<Record<keyof FluidCapabilityLimits, number>>;
  destroy?: () => void;
};

export type WebGpuAdapterLike = {
  features?: Iterable<string>;
  info?: Record<string, unknown>;
  limits?: Partial<Record<keyof FluidCapabilityLimits, number>>;
  requestAdapterInfo?: () => Promise<Record<string, unknown>>;
  requestDevice: () => Promise<WebGpuDeviceLike>;
};

export type WebGpuLike = {
  requestAdapter: (options?: { powerPreference?: "high-performance" | "low-power" }) => Promise<WebGpuAdapterLike | null>;
};

export type DetectFluidCapabilityOptions = {
  generatedAt?: string;
  gpu?: WebGpuLike | null;
  memoryBudgetBytes?: number;
  preferredTier?: FluidGridTierId;
};

const gridBufferCount = 8;
const bytesPerGridValue = 4;
const defaultMemoryBudgetBytes = 128 * 1024 * 1024;
const limitKeys: Array<keyof FluidCapabilityLimits> = [
  "maxBufferSize",
  "maxComputeInvocationsPerWorkgroup",
  "maxComputeWorkgroupSizeX",
  "maxComputeWorkgroupSizeY",
  "maxComputeWorkgroupsPerDimension",
  "maxStorageBufferBindingSize",
];

export function pendingFluidCapabilityReport(generatedAt = new Date().toISOString()): FluidCapabilityReport {
  return fallbackFluidCapabilityReport("WebGPU capability probe has not finished.", generatedAt, "checking");
}

export async function detectFluidCapability(options: DetectFluidCapabilityOptions = {}): Promise<FluidCapabilityReport> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const gpu = options.gpu ?? browserGpu();

  if (!gpu) {
    return fallbackFluidCapabilityReport("navigator.gpu is unavailable in this runtime.", generatedAt);
  }

  try {
    const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) {
      return fallbackFluidCapabilityReport("WebGPU did not return an adapter.", generatedAt);
    }

    const device = await adapter.requestDevice();
    const limits = normalizedLimits(device.limits ?? adapter.limits);
    const selectedTier = selectFluidGridTier(limits, options.preferredTier ?? "high", options.memoryBudgetBytes);
    const grid = gridForTier(selectedTier);
    const adapterInfo = await adapterInfoText(adapter);
    const features = uniqueStrings([...(iterableToStrings(adapter.features)), ...(iterableToStrings(device.features))]).sort();
    device.destroy?.();

    return {
      adapterInfo,
      adapterName: adapterInfo,
      backend: "webgpu-compute",
      fallbackReason: null,
      features,
      forbiddenProductionRenderers: productionFluidCapability.forbiddenProductionRenderers,
      generatedAt,
      grid,
      limits,
      requiredBrowserApis: productionFluidCapability.requiredBrowserApis,
      selectedTier,
      status: "webgpu-ready",
    };
  } catch (error) {
    return fallbackFluidCapabilityReport(`WebGPU device creation failed: ${errorMessage(error)}`, generatedAt);
  }
}

export function selectFluidGridTier(
  limits: FluidCapabilityLimits,
  preferredTier: FluidGridTierId = "high",
  memoryBudgetBytes = defaultMemoryBudgetBytes
): FluidGridTierId {
  const preferredIndex = fluidGridTiers.findIndex((tier) => tier.id === preferredTier);
  const maxIndex = preferredIndex >= 0 ? preferredIndex : fluidGridTiers.length - 1;
  for (let index = maxIndex; index >= 0; index -= 1) {
    const tier = fluidGridTiers[index];
    if (tierFitsLimits(tier, limits, memoryBudgetBytes)) return tier.id;
  }
  return "low";
}

export function estimateFluidGridBytes(tier: Pick<FluidGridTier, "cellsX" | "cellsY">): number {
  return tier.cellsX * tier.cellsY * gridBufferCount * bytesPerGridValue;
}

export function gridForTier(tierId: FluidGridTierId): FluidCapabilityGrid {
  const tier = fluidGridTiers.find((candidate) => candidate.id === tierId) ?? fluidGridTiers[0];
  return {
    cellsX: tier.cellsX,
    cellsY: tier.cellsY,
    estimatedBytes: estimateFluidGridBytes(tier),
    tier: tier.id,
  };
}

export function capabilityProvenanceForReport(report: FluidCapabilityReport): FluidCapabilityProvenance {
  const provenance = {
    adapterInfo: report.adapterInfo,
    backend: report.backend,
    features: uniqueStrings(report.features).sort(),
    fingerprint: "",
    limits: { ...report.limits },
    status: report.status,
  };
  return {
    ...provenance,
    fingerprint: fluidCapabilityFingerprintForProvenance(provenance),
  };
}

export function fluidCapabilityFingerprintForReport(report: FluidCapabilityReport): string {
  return capabilityProvenanceForReport(report).fingerprint;
}

export function fluidCapabilityFingerprintForProvenance(
  provenance: Omit<FluidCapabilityProvenance, "fingerprint"> | FluidCapabilityProvenance
): string {
  const adapterInfo = provenance.adapterInfo ?? "";
  const features = uniqueStrings(provenance.features).sort().join(",");
  const limits = limitKeys.map((key) => `${key}:${provenance.limits[key] ?? "null"}`).join(",");
  return [`adapter:${adapterInfo}`, `backend:${provenance.backend}`, `features:${features}`, `limits:${limits}`, `status:${provenance.status}`].join("|");
}

export function fluidCapabilityReportForPreferredTier(
  report: FluidCapabilityReport,
  preferredTier: FluidGridTierId
): FluidCapabilityReport {
  if (report.status !== "webgpu-ready") return report;
  const selectedTier = selectFluidGridTier(report.limits, preferredTier);
  return {
    ...report,
    grid: gridForTier(selectedTier),
    selectedTier,
  };
}

export function fallbackFluidCapabilityReport(
  fallbackReason: string,
  generatedAt = new Date().toISOString(),
  status: FluidCapabilityStatus = "fallback"
): FluidCapabilityReport {
  const selectedTier = "low";
  return {
    adapterInfo: null,
    adapterName: null,
    backend: "cpu-deterministic-test",
    fallbackReason,
    features: [],
    forbiddenProductionRenderers: productionFluidCapability.forbiddenProductionRenderers,
    generatedAt,
    grid: gridForTier(selectedTier),
    limits: normalizedLimits(null),
    requiredBrowserApis: productionFluidCapability.requiredBrowserApis,
    selectedTier,
    status,
  };
}

function tierFitsLimits(tier: FluidGridTier, limits: FluidCapabilityLimits, memoryBudgetBytes: number): boolean {
  const perBufferBytes = tier.cellsX * tier.cellsY * bytesPerGridValue;
  const totalBytes = estimateFluidGridBytes(tier);
  const storageLimit = limits.maxStorageBufferBindingSize ?? limits.maxBufferSize ?? 0;
  const bufferLimit = limits.maxBufferSize ?? storageLimit;
  if (storageLimit > 0 && perBufferBytes > storageLimit) return false;
  if (bufferLimit > 0 && perBufferBytes > bufferLimit) return false;
  if (totalBytes > memoryBudgetBytes) return false;
  const workgroupLimit = limits.maxComputeInvocationsPerWorkgroup ?? 0;
  return workgroupLimit === 0 || workgroupLimit >= 64;
}

function browserGpu(): WebGpuLike | null {
  const maybeNavigator = typeof navigator === "undefined" ? null : (navigator as { gpu?: WebGpuLike });
  return maybeNavigator?.gpu ?? null;
}

function normalizedLimits(raw: Partial<Record<keyof FluidCapabilityLimits, number>> | null | undefined): FluidCapabilityLimits {
  const limits = {} as FluidCapabilityLimits;
  for (const key of limitKeys) {
    const value = raw?.[key];
    limits[key] = typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  return limits;
}

async function adapterInfoText(adapter: WebGpuAdapterLike): Promise<string | null> {
  const info = adapter.info ?? (adapter.requestAdapterInfo ? await adapter.requestAdapterInfo().catch(() => null) : null);
  if (!info) return null;
  const parts = ["vendor", "architecture", "device", "description"]
    .map((key) => info[key])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return parts.length > 0 ? parts.join(" / ") : null;
}

function iterableToStrings(values: Iterable<unknown> | undefined): string[] {
  if (!values) return [];
  return Array.from(values)
    .filter((value): value is string => typeof value === "string")
    .filter((value) => value.length > 0);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
