/// <reference types="vite/client" />

import type { FluidCapabilityReport } from "./fluid/webgpuCapability";
import type { runFluidGridBenchmark } from "./fluid/fluidGridGpu";
import type { FluidWaterRenderStats } from "./fluid/fluidWaterRenderer";

declare global {
  interface Window {
    __fluidGridCapabilityReport?: FluidCapabilityReport;
    __fluidWaterRenderStats?: FluidWaterRenderStats;
    __runFluidGridBenchmark?: typeof runFluidGridBenchmark;
  }
}
