import type { FluidSustainedInteractionPacingReport } from "./fluidSustainedInteractionPacing";

export type FluidPackageReproducibilityGate = "G-FG-30";

export type ElectronPackageCacheProof = {
  arch: string;
  cacheDirectory: string | null;
  cacheHit: boolean;
  electronVersion: string;
  platform: "darwin";
  zipFileName: string;
  zipPath: string | null;
};

export type FluidPackageReproducibilityReport = {
  failures: string[];
  gate: FluidPackageReproducibilityGate;
  generatedAt: string;
  package: {
    appBundlePath: string;
    cache: ElectronPackageCacheProof;
    packageScript: "scripts/package_mac.mjs";
    productName: string;
    version: string;
  };
  pass: boolean;
  sustainedInteraction: Pick<FluidSustainedInteractionPacingReport, "gate" | "pass" | "runtime" | "summary" | "workload">;
};

export type FluidPackageReproducibilityOptions = {
  appBundlePath: string;
  cache: ElectronPackageCacheProof;
  generatedAt?: string;
  productName: string;
  sustainedInteraction: FluidSustainedInteractionPacingReport;
  version: string;
};

export function createFluidPackageReproducibilityReport(
  options: FluidPackageReproducibilityOptions
): FluidPackageReproducibilityReport {
  const representativeSamples =
    options.sustainedInteraction.workload.samples ??
    (options.sustainedInteraction.workload as unknown as { representativeSamples?: unknown[] }).representativeSamples ??
    [];
  const failures = [
    ...(options.cache.cacheHit ? [] : ["packaging did not use a local cached Electron zip."]),
    ...(options.cache.zipPath?.endsWith(options.cache.zipFileName) ? [] : ["cached Electron zip path did not match expected file name."]),
    ...(options.sustainedInteraction.gate === "G-FG-29" && options.sustainedInteraction.pass
      ? []
      : ["sustained interaction pacing report must pass after cached local packaging."]),
    ...(options.sustainedInteraction.runtime.selection?.mode === "calibrated-auto"
      ? []
      : [`sustained runtime selection mode was ${options.sustainedInteraction.runtime.selection?.mode ?? "missing"}`]),
    ...(options.sustainedInteraction.runtime.selectedTier === "ultra"
      ? []
      : [`sustained runtime selected tier was ${options.sustainedInteraction.runtime.selectedTier}`]),
    ...(options.sustainedInteraction.runtime.selectedGrid.cellsX === 768 && options.sustainedInteraction.runtime.selectedGrid.cellsY === 432
      ? []
      : [`sustained runtime grid was ${options.sustainedInteraction.runtime.selectedGrid.cellsX} x ${options.sustainedInteraction.runtime.selectedGrid.cellsY}`]),
    ...(options.sustainedInteraction.summary.stability === "smooth"
      ? []
      : [`sustained interaction stability was ${options.sustainedInteraction.summary.stability}`]),
    ...(options.sustainedInteraction.summary.maxDroppedDebtS === 0
      ? []
      : [`sustained interaction accumulated ${options.sustainedInteraction.summary.maxDroppedDebtS} s dropped debt.`]),
    ...(representativeSamples.length > 0 ? [] : ["sustained interaction evidence did not retain representative samples."]),
  ];

  return {
    failures,
    gate: "G-FG-30",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    package: {
      appBundlePath: options.appBundlePath,
      cache: options.cache,
      packageScript: "scripts/package_mac.mjs",
      productName: options.productName,
      version: options.version,
    },
    pass: failures.length === 0,
    sustainedInteraction: {
      gate: options.sustainedInteraction.gate,
      pass: options.sustainedInteraction.pass,
      runtime: options.sustainedInteraction.runtime,
      summary: options.sustainedInteraction.summary,
      workload: options.sustainedInteraction.workload,
    },
  };
}
