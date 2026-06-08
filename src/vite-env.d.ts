/// <reference types="vite/client" />

import type { FluidCapabilityReport } from "./fluid/webgpuCapability";
import type { runFluidGridBenchmark } from "./fluid/fluidGridGpu";
import type { runParticleSplashBenchmark } from "./fluid/fluidParticleSplash";
import type { runShallowWaterBenchmark } from "./fluid/fluidShallowWater";
import type { FluidFrameLoopStats } from "./fluid/fluidFrameLoop";
import type { FluidWaterRenderStats } from "./fluid/fluidWaterRenderer";

declare global {
  interface Window {
    __fluidGridCapabilityReport?: FluidCapabilityReport;
    __fluidFrameLoopStats?: FluidFrameLoopStats;
    __fluidWaterRenderStats?: FluidWaterRenderStats;
    __runFluidGridBenchmark?: typeof runFluidGridBenchmark;
    __runParticleSplashBenchmark?: typeof runParticleSplashBenchmark;
    __runShallowWaterBenchmark?: typeof runShallowWaterBenchmark;
  }
}
