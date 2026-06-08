import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFluidSolverDecisionReport } from "./fluidSolverArchitecture";

const outPath = process.env.OCEAN_LAB_SOLVER_ARCHITECTURE_OUT || "reports/fluid-solver-architecture-latest.json";
const report = createFluidSolverDecisionReport();

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Fluid solver architecture report written to ${outPath}`);
console.log(`- gate: ${report.gate}`);
console.log(`- recommended option: ${report.recommendedOptionId}`);
console.log(`- primary references: ${report.primaryReferences.length}`);
console.log(`- next gates: ${report.nextMilestones.map((entry) => entry.gate).join(", ")}`);

if (!report.pass) {
  console.error("FG-09 solver architecture gate failed:");
  for (const failure of report.failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
