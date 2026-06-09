import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFluidHighResolutionCalibrationFrontierReport } from "./fluidHighResolutionCalibrationFrontier";
import type { FluidInstalledHighResolutionTargetResidualsReport } from "./fluidInstalledHighResolutionTargetResiduals";

const outPath =
  process.env.OCEAN_LAB_HIGH_RESOLUTION_CALIBRATION_FRONTIER_OUT ||
  "reports/fluid-high-resolution-calibration-frontier-latest.json";
const sourcePath =
  process.env.OCEAN_LAB_HIGH_RESOLUTION_CALIBRATION_FRONTIER_IN ||
  "docs/evidence/FG-48-installed-high-resolution-target-residuals-2026-06-08.json";

const source = JSON.parse(await readFile(sourcePath, "utf8")) as FluidInstalledHighResolutionTargetResidualsReport;
const report = createFluidHighResolutionCalibrationFrontierReport({
  source,
  sourcePath,
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Fluid high-resolution calibration frontier report written to ${outPath}`);
console.log(`- source: ${report.noRegressionGuard.sourceGate}, ${report.noRegressionGuard.sourceVisualLiveGrid}`);
console.log(`- frontier: ${report.frontier.slice(0, 3).map((entry) => `${entry.comparisonId}:${entry.targetErrorRatio.toFixed(4)}`).join(", ")}`);
console.log(`- physics tuning: ${report.actionSummary.physicsTuningCandidateIds.join(", ") || "none"}`);
console.log(`- target review: ${report.actionSummary.referenceTargetReviewIds.join(", ") || "none"}`);
assert.equal(report.gate, "G-FG-50", "FG-50 evidence must use the high-resolution calibration frontier gate id");
assert.deepEqual(report.failures, [], `FG-50 failures:\n${report.failures.join("\n")}`);
