/// <reference types="vite/client" />

import type { FluidCapabilityReport } from "./fluid/webgpuCapability";

declare global {
  interface Window {
    __fluidGridCapabilityReport?: FluidCapabilityReport;
  }
}
