import { runPlaytestTrace } from "./playtestTrace";

declare const process: {
  env: Record<string, string | undefined>;
};

const seed = positiveInteger(process.env.HARBORLINE_PLAYTEST_SEED, 12000);
const decisionBudget = positiveInteger(process.env.HARBORLINE_PLAYTEST_DECISIONS, 90);
const report = runPlaytestTrace(seed, { decisionBudget });

console.log(JSON.stringify(report, null, 2));

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
