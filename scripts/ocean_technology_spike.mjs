import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const outPath = args.out ?? "reports/ocean-technology-spike-latest.json";
const benchmarkPath = args.benchmark ?? "reports/ocean-benchmark-latest.json";
const days = positiveInteger(args.days ?? process.env.HARBORLINE_OCEAN_TECHNOLOGY_DAYS, 60);

const benchmark = await readBenchmarkEvidence(benchmarkPath);
const report = await runOceanTechnologySpike(days, benchmark);

await writeJson(outPath, report);

if (report.decision.recommendation === "rework-current-evidence") {
  throw new Error(`Ocean technology spike is missing proof: ${report.decision.reason}`);
}

console.log(`Ocean technology spike written to ${outPath}`);
console.log(`- winner: ${report.winner.label} (${report.winner.score.total})`);
console.log(`- best external package: ${report.bestExternalPackage.label} (${report.bestExternalPackage.score.total})`);
console.log(
  `- package material improvement: ${report.packageComparison.externalPackageMateriallyImproves ? "yes" : "no"}, margin ${report.packageComparison.scoreMarginForCurrentPath}`
);
console.log(`- gates: ${report.gates.allCoreGates.pass ? "passed" : `missing ${report.gates.allCoreGates.metric}`}`);
console.log(`- decision: ${report.decision.recommendation}`);

async function runOceanTechnologySpike(daysToSample, benchmarkEvidence) {
  const output = await capture("npm", ["run", "--silent", "ocean:technology-spike:json"], {
    ...process.env,
    HARBORLINE_OCEAN_TECHNOLOGY_DAYS: String(daysToSample),
    HARBORLINE_OCEAN_BENCHMARK_EVIDENCE_JSON: JSON.stringify(benchmarkEvidence),
  });
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Ocean technology spike did not produce JSON. Output:\n${output}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readBenchmarkEvidence(filePath) {
  try {
    const benchmark = JSON.parse(await readFile(filePath, "utf8"));
    const results = Array.isArray(benchmark.results) ? benchmark.results : [];
    const cases = results.map((result) => ({
      id: String(result.id ?? "unknown"),
      averageFps: Number(result.renderFpsAvg ?? 0),
      minAverageFps: Number(result.minAverageFps ?? 0),
      pixelColors: Number(result.pixelColors ?? 0),
      renderer: String(result.waterRenderer ?? "unknown"),
    }));
    const renderers = [...new Set(cases.map((entry) => entry.renderer))].sort();
    const minAverageFps = cases.length ? Math.min(...cases.map((entry) => entry.averageFps)) : null;
    const minColorBuckets = cases.length ? Math.min(...cases.map((entry) => entry.pixelColors)) : null;
    const passed =
      cases.length >= 4 &&
      cases.every((entry) => entry.averageFps >= entry.minAverageFps && entry.pixelColors >= 10 && entry.renderer !== "unknown") &&
      renderers.includes("shader-mesh-v2") &&
      renderers.includes("low-power-graphics-v2");
    return {
      source: filePath,
      status: passed ? "passed" : "failed",
      cases,
      minAverageFps,
      minColorBuckets,
      renderers,
    };
  } catch {
    return {
      source: filePath,
      status: "missing",
      cases: [],
      minAverageFps: null,
      minColorBuckets: null,
      renderers: [],
    };
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
