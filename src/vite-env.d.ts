/// <reference types="vite/client" />

import type { FluidCapabilityReport } from "./fluid/webgpuCapability";
import type { runFluidGridBenchmark } from "./fluid/fluidGridGpu";
import type { runParticleSplashBenchmark } from "./fluid/fluidParticleSplash";
import type { runShallowWaterBenchmark } from "./fluid/fluidShallowWater";
import type { FluidFrameLoopStats } from "./fluid/fluidFrameLoop";
import type { FluidWaterRenderStats } from "./fluid/fluidWaterRenderer";
import type { FluidGridTierId } from "./fluid/fluidGridContract";
import type { OceanPhysicsLiveSnapshot, OceanPhysicsScenarioControls } from "./OceanPhysicsApp";
import type { GridFluidCouplingForces } from "./physicsOcean";

declare global {
  interface Window {
    __fluidGridCapabilityReport?: FluidCapabilityReport;
    __fluidGridCouplingForces?: GridFluidCouplingForces;
    __fluidGridPreferredTier?: FluidGridTierId | "auto";
    __fluidFrameLoopStats?: FluidFrameLoopStats;
    __fluidWaterRenderStats?: FluidWaterRenderStats;
    __displayPacingObserved?: {
      couplingActiveSeen: boolean;
      longTaskSupported: boolean;
      particlesActiveSeen: boolean;
      pressureActiveSeen: boolean;
    };
    __oceanPhysicsScenarioControls?: OceanPhysicsScenarioControls;
    __oceanPhysicsSnapshot?: OceanPhysicsLiveSnapshot;
    __runFluidGridBenchmark?: typeof runFluidGridBenchmark;
    __runParticleSplashBenchmark?: typeof runParticleSplashBenchmark;
    __runShallowWaterBenchmark?: typeof runShallowWaterBenchmark;
  }
}
