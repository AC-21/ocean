export type FluidDesktopLauncherGate = "G-FG-33";

export type FluidDesktopLauncherRenderProbe = {
  gate: string;
  launchMode: string;
  pass: boolean;
  pixelProbe: {
    averageLuma: number;
    colorBuckets: number;
    status: string;
    variety: string;
  };
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

export type FluidDesktopLauncherReport = {
  failures: string[];
  gate: FluidDesktopLauncherGate;
  generatedAt: string;
  install: {
    appBundlePath: string;
    executablePath: string;
    installRootOutsideWorkspace: boolean;
    installRootPath: string;
    workspaceRoot: string;
  };
  launcher: {
    executablePath: string;
    kind: "symlink" | "missing" | "file" | "directory" | "other";
    path: string;
    resolvesToAppBundle: boolean;
    targetPath: string | null;
  };
  pass: boolean;
  renderProbe: FluidDesktopLauncherRenderProbe;
  signing: {
    codesignVerified: boolean;
    forbiddenExtendedAttributes: string[];
    verifyOutput: string;
  };
};

export type FluidDesktopLauncherOptions = Omit<FluidDesktopLauncherReport, "failures" | "gate" | "generatedAt" | "pass"> & {
  generatedAt?: string;
};

export function createFluidDesktopLauncherReport(options: FluidDesktopLauncherOptions): FluidDesktopLauncherReport {
  const failures = [
    ...(options.install.installRootOutsideWorkspace ? [] : ["desktop install root must be outside the workspace"]),
    ...(options.launcher.kind === "symlink" ? [] : [`desktop launcher must be a symlink, got ${options.launcher.kind}`]),
    ...(options.launcher.resolvesToAppBundle ? [] : ["desktop launcher does not resolve to the packaged app bundle"]),
    ...(options.launcher.executablePath.length > 0 ? [] : ["desktop launcher executable path is missing"]),
    ...(options.signing.codesignVerified ? [] : ["desktop app bundle failed codesign verification"]),
    ...options.signing.forbiddenExtendedAttributes.map((attribute) => `desktop app bundle has forbidden extended attribute ${attribute}`),
    ...(options.renderProbe.pass ? [] : ["desktop render probe did not pass"]),
    ...(options.renderProbe.launchMode === "packaged-executable" ? [] : [`desktop render launch mode was ${options.renderProbe.launchMode}`]),
    ...(options.renderProbe.userData === "default" ? [] : [`desktop render probe used ${options.renderProbe.userData} user data`]),
    ...(options.renderProbe.telemetry.renderer === "webgpu-grid-primary-v1" ? [] : [`desktop renderer was ${options.renderProbe.telemetry.renderer ?? "missing"}`]),
    ...(options.renderProbe.telemetry.waterContext === "webgpu" ? [] : [`desktop water context was ${options.renderProbe.telemetry.waterContext ?? "missing"}`]),
    ...(options.renderProbe.telemetry.frames >= 6 ? [] : [`desktop water frames were ${options.renderProbe.telemetry.frames}`]),
    ...(options.renderProbe.pixelProbe.status === "nonblank" ? [] : [`desktop pixel probe was ${options.renderProbe.pixelProbe.status}`]),
    ...(options.renderProbe.pixelProbe.variety === "varied" ? [] : [`desktop pixel variety was ${options.renderProbe.pixelProbe.variety}`]),
    ...(options.renderProbe.pixelProbe.colorBuckets >= 18 ? [] : [`desktop color buckets were ${options.renderProbe.pixelProbe.colorBuckets}`]),
  ];

  return {
    ...options,
    failures,
    gate: "G-FG-33",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pass: failures.length === 0,
  };
}
