import { describe, expect, it } from "vitest";
import { createFluidDesktopVisibilityReport, type FluidDesktopVisibilityOptions } from "./fluidDesktopVisibility";

describe("fluid Desktop visibility gate", () => {
  it("passes when normal Desktop launch exposes a visible calibrated WebGPU ocean viewport", () => {
    const report = createFluidDesktopVisibilityReport(visibleLaunchOptions());

    expect(report.gate).toBe("G-FG-35");
    expect(report.pass).toBe(true);
    expect(report.failures).toEqual([]);
  });

  it("rejects a launch that stayed on stale high-tier default profile evidence", () => {
    const report = createFluidDesktopVisibilityReport({
      ...visibleLaunchOptions(),
      defaultProfileEvidence: {
        ...visibleLaunchOptions().defaultProfileEvidence,
        mode: "default-high",
        selectedTier: "high",
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("default profile mode was default-high");
    expect(report.failures.join(" ")).toContain("default profile selected tier was high");
  });

  it("rejects a normal launch whose app window is not user-visible", () => {
    const report = createFluidDesktopVisibilityReport({
      ...visibleLaunchOptions(),
      window: {
        ...visibleLaunchOptions().window,
        frontmost: false,
        visible: true,
        windowCount: 0,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("not frontmost");
    expect(report.failures.join(" ")).toContain("exposed 0 windows");
  });

  it("rejects a black or flat ocean viewport even if the window shell exists", () => {
    const report = createFluidDesktopVisibilityReport({
      ...visibleLaunchOptions(),
      viewportProbe: {
        ...visibleLaunchOptions().viewportProbe,
        pixelProbe: {
          averageLuma: 2,
          colorBuckets: 1,
          status: "blank",
          variety: "flat",
        },
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("ocean viewport pixels were blank");
    expect(report.failures.join(" ")).toContain("ocean viewport variety was flat");
  });

  it("rejects a process that did not come from the installed Desktop bundle", () => {
    const report = createFluidDesktopVisibilityReport({
      ...visibleLaunchOptions(),
      process: {
        command: "/Users/sasha/Documents/New project/release/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app/Contents/MacOS/Ocean Impact Lab",
        installedBundleProcess: false,
        pid: 42,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures.join(" ")).toContain("not the installed bundle");
  });
});

function visibleLaunchOptions(): FluidDesktopVisibilityOptions {
  return {
    defaultProfileEvidence: {
      gate: "G-FG-34",
      grid: "768x432",
      mode: "calibrated-auto",
      pass: true,
      renderer: "webgpu-grid-primary-v1",
      selectedTier: "ultra",
      sourcePath: "reports/fluid-default-profile-calibration-latest.json",
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
    viewportProbe: {
      crop: {
        height: 450,
        width: 612,
        x: 620,
        y: 260,
      },
      pixelProbe: {
        averageLuma: 91.4,
        colorBuckets: 31,
        status: "nonblank",
        variety: "varied",
      },
      screenshotPath: "reports/fluid-desktop-visibility-latest.png",
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
