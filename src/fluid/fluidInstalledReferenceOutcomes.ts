import type { FluidReferenceOutcomeCategory, FluidUltraReferenceOutcomesReport } from "./fluidUltraReferenceOutcomes";

export type FluidInstalledReferenceOutcomesGate = "G-FG-36";

export type FluidInstalledReferenceRuntimeSelection = {
  capabilitySelectedTier: string | null;
  grid: string | null;
  renderer: string | null;
  selectedGrid: {
    cellsX: number;
    cellsY: number;
  };
  selectedTier: string | null;
  selection: {
    calibratedTier?: string;
    mode?: string;
    preferredTier?: string;
    requestedTier?: string;
  } | null;
  waterContext: string | null;
};

export type FluidInstalledReferenceOutcomesReport = {
  coreReference: FluidUltraReferenceOutcomesReport;
  defaultProfileEvidence: {
    gate: string;
    grid: string | null;
    mode: string | null;
    pass: boolean;
    selectedTier: string | null;
    sourcePath: string;
  };
  failures: string[];
  gate: FluidInstalledReferenceOutcomesGate;
  generatedAt: string;
  launchEnv: {
    envCalibratedTierPresent: boolean;
    envRequestedTierPresent: boolean;
    envUserDataOverridePresent: boolean;
  };
  launcher: {
    executablePath: string;
    path: string;
    resolvesToInstalledBundle: boolean;
    targetPath: string | null;
  };
  pass: boolean;
  runtimeSelection: FluidInstalledReferenceRuntimeSelection;
  summary: {
    caseCount: number;
    categories: string[];
    comparisonCount: number;
    grid: string;
    mode: string | null;
    selectedTier: string | null;
  };
};

export type FluidInstalledReferenceOutcomesOptions = Omit<
  FluidInstalledReferenceOutcomesReport,
  "failures" | "gate" | "generatedAt" | "pass" | "summary"
> & {
  generatedAt?: string;
};

const requiredCategories: FluidReferenceOutcomeCategory[] = ["damping", "drop", "float", "sink", "splash"];

