import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFluidReferenceDatasetReport } from "./fluidReferenceDataset";

const outPath = process.env.OCEAN_LAB_REFERENCE_DATASET_OUT || "reports/fluid-reference-dataset-latest.json";
const report = createFluidReferenceDatasetReport();

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Fluid reference dataset report written to ${outPath}`);
console.log(`- gate: ${report.gate}`);
console.log(`- cases: ${report.summary.caseCount}, measurements: ${report.summary.measurementCount}`);
console.log(`- categories: ${report.categories.join(", ")}`);
console.log(`- sources: ${report.sources.externalCount} external, ${report.sources.internalCount} internal`);

if (!report.pass) {
  console.error("FG-10 reference dataset gate failed:");
  for (const failure of report.failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
