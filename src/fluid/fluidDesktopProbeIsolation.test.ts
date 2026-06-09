import { describe, expect, it } from "vitest";
import { createFluidDesktopProbeIsolationReport, type FluidDesktopProbeIsolationOptions } from "./fluidDesktopProbeIsolation";

describe("Desktop probe isolation gate", () => {
  it("passes when a temporary packaged probe renders while the default Desktop app remains alive", () => {
    const report = createFluidDesktopProbeIsolationReport(validOptions());

    expect(report.gate).toBe("G-FG-49");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
  });

  it("rejects Electron bootstrap order that takes the single-instance lock before userData", () => {
    const report = createFluidDesktopProbeIsolationReport({
      ...validOptions(),
      electronBootstrap: {
        ...validOptions().electronBootstrap,
        singleInstanceLockIndex: 10,
        userDataOverrideBeforeSingleInstanceLock: false,
        userDataOverrideIndex: 40,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("before requestSingleInstanceLock");
  });

  it("rejects a temporary probe that was bounced into default userData", () => {
    const report = createFluidDesktopProbeIsolationReport({
      ...validOptions(),
      temporaryProbe: {
        ...validOptions().temporaryProbe,
        report: {
          ...validOptions().temporaryProbe.report!,
          userData: "default",
        },
        succeededWhileDefaultAlive: false,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("temporary probe did not succeed");
    expect(report.failures.join(" ")).toContain("temporary probe used default userData");
  });

  it("rejects default app or temporary probe black-screen evidence", () => {
    const report = createFluidDesktopProbeIsolationReport({
      ...validOptions(),
      defaultInstance: {
        ...validOptions().defaultInstance,
        aliveAfterProbe: false,
        framesAfterProbe: 8,
        framesBeforeProbe: 8,
        renderer: "legacy-canvas-diagnostic-v1",
      },
      temporaryProbe: {
        ...validOptions().temporaryProbe,
        exitCode: 1,
        report: {
          ...validOptions().temporaryProbe.report!,
          pass: false,
          pixelProbe: {
            averageLuma: 1,
            colorBuckets: 1,
            status: "blank",
            variety: "flat",
          },
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("default instance was not alive");
    expect(report.failures.join(" ")).toContain("default instance renderer was legacy-canvas-diagnostic-v1");
    expect(report.failures.join(" ")).toContain("temporary probe exited with 1");
    expect(report.failures.join(" ")).toContain("temporary probe pixels were blank");
  });
});

function validOptions(): FluidDesktopProbeIsolationOptions {
  return {
    defaultInstance: {
      aliveAfterProbe: true,
      framesAfterProbe: 42,
      framesBeforeProbe: 12,
      launchMode: "packaged-executable",
      renderer: "webgpu-grid-primary-v1",
      userData: "default",
      waterContext: "webgpu",
    },
    electronBootstrap: {
      singleInstanceLockIndex: 520,
      sourcePath: "electron/main.cjs",
      userDataOverrideBeforeSingleInstanceLock: true,
      userDataOverrideIndex: 480,
    },
    launcher: {
      executablePath: "/Users/sasha/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
      path: "/Users/sasha/Desktop/Ocean Impact Lab.app",
      targetPath: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
    },
    temporaryProbe: {
      exitCode: 0,
      report: {
        gate: "G-FG-03",
        launchMode: "packaged-executable",
        pass: true,
        pixelProbe: {
          averageLuma: 125.7,
          colorBuckets: 24,
          status: "nonblank",
          variety: "varied",
        },
        telemetry: {
          frames: 56,
          grid: "512x288",
          renderer: "webgpu-grid-primary-v1",
          status: "rendered",
          tier: "high",
          waterContext: "webgpu",
        },
        userData: "temporary",
      },
      reportPath: "reports/fluid-desktop-probe-isolation-render-probe-latest.json",
      stderrTail: "",
      stdoutTail: "Fluid render probe written",
      succeededWhileDefaultAlive: true,
    },
  };
}
