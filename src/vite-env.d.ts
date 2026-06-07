/// <reference types="vite/client" />

import type { FluidCapabilityReport } from "./fluid/webgpuCapability";
import type { runFluidGridBenchmark } from "./fluid/fluidGridGpu";

declare global {
  interface Window {
    __fluidGridCapabilityReport?: FluidCapabilityReport;
    __runFluidGridBenchmark?: typeof runFluidGridBenchmark;
  }
}
