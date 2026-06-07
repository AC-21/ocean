import { detectFluidCapability, fallbackFluidCapabilityReport, type FluidCapabilityReport } from "./webgpuCapability";
import type { FluidBackendKind } from "./fluidGridContract";

export type FluidBackendRole = "production" | "reference" | "diagnostic";

export type FluidBackend = {
  compute: boolean;
  kind: FluidBackendKind;
  role: FluidBackendRole;
  describe: () => string;
  capabilityReport: () => Promise<FluidCapabilityReport>;
};

export const webGpuFluidBackend: FluidBackend = {
  compute: true,
  kind: "webgpu-compute",
  role: "production",
  describe: () => "WebGPU compute backend for grid-owned water simulation.",
  capabilityReport: () => detectFluidCapability(),
};

export const deterministicCpuFluidBackend: FluidBackend = {
  compute: false,
  kind: "cpu-deterministic-test",
  role: "reference",
  describe: () => "Deterministic CPU backend for tests, calibration fixtures, and unsupported runtimes.",
  capabilityReport: async () => fallbackFluidCapabilityReport("CPU reference backend selected explicitly."),
};

export const legacyCanvasDiagnosticBackend: FluidBackend = {
  compute: false,
  kind: "legacy-canvas-diagnostic",
  role: "diagnostic",
  describe: () => "Legacy Canvas 2D diagnostics only; not a production fluid backend.",
  capabilityReport: async () => fallbackFluidCapabilityReport("Legacy Canvas 2D is diagnostic-only and cannot close production fluid gates."),
};

export function backendForCapability(report: FluidCapabilityReport): FluidBackend {
  if (report.status === "webgpu-ready") return webGpuFluidBackend;
  return deterministicCpuFluidBackend;
}
