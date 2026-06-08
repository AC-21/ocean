export type FluidDesktopVisibilityGate = "G-FG-35";

export type FluidDesktopVisibilityPixelProbe = {
  averageLuma: number;
  colorBuckets: number;
  status: "blank" | "nonblank";
  variety: "flat" | "varied";
};

export type FluidDesktopVisibilityReport = {
  defaultProfileEvidence: {
    gate: string;
    grid: string | null;
    mode: string | null;
    pass: boolean;
    renderer: string | null;
    selectedTier: string | null;
    sourcePath: string;
    waterContext: string | null;
  };
  failures: string[];
  gate: FluidDesktopVisibilityGate;
  generatedAt: string;
  launcher: {
    path: string;
    resolvesToInstalledBundle: boolean;
    targetPath: string | null;
  };
  pass: boolean;
  process: {
    command: string;
    installedBundleProcess: boolean;
    pid: number;
  };
  viewportProbe: {
    crop: {
      height: number;
      width: number;
      x: number;
      y: number;
    };
    pixelProbe: FluidDesktopVisibilityPixelProbe;
    screenshotPath: string;
  };
  window: {
    frontmost: boolean;
    height: number;
    onScreen: boolean;
    title: string;
    visible: boolean;
    width: number;
    windowCount: number;
    x: number;
    y: number;
  };
};

export type FluidDesktopVisibilityOptions = Omit<FluidDesktopVisibilityReport, "failures" | "gate" | "generatedAt" | "pass"> & {
  generatedAt?: string;
};

export function createFluidDesktopVisibilityReport(options: FluidDesktopVisibilityOptions): FluidDesktopVisibilityReport {
  const failures = [
    ...(options.defaultProfileEvidence.gate === "G-FG-34" ? [] : [`default profile evidence gate was ${options.defaultProfileEvidence.gate}`]),
    ...(options.defaultProfileEvidence.pass ? [] : ["default profile calibration evidence did not pass"]),
    ...(options.defaultProfileEvidence.mode === "calibrated-auto" ? [] : [`default profile mode was ${options.defaultProfileEvidence.mode ?? "missing"}`]),
    ...(options.defaultProfileEvidence.selectedTier === "ultra" ? [] : [`default profile selected tier was ${options.defaultProfileEvidence.selectedTier ?? "missing"}`]),
    ...(options.defaultProfileEvidence.grid === "768x432" ? [] : [`default profile grid was ${options.defaultProfileEvidence.grid ?? "missing"}`]),
    ...(options.defaultProfileEvidence.renderer === "webgpu-grid-primary-v1" ? [] : [`default profile renderer was ${options.defaultProfileEvidence.renderer ?? "missing"}`]),
    ...(options.defaultProfileEvidence.waterContext === "webgpu" ? [] : [`default profile water context was ${options.defaultProfileEvidence.waterContext ?? "missing"}`]),
    ...(options.launcher.resolvesToInstalledBundle ? [] : ["Desktop launcher does not resolve to the installed bundle"]),
    ...(options.process.pid > 0 ? [] : ["Ocean Impact Lab process pid was missing"]),
    ...(options.process.installedBundleProcess ? [] : [`Ocean Impact Lab process was not the installed bundle: ${options.process.command}`]),
    ...(options.window.visible ? [] : ["Ocean Impact Lab process was not visible"]),
    ...(options.window.frontmost ? [] : ["Ocean Impact Lab process was not frontmost"]),
    ...(options.window.windowCount >= 1 ? [] : [`Ocean Impact Lab exposed ${options.window.windowCount} windows`]),
    ...(options.window.title.includes("Ocean Impact Lab") ? [] : [`visible window title was ${options.window.title}`]),
    ...(options.window.width >= 1000 && options.window.height >= 700
      ? []
      : [`visible window size was ${options.window.width} x ${options.window.height}`]),
    ...(options.window.onScreen ? [] : [`visible window was off screen at ${options.window.x}, ${options.window.y}`]),
    ...(options.viewportProbe.crop.width >= 360 && options.viewportProbe.crop.height >= 260
      ? []
      : [`ocean viewport crop was ${options.viewportProbe.crop.width} x ${options.viewportProbe.crop.height}`]),
    ...(options.viewportProbe.pixelProbe.status === "nonblank" ? [] : [`ocean viewport pixels were ${options.viewportProbe.pixelProbe.status}`]),
    ...(options.viewportProbe.pixelProbe.variety === "varied" ? [] : [`ocean viewport variety was ${options.viewportProbe.pixelProbe.variety}`]),
    ...(options.viewportProbe.pixelProbe.averageLuma >= 35
      ? []
      : [`ocean viewport average luma was ${options.viewportProbe.pixelProbe.averageLuma}`]),
    ...(options.viewportProbe.pixelProbe.colorBuckets >= 18
      ? []
      : [`ocean viewport color buckets were ${options.viewportProbe.pixelProbe.colorBuckets}`]),
  ];

  return {
    ...options,
    failures,
    gate: "G-FG-35",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failures.length === 0,
  };
}
