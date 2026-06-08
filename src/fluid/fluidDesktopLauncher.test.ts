import { describe, expect, it } from "vitest";
import { createFluidDesktopLauncherReport, type FluidDesktopLauncherOptions } from "./fluidDesktopLauncher";

describe("fluid desktop launcher gate", () => {
  it("passes when the Desktop launcher targets a signed installed app with nonblank WebGPU output", () => {
    const report = createFluidDesktopLauncherReport(validOptions());

    expect(report.gate).toBe("G-FG-33");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
    expect(report.renderProbe.telemetry.renderer).toBe("webgpu-grid-primary-v1");
    expect(report.renderProbe.pixelProbe.status).toBe("nonblank");
  });

  it("rejects installing the desktop app inside the workspace", () => {
    const report = createFluidDesktopLauncherReport({
      ...validOptions(),
      install: {
        ...validOptions().install,
        installRootOutsideWorkspace: false,
        installRootPath: "/Users/sasha/Documents/New project/release",
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures).toContain("desktop install root must be outside the workspace");
  });

  it("rejects a Desktop launcher that does not resolve to the packaged app bundle", () => {
    const report = createFluidDesktopLauncherReport({
      ...validOptions(),
      launcher: {
        ...validOptions().launcher,
        kind: "directory",
        resolvesToAppBundle: false,
        targetPath: "/Users/sasha/Documents/New project/release/Ocean Impact Lab.app",
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures).toContain("desktop launcher must be a symlink, got directory");
    expect(report.failures).toContain("desktop launcher does not resolve to the packaged app bundle");
  });

  it("rejects a black or flat Desktop render probe", () => {
    const report = createFluidDesktopLauncherReport({
      ...validOptions(),
      renderProbe: {
        ...validOptions().renderProbe,
        pass: false,
        pixelProbe: {
          averageLuma: 0.5,
          colorBuckets: 1,
          status: "blank",
          variety: "flat",
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("desktop render probe did not pass");
    expect(report.failures.join(" ")).toContain("desktop pixel probe was blank");
    expect(report.failures.join(" ")).toContain("desktop pixel variety was flat");
  });
});

function validOptions(): FluidDesktopLauncherOptions {
  return {
    generatedAt: "2026-06-08T00:00:00.000Z",
    install: {
      appBundlePath: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
      executablePath: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
      installRootOutsideWorkspace: true,
      installRootPath: "/Users/sasha/Applications/Ocean Impact Lab Builds",
      workspaceRoot: "/Users/sasha/Documents/New project",
    },
    launcher: {
      executablePath: "/Users/sasha/Desktop/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
      kind: "symlink",
      path: "/Users/sasha/Desktop/Ocean Impact Lab.app",
      resolvesToAppBundle: true,
      targetPath: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
    },
    renderProbe: {
      gate: "G-FG-03",
      launchMode: "packaged-executable",
      pass: true,
      pixelProbe: {
        averageLuma: 125.7,
        colorBuckets: 23,
        status: "nonblank",
        variety: "varied",
      },
      telemetry: {
        frames: 55,
        grid: "512x288",
        renderer: "webgpu-grid-primary-v1",
        status: "rendered",
        tier: "high",
        waterContext: "webgpu",
      },
      userData: "default",
    },
    signing: {
      codesignVerified: true,
      forbiddenExtendedAttributes: [],
      verifyOutput: "valid on disk",
    },
  };
}
