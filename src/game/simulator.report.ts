import { createBalanceSnapshot } from "./balanceTelemetry";
import { simulateRuns } from "./simulator";

declare const process: {
  env: Record<string, string | undefined>;
};

const runs = positiveInteger(process.env.HARBORLINE_SIM_RUNS, 1000);
const seedStart = positiveInteger(process.env.HARBORLINE_SIM_SEED, 9000);
const label = process.env.HARBORLINE_SIM_LABEL || `sim-${seedStart}-${runs}`;
const report = simulateRuns(runs, { seedStart });
const snapshot = createBalanceSnapshot(report, { label });
console.log(JSON.stringify(snapshot, null, 2));

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
