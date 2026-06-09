import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FluidInstalledHighResolutionOperatorReadoutReport } from "./fluidInstalledHighResolutionOperatorReadout";
import type { FluidInstalledHighResolutionReferencePacingReport } from "./fluidInstalledHighResolutionReferencePacing";
import { createFluidInstalledHighResolutionResidualBudgetReport } from "./fluidInstalledHighResolutionResidualBudget";

const outPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_RESIDUAL_BUDGET_OUT ||
  "reports/fluid-installed-high-resolution-residual-budget-latest.json";
const sourceReferencePath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_RESIDUAL_BUDGET_REFERENCE_IN ||
  "docs/evidence/FG-42-installed-high-resolution-reference-pacing-2026-06-08.json";
const operatorReadoutPath =
  process.env.OCEAN_LAB_INSTALLED_HIGH_RESOLUTION_RESIDUAL_BUDGET_OPERATOR_IN ||
  "docs/evidence/FG-45-installed-high-resolution-operator-readout-2026-06-08.json";

const sourceReference = await readJson<FluidInstalledHighResolutionReferencePacingReport>(sourceReferencePath);
const operatorReadout = await readJson<FluidInstalledHighResolutionOperatorReadoutReport>(operatorReadoutPath);
const report = createFluidInstalledHighResolutionResidualBudgetReport({
  operatorReadout,
  operatorReadoutPath,
  sourceReference,
  sourceReferencePath,
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Fluid installed high-resolution residual budget report written to ${outPath}`);
console.log(`- source reference: ${report.sourceReference.gate}/${report.sourceReference.coreGate} (${report.sourceReference.liveGrid})`);
console.log(`- operator readout: ${report.operatorReadout.gate}, ${report.operatorReadout.scenarioCount} scenarios`);
console.log(
  `- residuals: ${report.summary.comparisonCount} comparisons, worst normalized ${report.summary.worstNormalizedResidual.toFixed(4)}, ` +
    `closest margin ${report.summary.closestMarginRatio.toFixed(4)}`
);
console.log(`- watch list: ${report.summary.watchComparisonIds.length > 0 ? report.summary.watchComparisonIds.join(", ") : "none"}`);

assert.equal(report.gate, "G-FG-46", "FG-46 evidence must use the installed high-resolution residual budget gate id");
assert.deepEqual(report.failures, [], `FG-46 failures:\n${report.failures.join("\n")}`);

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
