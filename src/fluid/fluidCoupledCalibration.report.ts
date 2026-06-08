import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFluidCoupledCalibrationReport } from "./fluidCoupledCalibration";

const outPath = process.env.OCEAN_LAB_COUPLED_CALIBRATION_OUT || "reports/fluid-coupled-calibration-latest.json";
const localCalibrationPath = process.env.OCEAN_LAB_COUPLED_LOCAL_CALIBRATION_IN || "reports/fluid-local-calibration-fg13.json";
const shallowWaterPath = process.env.OCEAN_LAB_COUPLED_SHALLOW_WATER_IN || "docs/evidence/FG-11-shallow-water-2026-06-08.json";
const particleSplashPath = process.env.OCEAN_LAB_COUPLED_PARTICLE_SPLASH_IN || "docs/evidence/FG-12-particle-splash-2026-06-08.json";

const [localCalibration, shallowWater, particleSplash] = await Promise.all([
  readJson(localCalibrationPath),
  readJson(shallowWaterPath),
  readJson(particleSplashPath),
]);

const report = createFluidCoupledCalibrationReport({
  localCalibration,
  particleSplash,
  shallowWater,
  sources: {
    localCalibrationPath,
    particleSplashPath,
    shallowWaterPath,
  },
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Fluid coupled calibration report written to ${outPath}`);
console.log(`- gate: ${report.gate}`);
console.log(`- packaged runtime: ${report.packagedRuntime.launchMode}, ${report.packagedRuntime.renderer.join(", ") || "no renderer"}`);
console.log(`- reference categories: ${report.referenceReplay.categories.join(", ")}`);
console.log(
  `- shallow-water: mass drift ${report.solverEvidence.shallowWater.massRelativeDrift.toExponential(3)}, damping ${report.solverEvidence.shallowWater.momentumDampingRatio.toFixed(3)}`
);
console.log(
  `- particle splash: ${report.solverEvidence.particleSplash.highParticleCount} particles, crown ${report.solverEvidence.particleSplash.predictedCrownHeightM.toFixed(3)} m, reentry ${report.solverEvidence.particleSplash.reentryEnergyJ.toFixed(2)} J`
);

if (!report.pass) {
  console.error("FG-13 coupled calibration failed:");
  for (const failure of report.failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}

async function readJson(filePath: string): Promise<unknown> {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text);
}
