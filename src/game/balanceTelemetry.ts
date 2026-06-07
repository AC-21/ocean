import type { SimulationReport } from "./simulator";

export type BalanceMetricKey =
  | "winRate"
  | "averageFinalScore"
  | "medianFinalScore"
  | "bankruptcyRate"
  | "averageDaysSurvived"
  | "averageCompletedContracts"
  | "upgradedRunRate";

export type BalanceTargetBand = {
  label: string;
  min: number;
  max: number;
  unit: "ratio" | "score" | "days" | "contracts";
  note: string;
};

export type BalanceTargetResult = {
  key: BalanceMetricKey;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: BalanceTargetBand["unit"];
  status: "below" | "within" | "above";
  note: string;
};

export type BalanceSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  label: string;
  report: SimulationReport;
  targets: Record<BalanceMetricKey, BalanceTargetBand>;
  targetResults: BalanceTargetResult[];
  summary: {
    withinTargets: number;
    outsideTargets: number;
    dominantGood: string | null;
    needsAttention: string[];
  };
};

export type BalanceMetricDelta = {
  key: BalanceMetricKey;
  label: string;
  before: number;
  after: number;
  delta: number;
  relativeDelta: number;
  unit: BalanceTargetBand["unit"];
};

export type BalanceComparison = {
  schemaVersion: 1;
  generatedAt: string;
  beforeLabel: string;
  afterLabel: string;
  runDelta: number;
  seedChanged: boolean;
  metricDeltas: BalanceMetricDelta[];
  dominantGoodBefore: string | null;
  dominantGoodAfter: string | null;
  attention: string[];
};

export const defaultBalanceTargets: Record<BalanceMetricKey, BalanceTargetBand> = {
  winRate: {
    label: "Win rate",
    min: 0.45,
    max: 0.72,
    unit: "ratio",
    note: "bot should win often enough to prove routes exist, but not solve the game",
  },
  averageFinalScore: {
    label: "Average score",
    min: 1800,
    max: 5200,
    unit: "score",
    note: "average automated run should land above starting capital without trivializing upgrades",
  },
  medianFinalScore: {
    label: "Median score",
    min: 1400,
    max: 4700,
    unit: "score",
    note: "median should show ordinary runs are viable, not only outliers",
  },
  bankruptcyRate: {
    label: "Bankruptcy",
    min: 0.03,
    max: 0.18,
    unit: "ratio",
    note: "some pressure is healthy, but frequent collapse means the recovery loop is too punishing",
  },
  averageDaysSurvived: {
    label: "Days survived",
    min: 42,
    max: 61,
    unit: "days",
    note: "runs should usually reach late-game decisions before closing",
  },
  averageCompletedContracts: {
    label: "Contracts closed",
    min: 1.5,
    max: 8,
    unit: "contracts",
    note: "contracts should matter without crowding out speculative trade",
  },
  upgradedRunRate: {
    label: "Upgrade rate",
    min: 0.35,
    max: 0.82,
    unit: "ratio",
    note: "upgrades should be reachable in many runs but not automatic",
  },
};

const metricKeys = Object.keys(defaultBalanceTargets) as BalanceMetricKey[];

export function createBalanceSnapshot(
  report: SimulationReport,
  options: { generatedAt?: string; label?: string; targets?: Record<BalanceMetricKey, BalanceTargetBand> } = {}
): BalanceSnapshot {
  const targets = options.targets ?? defaultBalanceTargets;
  const targetResults = metricKeys.map((key) => balanceTargetResult(key, report, targets[key]));
  const outsideTargets = targetResults.filter((result) => result.status !== "within");
  const dominantGood = report.mostProfitableGoods[0]?.name ?? null;
  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    label: options.label ?? `seed-${report.seedStart}-runs-${report.runs}`,
    report,
    targets,
    targetResults,
    summary: {
      withinTargets: targetResults.length - outsideTargets.length,
      outsideTargets: outsideTargets.length,
      dominantGood,
      needsAttention: outsideTargets.map((result) => `${result.label} ${result.status} target (${formatMetricValue(result.value, result.unit)})`),
    },
  };
}

export function compareBalanceSnapshots(before: BalanceSnapshot, after: BalanceSnapshot, generatedAt = new Date().toISOString()): BalanceComparison {
  const metricDeltas = metricKeys.map((key) => {
    const target = after.targets[key] ?? defaultBalanceTargets[key];
    const beforeValue = metricValue(before.report, key);
    const afterValue = metricValue(after.report, key);
    const delta = Number((afterValue - beforeValue).toFixed(3));
    return {
      key,
      label: target.label,
      before: beforeValue,
      after: afterValue,
      delta,
      relativeDelta: beforeValue === 0 ? 0 : Number((delta / Math.abs(beforeValue)).toFixed(3)),
      unit: target.unit,
    };
  });
  const attention = after.summary.needsAttention.length ? after.summary.needsAttention : ["All tracked metrics are within target bands"];
  return {
    schemaVersion: 1,
    generatedAt,
    beforeLabel: before.label,
    afterLabel: after.label,
    runDelta: after.report.runs - before.report.runs,
    seedChanged: after.report.seedStart !== before.report.seedStart,
    metricDeltas,
    dominantGoodBefore: before.summary.dominantGood,
    dominantGoodAfter: after.summary.dominantGood,
    attention,
  };
}

export function formatMetricValue(value: number, unit: BalanceTargetBand["unit"]) {
  if (unit === "ratio") return `${Math.round(value * 100)}%`;
  if (unit === "score") return `$${Math.round(value).toLocaleString()}`;
  if (unit === "days") return `${Number(value.toFixed(1))}d`;
  return Number(value.toFixed(1)).toLocaleString();
}

function balanceTargetResult(key: BalanceMetricKey, report: SimulationReport, target: BalanceTargetBand): BalanceTargetResult {
  const value = metricValue(report, key);
  return {
    key,
    label: target.label,
    value,
    min: target.min,
    max: target.max,
    unit: target.unit,
    status: value < target.min ? "below" : value > target.max ? "above" : "within",
    note: target.note,
  };
}

function metricValue(report: SimulationReport, key: BalanceMetricKey) {
  return report[key];
}
