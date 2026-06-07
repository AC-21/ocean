import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const seed = positiveInteger(args.seed ?? process.env.HARBORLINE_PLAYTEST_SEED, 12000);
const decisions = positiveInteger(args.decisions ?? process.env.HARBORLINE_PLAYTEST_DECISIONS, 90);
const outPath = args.out ?? "reports/playtest-trace-latest.json";

const report = await runPlaytestTrace({ seed, decisions });
await writeJson(outPath, report);

console.log(`Playtest trace written to ${outPath}`);
console.log(
  `- seed ${report.seed}: ${report.decisions}/${report.decisionBudget} decisions, ${report.voyagesCompleted} voyages, ${report.arrivalsChecked} arrivals, max pure-wait streak ${report.maxPureWaitStreak}`
);
console.log(`- reasons: ${Object.entries(report.reasonsSeen).map(([key, count]) => `${key} ${count}`).join(", ") || "none"}`);
if (report.violations.length) {
  console.log(`- violations: ${report.violations.map((entry) => `${entry.kind} at decision ${entry.decision}`).join("; ")}`);
  process.exitCode = 1;
} else {
  console.log("- cadence gate passed");
}

async function runPlaytestTrace({ seed, decisions }) {
  const output = await capture("npm", ["run", "--silent", "playtest:trace:json"], {
    ...process.env,
    HARBORLINE_PLAYTEST_SEED: String(seed),
    HARBORLINE_PLAYTEST_DECISIONS: String(decisions),
  });
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Playtest trace did not produce JSON. Output:\n${output}\n${error instanceof Error ? error.message : String(error)}`);
  }
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

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
