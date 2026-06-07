import { createOceanCompatibilityReport } from "./oceanCompatibility";
import type { OceanVisualCalibrationReport } from "./oceanVisualCalibration";
import type { OceanBenchmarkReport } from "./oceanCompatibility";

declare const process: {
  env: Record<string, string | undefined>;
};

const benchmark = parseJson<OceanBenchmarkReport>(process.env.HARBORLINE_OCEAN_BENCHMARK_JSON, "HARBORLINE_OCEAN_BENCHMARK_JSON");
const visual = parseJson<OceanVisualCalibrationReport>(process.env.HARBORLINE_OCEAN_VISUAL_JSON, "HARBORLINE_OCEAN_VISUAL_JSON");

const report = createOceanCompatibilityReport({
  benchmark,
  benchmarkSource: process.env.HARBORLINE_OCEAN_BENCHMARK_SOURCE,
  visual,
  visualSource: process.env.HARBORLINE_OCEAN_VISUAL_SOURCE,
});

console.log(JSON.stringify(report, null, 2));

function parseJson<T>(value: string | undefined, label: string): T {
  if (!value) throw new Error(`${label} is required`);
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`Invalid ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
