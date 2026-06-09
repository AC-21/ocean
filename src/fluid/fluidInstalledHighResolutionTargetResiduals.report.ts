import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FluidInstalledHighResolutionResidualBudgetReport } from "./fluidInstalledHighResolutionResidualBudget";
import type { FluidInstalledHighResolutionVisualWatchdogReport } from "./fluidInstalledHighResolutionVisualWatchdog";
import { createFluidInstalledHighResolutionTargetResidualsReport } from "./fluidInstalledHighResolutionTargetResiduals";

const outPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_TARGET_RESIDUALS_OUT ||
  "reports/fluid-installed-high-resolution-target-residuals-latest.json";
const sourceResidualBudgetPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_TARGET_RESIDUALS_RESIDUAL_IN ||
  "docs/evidence/FG-46-installed-high-resolution-residual-budget-2026-06-08.json";
const sourceVisualWatchdogPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_TARGET_RESIDUALS_WATCHDOG_IN ||
  "docs/evidence/FG-47-installed-high-resolution-visual-watchdog-2026-06-08.json";

const sourceResidualBudget = await readJson<FluidInstalledHighResolutionResidualBudgetReport>(sourceResidualBudgetPath);
const sourceVisualWatchdog = await readJson<FluidInstalledHighResolutionVisualWatchdogReport>(sourceVisualWatchdogPath);
const report = createFluidInstalledHighResolutionTargetResidualsReport({
  sourceResidualBudget,
  sourceResidualBudgetPath,
  sourceVisualWatchdog,
  sourceVisualWatchdogPath,
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Fluid installed high-resolution target residuals report written to ${outPath}`);
console.log(`- source residuals: ${report.sourceResidualBudget.gate}, ${report.sourceResidualBudget.comparisonCount} comparisons`);
console.log(`- source watchdog: ${report.sourceVisualWatchdog.gate}, ${report.sourceVisualWatchdog.sampleCount} samples`);
console.log(
  `- targets: worst error ${report.summary.worstTargetErrorRatio.toFixed(4)}, ` +
    `closest tolerance margin ${report.summary.closestToleranceMarginRatio.toFixed(4)}`
);
console.log(`- objective counts: ${JSON.stringify(report.summary.objectiveCounts)}`);
console.log(
  `- target watch list: ${
    report.summary.targetWatchComparisonIds.length > 0 ? report.summary.targetWatchComparisonIds.join(", ") : "none"
  }`
);

assert.equal(report.gate, "G-FG-48", "FG-48 evidence must use the installed high-resolution target residuals gate id");
assert.deepEqual(report.failures, [], `FG-48 failures:\n${report.failures.join("\n")}`);

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
