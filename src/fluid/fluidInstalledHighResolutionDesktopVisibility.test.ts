import { describe, expect, it } from "vitest";
import {
  createFluidInstalledHighResolutionDesktopVisibilityReport,
  type FluidInstalledHighResolutionDesktopVisibilityOptions,
} from "./fluidInstalledHighResolutionDesktopVisibility";

describe("installed high-resolution Desktop visibility gate", () => {
  it("passes when normal macOS Desktop launch shows the installed high-resolution ocean viewport", () => {
    const report = createFluidInstalledHighResolutionDesktopVisibilityReport(visibleHighResolutionOptions());

    expect(report.gate).toBe("G-FG-44");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
  });

  it("rejects source evidence that is not the installed high-resolution 1024x576 path", () => {
    const report = createFluidInstalledHighResolutionDesktopVisibilityReport({
      ...visibleHighResolutionOptions(),
      highResolutionEvidence: {
        ...visibleHighResolutionOptions().highResolutionEvidence,
        gate: "G-FG-35",
        liveGrid: "768x432",
      },
      storage: {
        defaultStorage: true,
        profileHadRuntimeGrid: false,
        readByMainProcess: false,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("high-resolution evidence gate was G-FG-35");
    expect(report.failures.join(" ")).toContain("high-resolution evidence live grid was 768x432");
    expect(report.failures.join(" ")).toContain("high-resolution profile did not include runtimeGrid");
  });

  it("rejects a black high-resolution Desktop viewport", () => {
    const report = createFluidInstalledHighResolutionDesktopVisibilityReport({
      ...visibleHighResolutionOptions(),
      viewportProbe: {
        ...visibleHighResolutionOptions().viewportProbe,
        pixelProbe: {
          averageLuma: 2,
          colorBuckets: 1,
          status: "blank",
          variety: "flat",
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("screen may appear black");
    expect(report.failures.join(" ")).toContain("screen may appear flat");
  });

  it("rejects a hidden or wrong-bundle Desktop process", () => {
    const report = createFluidInstalledHighResolutionDesktopVisibilityReport({
      ...visibleHighResolutionOptions(),
      process: {
        command: "/Users/sasha/Documents/New project/release/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
        installedBundleProcess: false,
        pid: 24,
      },
      window: {
        ...visibleHighResolutionOptions().window,
        frontmost: false,
        visible: false,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("not the installed bundle");
    expect(report.failures.join(" ")).toContain("not visible");
    expect(report.failures.join(" ")).toContain("not frontmost");
  });
});

function visibleHighResolutionOptions(): FluidInstalledHighResolutionDesktopVisibilityOptions {
  return {
    highResolutionEvidence: {
      gate: "G-FG-43",
      liveGrid: "1024x576",
      pass: true,
      renderer: "webgpu-grid-primary-v1",
      sourcePath: "reports/fluid-installed-high-resolution-float-sink-envelope-latest.json",
      visual: {
        averageLuma: 124.27,
        colorBuckets: 27,
        status: "nonblank",
        variety: "varied",
      },
      waterContext: "webgpu",
    },
    launcher: {
      path: "/Users/sasha/Desktop/Ocean Impact Lab.app",
      resolvesToInstalledBundle: true,
      targetPath: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app",
    },
    process: {
      command: "/Users/sasha/Applications/Ocean Impact Lab Builds/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
      installedBundleProcess: true,
      pid: 13821,
    },
    storage: {
      defaultStorage: true,
      profileHadRuntimeGrid: true,
      readByMainProcess: true,
    },
    viewportProbe: {
      crop: {
        height: 450,
        width: 612,
        x: 620,
        y: 260,
      },
      pixelProbe: {
        averageLuma: 92.5,
        colorBuckets: 29,
        status: "nonblank",
        variety: "varied",
      },
      screenshotPath: "reports/fluid-installed-high-resolution-desktop-visibility-latest.png",
    },
    window: {
      frontmost: true,
      height: 900,
      onScreen: true,
      title: "Ocean Impact Lab",
      visible: true,
      width: 1360,
      windowCount: 1,
      x: 184,
      y: 109,
    },
  };
}
