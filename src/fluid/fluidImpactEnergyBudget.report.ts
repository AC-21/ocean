import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFluidImpactEnergyBudgetReport } from "./fluidImpactEnergyBudget";
import { loadFluidReferenceDataset } from "./fluidReferenceDataset";
import type { FluidUltraReferenceOutcomesReport } from "./fluidUltraReferenceOutcomes";

const outPath = process.env.OCEAN_LAB_IMPACT_ENERGY_BUDGET_OUT || "reports/fluid-impact-energy-budget-latest.json";
const ultraReferencePath = process.env.OCEAN_LAB_IMPACT_ENERGY_ULTRA_REFERENCE_IN || "docs/evidence/FG-22-ultra-reference-outcomes-2026-06-08.json";
const referenceDatasetPath = process.env.OCEAN_LAB_IMPACT_ENERGY_REFERENCE_DATASET_IN || "data/fluid-reference-cases.json";

const ultraReference = await readJson<FluidUltraReferenceOutcomesReport>(ultraReferencePath);
const referenceDataset = loadFluidReferenceDataset(await readJson<unknown>(referenceDatasetPath));
const report = createFluidImpactEnergyBudgetReport({
  generatedAt: new Date().toISOString(),
  referenceDataset,
  ultraReference,
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Fluid impact energy budget report written to ${outPath}`);
console.log(`- live case: ${report.liveCaseId}`);
console.log(`- impact kinetic energy: ${(report.budget.impactKineticEnergyJ / 1000).toFixed(2)} kJ`);
console.log(`- accounted energy ratio: ${(report.budget.accountedEnergyRatio * 100).toFixed(1)}%`);
console.log(`- pressure/grid/potential/reentry ratios: ${[
  report.budget.pressureImpulseEnergyRatio,
  report.budget.splashGridEnergyRatio,
  report.budget.splashPotentialEnergyRatio,
  report.budget.particleReentryEnergyRatio,
].map((value) => (value * 100).toFixed(2)).join("% / ")}%`);
console.log(`- sources: ${report.sourceTrace.sourceIds.join(", ")}`);
assert.equal(report.gate, "G-FG-31", "FG-31 evidence must use the impact energy budget gate id");
assert.deepEqual(report.failures, [], `FG-31 failures:\n${report.failures.join("\n")}`);

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
