export type FluidInstalledHighResolutionDesktopVisibilityGate = "G-FG-44";

export type InstalledHighResolutionDesktopVisibilityPixelProbe = {
  averageLuma: number;
  colorBuckets: number;
  status: "blank" | "nonblank";
  variety: "flat" | "varied";
};

export type FluidInstalledHighResolutionDesktopVisibilityReport = {
  failures: string[];
  gate: FluidInstalledHighResolutionDesktopVisibilityGate;
  generatedAt: string;
  highResolutionEvidence: {
    gate: string;
    liveGrid: string | null;
    pass: boolean;
    renderer: string | null;
    sourcePath: string;
    visual: {
      averageLuma: number;
      colorBuckets: number;
      status: string;
      variety: string;
    } | null;
    waterContext: string | null;
  };
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
  storage: {
    defaultStorage: boolean;
    profileHadRuntimeGrid: boolean;
    readByMainProcess: boolean;
  };
  viewportProbe: {
    crop: {
      height: number;
      width: number;
      x: number;
      y: number;
    };
    pixelProbe: InstalledHighResolutionDesktopVisibilityPixelProbe;
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

export type FluidInstalledHighResolutionDesktopVisibilityOptions = Omit<
  FluidInstalledHighResolutionDesktopVisibilityReport,
  "failures" | "gate" | "generatedAt" | "pass"
> & {
  generatedAt?: string;
};

export function createFluidInstalledHighResolutionDesktopVisibilityReport(
  options: FluidInstalledHighResolutionDesktopVisibilityOptions
): FluidInstalledHighResolutionDesktopVisibilityReport {
  const failures = [
    ...(options.highResolutionEvidence.gate === "G-FG-43"
      ? []
      : [`high-resolution evidence gate was ${options.highResolutionEvidence.gate}`]),
    ...(options.highResolutionEvidence.pass ? [] : ["high-resolution float/sink evidence did not pass"]),
    ...(options.highResolutionEvidence.liveGrid === "1024x576"
      ? []
      : [`high-resolution evidence live grid was ${options.highResolutionEvidence.liveGrid ?? "missing"}`]),
    ...(options.highResolutionEvidence.renderer === "webgpu-grid-primary-v1"
      ? []
      : [`high-resolution evidence renderer was ${options.highResolutionEvidence.renderer ?? "missing"}`]),
    ...(options.highResolutionEvidence.waterContext === "webgpu"
      ? []
      : [`high-resolution evidence water context was ${options.highResolutionEvidence.waterContext ?? "missing"}`]),
    ...(options.highResolutionEvidence.visual?.status === "nonblank"
      ? []
      : [`high-resolution source viewport pixels were ${options.highResolutionEvidence.visual?.status ?? "missing"}`]),
    ...(options.highResolutionEvidence.visual?.variety === "varied"
      ? []
      : [`high-resolution source viewport variety was ${options.highResolutionEvidence.visual?.variety ?? "missing"}`]),
    ...(options.storage.defaultStorage ? [] : ["high-resolution profile was not installed in default Desktop storage"]),
    ...(options.storage.profileHadRuntimeGrid ? [] : ["high-resolution profile did not include runtimeGrid"]),
    ...(options.storage.readByMainProcess ? [] : ["main process did not read the high-resolution runtime grid"]),
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
      : [`high-resolution ocean viewport crop was ${options.viewportProbe.crop.width} x ${options.viewportProbe.crop.height}`]),
    ...(options.viewportProbe.pixelProbe.status === "nonblank"
      ? []
      : [`high-resolution ocean viewport pixels were ${options.viewportProbe.pixelProbe.status}; screen may appear black`]),
    ...(options.viewportProbe.pixelProbe.variety === "varied"
      ? []
      : [`high-resolution ocean viewport variety was ${options.viewportProbe.pixelProbe.variety}; screen may appear flat`]),
    ...(options.viewportProbe.pixelProbe.averageLuma >= 35
      ? []
      : [`high-resolution ocean viewport average luma was ${options.viewportProbe.pixelProbe.averageLuma}`]),
    ...(options.viewportProbe.pixelProbe.colorBuckets >= 18
      ? []
      : [`high-resolution ocean viewport color buckets were ${options.viewportProbe.pixelProbe.colorBuckets}`]),
  ];

  return {
    ...options,
    failures,
    gate: "G-FG-44",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failures.length === 0,
  };
}
