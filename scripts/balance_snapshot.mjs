import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const runs = positiveInteger(args.runs ?? process.env.HARBORLINE_SIM_RUNS, 250);
const seed = positiveInteger(args.seed ?? process.env.HARBORLINE_SIM_SEED, 9000);
const label = args.label ?? `snapshot-${seed}-${runs}`;
const outPath = args.out ?? "reports/balance-snapshot-latest.json";
const comparePath = args.compare;
const compareOutPath = args.compareOut ?? "reports/balance-comparison-latest.json";

const before = comparePath ? await readJson(comparePath) : null;
const snapshot = await runSimulationSnapshot({ runs, seed, label });

await writeJson(outPath, snapshot);
console.log(`Balance snapshot written to ${outPath}`);
console.log(
  `- ${snapshot.label}: ${snapshot.report.runs} runs, win ${formatRatio(snapshot.report.winRate)}, avg score ${formatMoney(
    snapshot.report.averageFinalScore
  )}, bankruptcy ${formatRatio(snapshot.report.bankruptcyRate)}, upgrades ${formatRatio(snapshot.report.upgradedRunRate)}`
);
if (snapshot.summary.needsAttention.length) {
  console.log(`- Attention: ${snapshot.summary.needsAttention.join("; ")}`);
}

if (before) {
  const comparison = compareSnapshots(before, snapshot);
  await writeJson(compareOutPath, comparison);
  console.log(`Balance comparison written to ${compareOutPath}`);
  for (const delta of comparison.metricDeltas) {
    console.log(`- ${delta.label}: ${formatMetric(delta.before, delta.unit)} -> ${formatMetric(delta.after, delta.unit)} (${formatDelta(delta)})`);
  }
}

async function runSimulationSnapshot({ runs, seed, label }) {
  const output = await capture("npm", ["run", "--silent", "simulate"], {
    ...process.env,
    HARBORLINE_SIM_RUNS: String(runs),
    HARBORLINE_SIM_SEED: String(seed),
    HARBORLINE_SIM_LABEL: label,
  });
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Simulation did not produce JSON. Output:\n${output}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

function compareSnapshots(before, after) {
  const metricKeys = Object.keys(after.targets);
  const metricDeltas = metricKeys.map((key) => {
    const unit = after.targets[key].unit;
    const beforeValue = before.report[key];
    const afterValue = after.report[key];
    const delta = Number((afterValue - beforeValue).toFixed(3));
    return {
      key,
      label: after.targets[key].label,
      before: beforeValue,
      after: afterValue,
      delta,
      relativeDelta: beforeValue === 0 ? 0 : Number((delta / Math.abs(beforeValue)).toFixed(3)),
      unit,
    };
  });
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    beforeLabel: before.label,
    afterLabel: after.label,
    runDelta: after.report.runs - before.report.runs,
    seedChanged: after.report.seedStart !== before.report.seedStart,
    metricDeltas,
    dominantGoodBefore: before.summary.dominantGood,
    dominantGoodAfter: after.summary.dominantGood,
    attention: after.summary.needsAttention.length ? after.summary.needsAttention : ["All tracked metrics are within target bands"],
  };
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = rawArgs[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

async function capture(command, commandArgs, env) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} ${commandArgs.join(" ")} exited with ${code}\n${stderr || stdout}`));
    });
  });
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function formatMoney(value) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatRatio(value) {
  return `${Math.round(value * 100)}%`;
}

function formatMetric(value, unit) {
  if (unit === "ratio") return formatRatio(value);
  if (unit === "score") return formatMoney(value);
  if (unit === "days") return `${Number(value.toFixed(1))}d`;
  return Number(value.toFixed(1)).toLocaleString();
}

function formatDelta(delta) {
  const sign = delta.delta >= 0 ? "+" : "";
  return `${sign}${formatMetric(delta.delta, delta.unit)}`;
}
