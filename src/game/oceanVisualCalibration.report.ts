import { createOceanVisualCalibrationReport } from "./oceanVisualCalibration";

declare const process: {
  env: Record<string, string | undefined>;
};

const day = positiveInteger(process.env.HARBORLINE_OCEAN_VISUAL_DAY, 18);
const report = createOceanVisualCalibrationReport({ day });

console.log(JSON.stringify(report, null, 2));

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
