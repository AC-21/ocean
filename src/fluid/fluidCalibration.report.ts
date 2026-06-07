import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { calibrationEvidenceArtifacts, createFluidCalibrationReport, type FluidCalibrationEvidenceCheck } from "./fluidCalibration";

const outPath = process.env.OCEAN_LAB_FLUID_CALIBRATION_OUT || "reports/fluid-calibration-latest.json";
const evidenceText = Object.fromEntries(
  (Object.entries(calibrationEvidenceArtifacts) as Array<[FluidCalibrationEvidenceCheck["id"], string]>).map(([id, artifact]) => [
    id,
    readFileSync(artifact, "utf8"),
  ])
) as Partial<Record<FluidCalibrationEvidenceCheck["id"], string>>;

const report = createFluidCalibrationReport({ evidenceText });
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Fluid calibration report written to ${outPath}`);
console.log(`- cases: ${report.summary.caseCount}, failed: ${report.summary.failedCases.length}`);
console.log(`- evidence: ${report.summary.evidenceCount}, failed: ${report.summary.failedEvidence.length}`);
console.log(`- max relative error outside accepted bands: ${report.summary.maximumRelativeError.toFixed(6)}`);

if (!report.pass) {
  console.error(JSON.stringify({ failedCases: report.summary.failedCases, failedEvidence: report.summary.failedEvidence }, null, 2));
  process.exit(1);
}
