import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const benchmarkPath = args.benchmark ?? "reports/ocean-benchmark-latest.json";
const visualPath = args.visual ?? "reports/ocean-visual-calibration-latest.json";
const outPath = args.out ?? "reports/ocean-compatibility-latest.json";

const benchmarkJson = await readFile(benchmarkPath, "utf8");
const visualJson = await readFile(visualPath, "utf8");
const report = await runOceanCompatibility(benchmarkJson, visualJson, benchmarkPath, visualPath);

await writeJson(outPath, report);

if (report.decision.recommendation !== "ocean-compatible-v2") {
  throw new Error(`Ocean compatibility failed: ${report.decision.reason}`);
}

console.log(`Ocean compatibility report written to ${outPath}`);
console.log(`- benchmark ${report.inputs.benchmarkGeneratedAt}, visual ${report.inputs.visualGeneratedAt}`);
console.log(`- desktop FPS ${caseText(report, "default-desktop")} / ${caseText(report, "compact-desktop")}`);
console.log(`- low-power FPS ${caseText(report, "low-power")} / ${caseText(report, "compact-low-power")}`);
console.log(`- fallback ${report.fallback.status}, scale reduction ${report.fallback.desktopScaleReduction}/${report.fallback.compactScaleReduction}`);
console.log(`- decision: ${report.decision.recommendation}`);

async function runOceanCompatibility(benchmarkJson, visualJson, benchmarkSource, visualSource) {
  const output = await capture("npm", ["run", "--silent", "ocean:compatibility:json"], {
    ...process.env,
    HARBORLINE_OCEAN_BENCHMARK_JSON: benchmarkJson,
    HARBORLINE_OCEAN_VISUAL_JSON: visualJson,
    HARBORLINE_OCEAN_BENCHMARK_SOURCE: benchmarkSource,
    HARBORLINE_OCEAN_VISUAL_SOURCE: visualSource,
  });
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Ocean compatibility did not produce JSON. Output:\n${output}\n${error instanceof Error ? error.message : String(error)}`);
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

function caseText(report, id) {
  const entry = report.cases.find((item) => item.id === id);
  return entry ? `${entry.averageFps} FPS (${entry.fpsHeadroom >= 0 ? "+" : ""}${entry.fpsHeadroom})` : "missing";
}
