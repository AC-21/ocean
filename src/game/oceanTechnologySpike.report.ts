import { createOceanTechnologySpikeReport } from "./oceanTechnologySpike";
import type { OceanBenchmarkEvidence } from "./oceanVisualCalibration";

declare const process: {
  env: Record<string, string | undefined>;
};

const days = positiveInteger(process.env.HARBORLINE_OCEAN_TECHNOLOGY_DAYS, 60);
const benchmark = parseBenchmarkEvidence(process.env.HARBORLINE_OCEAN_BENCHMARK_EVIDENCE_JSON);
const report = createOceanTechnologySpikeReport({ benchmark, days });

console.log(JSON.stringify(report, null, 2));

function parseBenchmarkEvidence(value: string | undefined): OceanBenchmarkEvidence | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as OceanBenchmarkEvidence;
  } catch (error) {
    throw new Error(`Invalid HARBORLINE_OCEAN_BENCHMARK_EVIDENCE_JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