export function createFluidInstalledReferenceOutcomesReport(
  options: FluidInstalledReferenceOutcomesOptions
): FluidInstalledReferenceOutcomesReport {
  const categories = Array.from(new Set(options.coreReference.summary.categories)).sort();
  const concreteDropCase = options.coreReference.cases.find((entry) => entry.id === "live-concrete-drop-splash-pressure");
  const failures = [
    ...(options.defaultProfileEvidence.gate === "G-FG-34"
      ? []
      : [`default profile evidence gate was ${options.defaultProfileEvidence.gate}`]),
    ...(options.defaultProfileEvidence.pass ? [] : ["default profile calibration evidence did not pass"]),
    ...(options.defaultProfileEvidence.mode === "calibrated-auto"
      ? []
      : [`default profile mode was ${options.defaultProfileEvidence.mode ?? "missing"}`]),
    ...(options.defaultProfileEvidence.selectedTier === "ultra"
      ? []
      : [`default profile selected tier was ${options.defaultProfileEvidence.selectedTier ?? "missing"}`]),
    ...(options.defaultProfileEvidence.grid === "768x432"
      ? []
      : [`default profile grid was ${options.defaultProfileEvidence.grid ?? "missing"}`]),
    ...(options.launcher.resolvesToInstalledBundle ? [] : ["Desktop launcher does not resolve to the installed app bundle"]),
    ...(options.launcher.executablePath.includes("/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab")
      ? []
      : [`launcher executable was ${options.launcher.executablePath}`]),
    ...(options.launchEnv.envCalibratedTierPresent ? ["OCEAN_LAB_CALIBRATED_FLUID_TIER must be absent"] : []),
    ...(options.launchEnv.envRequestedTierPresent ? ["OCEAN_LAB_FLUID_TIER must be absent"] : []),
    ...(options.launchEnv.envUserDataOverridePresent ? ["HARBORLINE_USER_DATA_DIR must be absent"] : []),
    ...(options.runtimeSelection.selection?.mode === "calibrated-auto"
      ? []
      : [`runtime selection mode was ${options.runtimeSelection.selection?.mode ?? "missing"}`]),
    ...(options.runtimeSelection.selection?.requestedTier === "auto"
      ? []
      : [`runtime requested tier was ${options.runtimeSelection.selection?.requestedTier ?? "missing"}`]),
    ...(options.runtimeSelection.selection?.calibratedTier === "ultra"
      ? []
      : [`runtime calibrated tier was ${options.runtimeSelection.selection?.calibratedTier ?? "missing"}`]),
    ...(options.runtimeSelection.selection?.preferredTier === "ultra"
      ? []
      : [`runtime preferred tier was ${options.runtimeSelection.selection?.preferredTier ?? "missing"}`]),
    ...(options.runtimeSelection.selectedTier === "ultra"
      ? []
      : [`runtime selected tier was ${options.runtimeSelection.selectedTier ?? "missing"}`]),
    ...(options.runtimeSelection.capabilitySelectedTier === "ultra"
      ? []
      : [`capability selected tier was ${options.runtimeSelection.capabilitySelectedTier ?? "missing"}`]),
    ...(options.runtimeSelection.selectedGrid.cellsX === 768 && options.runtimeSelection.selectedGrid.cellsY === 432
      ? []
      : [`runtime grid was ${options.runtimeSelection.selectedGrid.cellsX} x ${options.runtimeSelection.selectedGrid.cellsY}`]),
    ...(options.runtimeSelection.grid === "768x432" ? [] : [`canvas grid was ${options.runtimeSelection.grid ?? "missing"}`]),
    ...(options.runtimeSelection.renderer === "webgpu-grid-primary-v1"
      ? []
      : [`runtime renderer was ${options.runtimeSelection.renderer ?? "missing"}`]),
    ...(options.runtimeSelection.waterContext === "webgpu"
      ? []
      : [`runtime water context was ${options.runtimeSelection.waterContext ?? "missing"}`]),
    ...(options.coreReference.gate === "G-FG-22" ? [] : [`core reference gate was ${options.coreReference.gate}`]),
    ...(options.coreReference.pass ? [] : options.coreReference.failures.map((failure) => `core reference ${failure}`)),
    ...(options.coreReference.launchMode === "packaged-app"
      ? []
      : [`core reference launch mode was ${options.coreReference.launchMode}`]),
    ...(options.coreReference.preferredTier === "ultra"
      ? []
      : [`core reference preferred tier was ${options.coreReference.preferredTier}`]),
    ...(options.coreReference.selectedTier === "ultra"
      ? []
      : [`core reference selected tier was ${options.coreReference.selectedTier}`]),
    ...(options.coreReference.summary.liveGrid === "768x432"
      ? []
      : [`core reference grid was ${options.coreReference.summary.liveGrid}`]),
    ...requiredCategories.flatMap((category) =>
      categories.includes(category) ? [] : [`core reference missing ${category} category`]
    ),
    ...(options.coreReference.summary.comparisonCount >= 10
      ? []
      : [`core reference comparison count was ${options.coreReference.summary.comparisonCount}`]),
    ...(options.coreReference.summary.caseCount >= 5 ? [] : [`core reference case count was ${options.coreReference.summary.caseCount}`]),
    ...(options.coreReference.noFullGridReadbackPerFrame ? [] : ["core reference used full-grid readback"]),
    ...(concreteDropCase?.telemetry.pressureActive ? [] : ["core reference pressure was not active during concrete drop"]),
    ...(concreteDropCase?.telemetry.particlesActive ? [] : ["core reference particles were not active during concrete drop"]),
    ...(concreteDropCase?.consumedCoupling?.active ? [] : ["core reference consumed coupling was not active during concrete drop"]),
  ];

  return {
    ...options,
    failures,
    gate: "G-FG-36",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failures.length === 0,
    summary: {
      caseCount: options.coreReference.summary.caseCount,
      categories,
      comparisonCount: options.coreReference.summary.comparisonCount,
      grid: options.coreReference.summary.liveGrid,
      mode: options.runtimeSelection.selection?.mode ?? null,
      selectedTier: options.runtimeSelection.selectedTier,
    },
  };
}
