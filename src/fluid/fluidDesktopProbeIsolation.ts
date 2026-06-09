export type FluidDesktopProbeIsolationGate = "G-FG-49";

export type FluidDesktopProbeIsolationPixelProbe = {
  averageLuma: number;
  colorBuckets: number;
  status: string;
  variety: string;
};

export type FluidDesktopProbeIsolationRenderProbe = {
  gate: string;
  launchMode: string;
  pass: boolean;
  pixelProbe: FluidDesktopProbeIsolationPixelProbe;
  telemetry: {
    frames: number;
    grid: string | null;
    renderer: string | null;
    status: string | null;
    tier: string | null;
    waterContext: string | null;
  };
  userData: string;
};

export type FluidDesktopProbeIsolationReport = {
  defaultInstance: {
    aliveAfterProbe: boolean;
    framesAfterProbe: number;
    framesBeforeProbe: number;
    launchMode: "packaged-executable";
    renderer: string | null;
    userData: "default";
    waterContext: string | null;
  };
  electronBootstrap: {
    singleInstanceLockIndex: number;
    sourcePath: string;
    userDataOverrideBeforeSingleInstanceLock: boolean;
    userDataOverrideIndex: number;
  };
  failures: string[];
  gate: FluidDesktopProbeIsolationGate;
  generatedAt: string;
  launcher: {
    executablePath: string;
    path: string;
    targetPath: string | null;
  };
  pass: boolean;
  temporaryProbe: {
    exitCode: number;
    report: FluidDesktopProbeIsolationRenderProbe | null;
    reportPath: string;
    stderrTail: string;
    stdoutTail: string;
    succeededWhileDefaultAlive: boolean;
  };
};

export type FluidDesktopProbeIsolationOptions = Omit<
  FluidDesktopProbeIsolationReport,
  "failures" | "gate" | "generatedAt" | "pass"
> & {
  generatedAt?: string;
};

export function createFluidDesktopProbeIsolationReport(options: FluidDesktopProbeIsolationOptions): FluidDesktopProbeIsolationReport {
  const temporaryProbe = options.temporaryProbe.report;
  const failures = [
    ...(options.electronBootstrap.userDataOverrideBeforeSingleInstanceLock
      ? []
      : ["Electron must apply HARBORLINE_USER_DATA_DIR before requestSingleInstanceLock"]),
    ...(options.electronBootstrap.userDataOverrideIndex >= 0 ? [] : ["Electron userData override was not found"]),
    ...(options.electronBootstrap.singleInstanceLockIndex >= 0 ? [] : ["Electron single-instance lock was not found"]),
    ...(options.launcher.targetPath ? [] : ["Desktop launcher target path was missing"]),
    ...(options.launcher.executablePath.includes("Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab")
      ? []
      : [`launcher executable path was ${options.launcher.executablePath}`]),
    ...(options.defaultInstance.userData === "default" ? [] : ["default instance did not use default userData"]),
    ...(options.defaultInstance.framesBeforeProbe >= 6
      ? []
      : [`default instance frames before probe were ${options.defaultInstance.framesBeforeProbe}`]),
    ...(options.defaultInstance.framesAfterProbe >= options.defaultInstance.framesBeforeProbe
      ? []
      : [
          `default instance frames regressed during temporary probe: ${options.defaultInstance.framesBeforeProbe} -> ${options.defaultInstance.framesAfterProbe}`,
        ]),
    ...(options.defaultInstance.aliveAfterProbe ? [] : ["default instance was not alive after the temporary probe"]),
    ...(options.defaultInstance.renderer === "webgpu-grid-primary-v1"
      ? []
      : [`default instance renderer was ${options.defaultInstance.renderer ?? "missing"}`]),
    ...(options.defaultInstance.waterContext === "webgpu"
      ? []
      : [`default instance water context was ${options.defaultInstance.waterContext ?? "missing"}`]),
    ...(options.temporaryProbe.exitCode === 0
      ? []
      : [`temporary probe exited with ${options.temporaryProbe.exitCode}: ${options.temporaryProbe.stderrTail || options.temporaryProbe.stdoutTail}`]),
    ...(options.temporaryProbe.succeededWhileDefaultAlive ? [] : ["temporary probe did not succeed while the default app was alive"]),
    ...(temporaryProbe?.pass ? [] : ["temporary render probe did not pass"]),
    ...(temporaryProbe?.launchMode === "packaged-executable"
      ? []
      : [`temporary probe launch mode was ${temporaryProbe?.launchMode ?? "missing"}`]),
    ...(temporaryProbe?.userData === "temporary"
      ? []
      : [`temporary probe used ${temporaryProbe?.userData ?? "missing"} userData`]),
    ...(temporaryProbe?.telemetry.renderer === "webgpu-grid-primary-v1"
      ? []
      : [`temporary probe renderer was ${temporaryProbe?.telemetry.renderer ?? "missing"}`]),
    ...(temporaryProbe?.telemetry.waterContext === "webgpu"
      ? []
      : [`temporary probe water context was ${temporaryProbe?.telemetry.waterContext ?? "missing"}`]),
    ...((temporaryProbe?.telemetry.frames ?? 0) >= 6
      ? []
      : [`temporary probe frames were ${temporaryProbe?.telemetry.frames ?? 0}`]),
    ...(temporaryProbe?.pixelProbe.status === "nonblank"
      ? []
      : [`temporary probe pixels were ${temporaryProbe?.pixelProbe.status ?? "missing"}`]),
    ...(temporaryProbe?.pixelProbe.variety === "varied"
      ? []
      : [`temporary probe pixel variety was ${temporaryProbe?.pixelProbe.variety ?? "missing"}`]),
    ...((temporaryProbe?.pixelProbe.colorBuckets ?? 0) >= 18
      ? []
      : [`temporary probe color buckets were ${temporaryProbe?.pixelProbe.colorBuckets ?? 0}`]),
  ];

  return {
    ...options,
    failures,
    gate: "G-FG-49",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failures.length === 0,
  };
}
